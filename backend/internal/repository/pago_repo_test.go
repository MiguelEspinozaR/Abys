package repository_test

import (
	"context"
	"os"
	"testing"

	"github.com/joho/godotenv"

	"abys/internal/config"
	"abys/internal/database"
	"abys/internal/model"
	"abys/internal/repository"
)

// TestPagoRepoMontoPorDia verifica la persistencia de montos por día y que
// pagos.monto_enteros se derive como Σ en Crear/Actualizar/AddDia/DeleteDia.
func TestPagoRepoMontoPorDia(t *testing.T) {
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
	pool, err := database.Connect(ctx, cfg)
	if err != nil {
		t.Fatalf("conexión a abys_test: %v", err)
	}
	defer pool.Close()

	repo := repository.NewPagoRepo(pool)

	// Se pasa un total incorrecto a propósito: el repo debe derivar Σ días.
	dias := []model.DiaTrabajadoInput{
		{Fecha: "2098-06-01", MontoEnteros: 1500},
		{Fecha: "2098-06-02", MontoEnteros: 2500},
	}
	id, err := repo.Crear(ctx, nil, 1, "2098-06-02", 999, "efectivo", nil, dias)
	if err != nil {
		t.Fatalf("crear: %v", err)
	}
	defer func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM pagos WHERE id = $1`, id)
	}()

	detalle, err := repo.GetDetallado(ctx, id)
	if err != nil {
		t.Fatalf("detalle: %v", err)
	}
	if detalle.MontoEnteros != 4000 {
		t.Errorf("total derivado = %d, se esperaba 4000", detalle.MontoEnteros)
	}
	if len(detalle.DiasTrabajados) != 2 {
		t.Fatalf("días = %d, se esperaban 2", len(detalle.DiasTrabajados))
	}
	if detalle.DiasTrabajados[0].MontoEnteros != 1500 || detalle.DiasTrabajados[1].MontoEnteros != 2500 {
		t.Errorf("montos por día = %+v", detalle.DiasTrabajados)
	}

	// Listar también trae monto_enteros por día.
	inicio, fin := "2098-06-01", "2098-06-30"
	pagos, _, err := repo.Listar(ctx, repository.FiltroPagos{
		FechaInicio: &inicio, FechaFin: &fin, Page: 1, PageSize: 10,
	})
	if err != nil {
		t.Fatalf("listar: %v", err)
	}
	var encontrado *repository.PagoDetallado
	for i := range pagos {
		if pagos[i].ID == id {
			encontrado = &pagos[i]
			break
		}
	}
	if encontrado == nil {
		t.Fatal("el pago creado no aparece en Listar")
	}
	if len(encontrado.DiasTrabajados) != 2 || encontrado.DiasTrabajados[0].MontoEnteros != 1500 {
		t.Errorf("Listar no devuelve montos por día: %+v", encontrado.DiasTrabajados)
	}

	// AddDia recalcula el total.
	if err := repo.AddDia(ctx, id, "2098-06-03", 500); err != nil {
		t.Fatalf("add día: %v", err)
	}
	detalle, err = repo.GetDetallado(ctx, id)
	if err != nil {
		t.Fatalf("detalle tras add: %v", err)
	}
	if detalle.MontoEnteros != 4500 {
		t.Errorf("total tras add = %d, se esperaba 4500", detalle.MontoEnteros)
	}

	// DeleteDia recalcula el total.
	diaID := detalle.DiasTrabajados[0].ID // 2098-06-01 (1500)
	if err := repo.DeleteDia(ctx, id, diaID); err != nil {
		t.Fatalf("delete día: %v", err)
	}
	detalle, err = repo.GetDetallado(ctx, id)
	if err != nil {
		t.Fatalf("detalle tras delete: %v", err)
	}
	if detalle.MontoEnteros != 3000 {
		t.Errorf("total tras delete = %d, se esperaba 3000", detalle.MontoEnteros)
	}

	// ActualizarConDias reemplaza días y deriva el total.
	nuevos := []model.DiaTrabajadoInput{
		{Fecha: "2098-06-04", MontoEnteros: 1000},
		{Fecha: "2098-06-05", MontoEnteros: 2000},
	}
	if err := repo.ActualizarConDias(ctx, id, 1, "2098-06-05", 0, "efectivo", nil, nuevos, true); err != nil {
		t.Fatalf("actualizar: %v", err)
	}
	detalle, err = repo.GetDetallado(ctx, id)
	if err != nil {
		t.Fatalf("detalle tras update: %v", err)
	}
	if detalle.MontoEnteros != 3000 || len(detalle.DiasTrabajados) != 2 ||
		detalle.DiasTrabajados[1].MontoEnteros != 2000 {
		t.Errorf("estado tras update inesperado: total=%d días=%+v",
			detalle.MontoEnteros, detalle.DiasTrabajados)
	}
}
