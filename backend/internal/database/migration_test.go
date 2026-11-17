package database_test

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"

	"abys/internal/config"
)

// TestMigration000006Backfill aplica la migración 000006 sobre un esquema
// aislado con fixtures y verifica Σ días = pago, el día sintético y el CHECK.
func TestMigration000006Backfill(t *testing.T) {
	if os.Getenv("ABYS_SKIP_INTEGRATION") == "1" {
		t.Skip("integración desactivada")
	}
	_ = godotenv.Load("../../.env")
	if os.Getenv("DB_PASSWORD") == "" {
		t.Skip("DB_PASSWORD no disponible en el entorno")
	}
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config: %v", err)
	}
	cfg.DBName = "abys_test"

	ctx := context.Background()
	connCfg, err := pgx.ParseConfig(cfg.DatabaseURL())
	if err != nil {
		t.Fatalf("parse config: %v", err)
	}
	connCfg.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	conn, err := pgx.ConnectConfig(ctx, connCfg)
	if err != nil {
		t.Fatalf("conexión a abys_test: %v", err)
	}
	defer conn.Close(ctx)

	schema := fmt.Sprintf("migtest_%d", time.Now().UnixNano())
	if _, err := conn.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatalf("crear schema: %v", err)
	}
	defer func() {
		_, _ = conn.Exec(context.Background(), "DROP SCHEMA "+schema+" CASCADE")
	}()
	if _, err := conn.Exec(ctx, "SET search_path TO "+schema); err != nil {
		t.Fatalf("search_path: %v", err)
	}

	// Fixture mínimo con las columnas que usa la migración.
	if _, err := conn.Exec(ctx, `
		CREATE TABLE pagos (
			id BIGSERIAL PRIMARY KEY,
			fecha_pago DATE NOT NULL,
			monto_enteros BIGINT NOT NULL CHECK (monto_enteros >= 0),
			deleted_at TIMESTAMPTZ
		);
		CREATE TABLE dias_trabajados (
			id BIGSERIAL PRIMARY KEY,
			pago_id BIGINT NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
			fecha DATE NOT NULL,
			UNIQUE (pago_id, fecha)
		);`); err != nil {
		t.Fatalf("crear tablas: %v", err)
	}

	// (a) pago con 3 días y total no divisible; (b) pago sin días;
	// (c) pago soft-deleted; (d) pago con total 0.
	if _, err := conn.Exec(ctx, `
		INSERT INTO pagos (id, fecha_pago, monto_enteros) VALUES
			(1, '2099-01-10', 100),
			(2, '2099-01-11', 7),
			(3, '2099-01-12', 5),
			(4, '2099-01-13', 0);
		UPDATE pagos SET deleted_at = NOW() WHERE id = 3;
		INSERT INTO dias_trabajados (pago_id, fecha) VALUES
			(1, '2099-01-10'),
			(1, '2099-01-09'),
			(1, '2099-01-08'),
			(3, '2099-01-12'),
			(3, '2099-01-11'),
			(4, '2099-01-13');`); err != nil {
		t.Fatalf("fixture: %v", err)
	}

	up := leerMigracion(t, "000006_add_monto_dias_trabajados.up.sql")
	if _, err := conn.Exec(ctx, up); err != nil {
		t.Fatalf("ejecutar up: %v", err)
	}

	rows, err := conn.Query(ctx, `
		SELECT p.id, p.monto_enteros, COALESCE(SUM(d.monto_enteros), 0), count(d.id)
		FROM pagos p
		LEFT JOIN dias_trabajados d ON d.pago_id = p.id
		GROUP BY p.id, p.monto_enteros ORDER BY p.id`)
	if err != nil {
		t.Fatalf("verificar sumas: %v", err)
	}
	defer rows.Close()
	totales := map[int64]int64{}
	for rows.Next() {
		var id, total, suma, dias int64
		if err := rows.Scan(&id, &total, &suma, &dias); err != nil {
			t.Fatalf("scan: %v", err)
		}
		if dias == 0 {
			t.Errorf("pago %d quedó sin días", id)
		}
		if suma != total {
			t.Errorf("pago %d: Σ días = %d, total = %d", id, suma, total)
		}
		totales[id] = suma
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows: %v", err)
	}
	if len(totales) != 4 {
		t.Fatalf("se esperaban 4 pagos, hay %d", len(totales))
	}

	// Reparto exacto: 100 = 33 + 33 + 34 (sobrante al último por fecha).
	var m1, m2, m3 int64
	if err := conn.QueryRow(ctx, `
		SELECT monto_enteros FROM dias_trabajados
		WHERE pago_id = 1 ORDER BY fecha LIMIT 1`).Scan(&m1); err != nil {
		t.Fatalf("día 1: %v", err)
	}
	if err := conn.QueryRow(ctx, `
		SELECT monto_enteros FROM dias_trabajados
		WHERE pago_id = 1 ORDER BY fecha OFFSET 1 LIMIT 1`).Scan(&m2); err != nil {
		t.Fatalf("día 2: %v", err)
	}
	if err := conn.QueryRow(ctx, `
		SELECT monto_enteros FROM dias_trabajados
		WHERE pago_id = 1 ORDER BY fecha DESC LIMIT 1`).Scan(&m3); err != nil {
		t.Fatalf("día 3: %v", err)
	}
	if m1 != 33 || m2 != 33 || m3 != 34 {
		t.Errorf("reparto esperado 33/33/34, obtenido %d/%d/%d", m1, m2, m3)
	}

	// Pago sin días: día sintético en fecha_pago con el monto completo.
	var fecha string
	var monto int64
	if err := conn.QueryRow(ctx, `
		SELECT d.fecha::text, d.monto_enteros
		FROM dias_trabajados d WHERE d.pago_id = 2`).Scan(&fecha, &monto); err != nil {
		t.Fatalf("día sintético: %v", err)
	}
	if fecha != "2099-01-11" || monto != 7 {
		t.Errorf("día sintético esperado 2099-01-11/7, obtenido %s/%d", fecha, monto)
	}

	// El CHECK rechaza montos negativos.
	if _, err := conn.Exec(ctx, `
		INSERT INTO dias_trabajados (pago_id, fecha, monto_enteros)
		VALUES (1, '2099-02-01', -1)`); err == nil {
		t.Error("el CHECK debe rechazar monto_enteros negativo")
	}

	// Down: la columna desaparece.
	down := leerMigracion(t, "000006_add_monto_dias_trabajados.down.sql")
	if _, err := conn.Exec(ctx, down); err != nil {
		t.Fatalf("ejecutar down: %v", err)
	}
	var columnas int
	if err := conn.QueryRow(ctx, `
		SELECT count(*) FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = 'dias_trabajados'
		  AND column_name = 'monto_enteros'`, schema).Scan(&columnas); err != nil {
		t.Fatalf("verificar down: %v", err)
	}
	if columnas != 0 {
		t.Errorf("la columna monto_enteros debe desaparecer tras down")
	}
}

func leerMigracion(t *testing.T, nombre string) string {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("..", "..", "migrations", nombre))
	if err != nil {
		t.Fatalf("leer migración %s: %v", nombre, err)
	}
	return string(b)
}
