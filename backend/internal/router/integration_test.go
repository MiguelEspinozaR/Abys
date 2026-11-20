package router_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"abys/internal/config"
	"abys/internal/database"
	"abys/internal/router"
)

// TestIntegrationAPI ejecuta flujos de la API contra abys_test.
// Requiere DB_PASSWORD en entorno (la lee config.Load desde .env).
// No borra datos migrados: limpia solo las filas creadas por el test.
func TestIntegrationAPI(t *testing.T) {
	gin.SetMode(gin.TestMode)

	if os.Getenv("ABYS_SKIP_INTEGRATION") == "1" {
		t.Skip("integración desactivada")
	}
	// Durante `go test` el CWD es el paquete; cargamos .env de la raíz backend.
	_ = godotenv.Load("../../.env")
	if os.Getenv("DB_PASSWORD") == "" {
		t.Skip("DB_PASSWORD no disponible en el entorno")
	}
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config: %v", err)
	}
	cfg.DBName = "abys_test"
	cfg.CORSOrigins = []string{"http://localhost:5173"}

	pool, err := database.Connect(context.Background(), cfg)
	if err != nil {
		t.Fatalf("conexión a abys_test: %v (¿migrada?)", err)
	}
	defer pool.Close()

	r := router.Setup(cfg, pool)

	// ---- POST /pagos con días-object y total derivado ----
	body := `{"fuente_id":1,"fecha_pago":"2026-06-15","monto_enteros":63300,
		"metodo_pago":"qr","notas":"test integración",
		"dias_trabajados":[
			{"fecha":"2026-06-15","monto_enteros":31650},
			{"fecha":"2026-06-16","monto_enteros":31650}]}`
	rec := doReq(t, r, http.MethodPost, "/api/v1/pagos", body, "")
	if rec.Code != 201 {
		t.Fatalf("POST /pagos -> %d: %s", rec.Code, rec.Body.String())
	}
	var creado struct {
		Data struct {
			ID             int64 `json:"id"`
			MontoEnteros   int64 `json:"monto_enteros"`
			DiasTrabajados []struct {
				Fecha        string `json:"fecha"`
				MontoEnteros int64  `json:"monto_enteros"`
			} `json:"dias_trabajados"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &creado); err != nil {
		t.Fatalf("json: %v", err)
	}
	pagoID := creado.Data.ID
	if pagoID <= 0 {
		t.Fatalf("id de pago inválido: %d", pagoID)
	}
	defer cleanup(t, pool, pagoID)
	if creado.Data.MontoEnteros != 63300 {
		t.Errorf("total derivado = %d, se esperaba 63300", creado.Data.MontoEnteros)
	}
	if len(creado.Data.DiasTrabajados) != 2 ||
		creado.Data.DiasTrabajados[0].MontoEnteros != 31650 ||
		creado.Data.DiasTrabajados[1].MontoEnteros != 31650 {
		t.Errorf("días persistidos inesperados: %+v", creado.Data.DiasTrabajados)
	}

	// ---- total desincronizado → 422 TOTAL_DESINCRONIZADO ----
	rec = doReq(t, r, http.MethodPost, "/api/v1/pagos", `{
		"fuente_id":1,"fecha_pago":"2026-07-01","monto_enteros":1000,
		"metodo_pago":"efectivo",
		"dias_trabajados":[{"fecha":"2026-07-01","monto_enteros":900}]}`, "")
	if rec.Code != http.StatusUnprocessableEntity || !hasCode(t, rec, "TOTAL_DESINCRONIZADO") {
		t.Errorf("total desincronizado debe dar 422 TOTAL_DESINCRONIZADO, dio %d: %s",
			rec.Code, rec.Body.String())
	}

	// ---- total ausente: se deriva de Σ días ----
	rec = doReq(t, r, http.MethodPost, "/api/v1/pagos", `{
		"fuente_id":1,"fecha_pago":"2026-07-02","metodo_pago":"efectivo",
		"dias_trabajados":[
			{"fecha":"2026-07-02","monto_enteros":1000},
			{"fecha":"2026-07-03","monto_enteros":2500}]}`, "")
	if rec.Code != 201 {
		t.Fatalf("POST /pagos sin total -> %d: %s", rec.Code, rec.Body.String())
	}
	var derivado struct {
		Data struct {
			ID           int64 `json:"id"`
			MontoEnteros int64 `json:"monto_enteros"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &derivado); err != nil {
		t.Fatalf("json: %v", err)
	}
	if derivado.Data.MontoEnteros != 3500 {
		t.Errorf("total derivado = %d, se esperaba 3500", derivado.Data.MontoEnteros)
	}
	defer cleanup(t, pool, derivado.Data.ID)

	// ---- monto de día negativo → 400 ----
	rec = doReq(t, r, http.MethodPost, "/api/v1/pagos", `{
		"fuente_id":1,"fecha_pago":"2026-07-04","metodo_pago":"efectivo",
		"dias_trabajados":[{"fecha":"2026-07-04","monto_enteros":-1}]}`, "")
	if rec.Code != 400 {
		t.Errorf("monto de día negativo debe dar 400, dio %d: %s", rec.Code, rec.Body.String())
	}

	// ---- GET /pagos/1 (migrado) ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/pagos/1", "", "")
	if rec.Code != 200 {
		t.Fatalf("GET /pagos/1 -> %d", rec.Code)
	}

	// ---- POST /splits (enteros) en pago creado ----
	body = `{"pago_id":` + strconv.FormatInt(pagoID, 10) + `,"modo_calculo":"enteros"}`
	rec = doReq(t, r, http.MethodPost, "/api/v1/splits", body, "")
	if rec.Code != 201 {
		t.Fatalf("POST /splits -> %d: %s", rec.Code, rec.Body.String())
	}
	var split struct {
		Data struct {
			ID            int64 `json:"id"`
			Transacciones []struct {
				Alias     string `json:"alias_snapshot"`
				Monto     int64  `json:"monto_enteros"`
				Realizado bool   `json:"realizado"`
			} `json:"transacciones"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &split); err != nil {
		t.Fatalf("json split: %v", err)
	}
	splitID := split.Data.ID
	// Σ transacciones == monto del pago (BR-081).
	var suma int64
	generalMonto := int64(-1)
	for _, tx := range split.Data.Transacciones {
		suma += tx.Monto
		if tx.Alias == "General" {
			generalMonto = tx.Monto
		}
	}
	if suma != 63300 {
		t.Errorf("Σ transacciones = %d, debe ser 63300", suma)
	}
	if generalMonto < 0 {
		t.Error("debe existir la transacción General")
	}

	// ---- PUT con total del cliente desincronizado → 422 ----
	putURL := "/api/v1/pagos/" + strconv.FormatInt(pagoID, 10)
	rec = doReq(t, r, http.MethodPut, putURL, `{
		"fuente_id":1,"fecha_pago":"2026-06-15","monto_enteros":1,"metodo_pago":"qr",
		"dias_trabajados":[
			{"fecha":"2026-06-15","monto_enteros":31650},
			{"fecha":"2026-06-16","monto_enteros":31650}]}`, "")
	if rec.Code != http.StatusUnprocessableEntity || !hasCode(t, rec, "TOTAL_DESINCRONIZADO") {
		t.Errorf("PUT desincronizado debe dar 422 TOTAL_DESINCRONIZADO, dio %d: %s",
			rec.Code, rec.Body.String())
	}

	// ---- PUT cambia Σ días de un pago con split → 422 IMMUTABLE_DATA (BR-081) ----
	rec = doReq(t, r, http.MethodPut, putURL, `{
		"fuente_id":1,"fecha_pago":"2026-06-15","metodo_pago":"qr",
		"dias_trabajados":[
			{"fecha":"2026-06-15","monto_enteros":31650},
			{"fecha":"2026-06-16","monto_enteros":32650}]}`, "")
	if rec.Code != http.StatusUnprocessableEntity || !hasCode(t, rec, "IMMUTABLE_DATA") {
		t.Errorf("cambiar Σ días con split debe dar 422 IMMUTABLE_DATA, dio %d: %s",
			rec.Code, rec.Body.String())
	}

	// ---- split duplicado → 409 ----
	rec = doReq(t, r, http.MethodPost, "/api/v1/splits", body, "")
	if rec.Code != 409 {
		t.Errorf("split duplicado debe dar 409, dio %d", rec.Code)
	}
	if !hasCode(t, rec, "BUSINESS_RULE_CONFLICT") {
		t.Errorf("código esperado BUSINESS_RULE_CONFLICT: %s", rec.Body.String())
	}

	// ---- marcar realizada una transacción ----
	idRealizar := txidDe(t, r, splitID, "Business")
	if idRealizar == 0 {
		t.Fatal("no se encontró transacción Business")
	}
	rec = doReq(t, r, http.MethodPut, "/api/v1/transacciones/"+strconv.FormatInt(idRealizar, 10)+"/realizar", "", "")
	if rec.Code != 200 {
		t.Fatalf("PUT /transacciones/%d/realizar -> %d", idRealizar, rec.Code)
	}

	// ---- DELETE pago con realizadas → 409 ----
	rec = doReq(t, r, http.MethodDelete, "/api/v1/pagos/"+strconv.FormatInt(pagoID, 10), "", "")
	if rec.Code != 409 {
		t.Errorf("delete pago con realizadas debe dar 409, dio %d", rec.Code)
	}

	// ---- recalcular split (BR-061) ----
	rec = doReq(t, r, http.MethodPut, "/api/v1/splits/"+strconv.FormatInt(splitID, 10), "", "")
	if rec.Code != 200 {
		t.Errorf("PUT /splits/%d -> %d: %s", splitID, rec.Code, rec.Body.String())
	}

	// ---- DELETE split con realizadas → 409 ----
	rec = doReq(t, r, http.MethodDelete, "/api/v1/splits/"+strconv.FormatInt(splitID, 10), "", "")
	if rec.Code != 409 {
		t.Errorf("delete split con realizadas debe dar 409, dio %d", rec.Code)
	}

	// ---- error 400 con body inválido ----
	rec = doReq(t, r, http.MethodPost, "/api/v1/pagos", `{"fuente_id":999999}`, "")
	if rec.Code != 400 {
		t.Errorf("body inválido debe dar 400, dio %d", rec.Code)
	}
	if !hasCode(t, rec, "VALIDATION_ERROR") {
		t.Errorf("debe responder VALIDATION_ERROR: %s", rec.Body.String())
	}

	// ---- 404 JSON consistente ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/no-existe", "", "")
	if rec.Code != 404 || !hasCode(t, rec, "NOT_FOUND") {
		t.Errorf("ruta inexistente debe dar 404 NOT_FOUND, dio %d: %s", rec.Code, rec.Body.String())
	}

	// ---- health/db ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/health/db", "", "")
	if rec.Code != 200 {
		t.Errorf("health/db -> %d: %s", rec.Code, rec.Body.String())
	}
	var health struct {
		Status string `json:"status"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &health)
	if health.Status != "ok" {
		t.Errorf("health debe estar ok: %s", rec.Body.String())
	}

	// ---- CORS: origen permitido ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/health", "", "http://localhost:5173")
	if rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Errorf("CORS debe reflejar el origen permitido: %q", rec.Header().Get("Access-Control-Allow-Origin"))
	}

	// ---- integridad: la migración no se modificó (188 pagos con id <= 202) ----
	pagos := countPagos(t, pool)
	if pagos != 188 {
		t.Errorf("debe mantener 188 pagos migrados, hay %d", pagos)
	}
}

// txidDe encuentra el id de la transacción por alias dentro de un split.
func txidDe(t *testing.T, r http.Handler, splitID int64, alias string) int64 {
	t.Helper()
	rec := doReq(t, r, http.MethodGet, "/api/v1/splits/"+strconv.FormatInt(splitID, 10), "", "")
	var s struct {
		Data struct {
			Transacciones []struct {
				ID    int64  `json:"id"`
				Alias string `json:"alias_snapshot"`
			} `json:"transacciones"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &s); err != nil {
		t.Fatalf("json tx: %v", err)
	}
	for _, tx := range s.Data.Transacciones {
		if tx.Alias == alias {
			return tx.ID
		}
	}
	return 0
}

// cleanup borra SOLO las filas creadas por el test (no la migración).
func cleanup(t *testing.T, pool *pgxpool.Pool, pagoID int64) {
	t.Helper()
	ctx := context.Background()
	rows, err := pool.Query(ctx, `SELECT id FROM splits WHERE pago_id = $1`, pagoID)
	if err != nil {
		return
	}
	var splitIDs []int64
	for rows.Next() {
		var id int64
		_ = rows.Scan(&id)
		splitIDs = append(splitIDs, id)
	}
	rows.Close()
	for _, sid := range splitIDs {
		_, _ = pool.Exec(ctx, `DELETE FROM transacciones WHERE split_id = $1`, sid)
		_, _ = pool.Exec(ctx, `DELETE FROM splits WHERE id = $1`, sid)
	}
	_, _ = pool.Exec(ctx, `DELETE FROM dias_trabajados WHERE pago_id = $1`, pagoID)
	_, _ = pool.Exec(ctx, `DELETE FROM pagos WHERE id = $1`, pagoID)
}

func countPagos(t *testing.T, pool *pgxpool.Pool) int64 {
	t.Helper()
	var n int64
	if err := pool.QueryRow(context.Background(),
		`SELECT count(*) FROM pagos WHERE id <= 202`).Scan(&n); err != nil {
		t.Fatalf("conteo: %v", err)
	}
	return n
}

// TestDashboardContracts verifica la forma exacta de los 7 endpoints del
// dashboard y que las fuentes soft-deleted se incluyan (D15/R11.3).
func TestDashboardContracts(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg, pool := testConfigYPostgres(t)
	r := router.Setup(cfg, pool)
	ctx := context.Background()

	var fuenteID, pagoID, pagoEliminadoID int64
	defer func() {
		for _, id := range []int64{pagoID, pagoEliminadoID} {
			if id > 0 {
				_, _ = pool.Exec(context.Background(), `DELETE FROM pagos WHERE id = $1`, id)
			}
		}
		if fuenteID > 0 {
			_, _ = pool.Exec(context.Background(), `DELETE FROM fuentes WHERE id = $1`, fuenteID)
		}
	}()
	if err := pool.QueryRow(ctx, `
		INSERT INTO fuentes (alias, color, deleted_at) VALUES ('Histórica', '#123456', NOW())
		RETURNING id`).Scan(&fuenteID); err != nil {
		t.Fatalf("insertar fuente: %v", err)
	}
	if err := pool.QueryRow(ctx, `
		INSERT INTO pagos (fuente_id, fecha_pago, monto_enteros, metodo_pago)
		VALUES ($1, '2099-01-06', 300, 'efectivo') RETURNING id`, fuenteID).Scan(&pagoID); err != nil {
		t.Fatalf("insertar pago: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dias_trabajados (pago_id, fecha, monto_enteros) VALUES
			($1, '2099-01-05', 200),
			($1, '2099-01-06', 100)`, pagoID); err != nil {
		t.Fatalf("insertar días: %v", err)
	}

	// Pago soft-deleted: no debe aparecer en ninguna agregación.
	if err := pool.QueryRow(ctx, `
		INSERT INTO pagos (fuente_id, fecha_pago, monto_enteros, metodo_pago, deleted_at)
		VALUES ($1, '2099-01-07', 500, 'efectivo', NOW()) RETURNING id`, fuenteID).Scan(&pagoEliminadoID); err != nil {
		t.Fatalf("insertar pago soft-deleted: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO dias_trabajados (pago_id, fecha, monto_enteros)
		VALUES ($1, '2099-01-07', 500)`, pagoEliminadoID); err != nil {
		t.Fatalf("insertar día soft-deleted: %v", err)
	}

	// ---- summary ----
	rec := doReq(t, r, http.MethodGet, "/api/v1/dashboard/summary", "", "")
	if rec.Code != 200 {
		t.Fatalf("GET summary -> %d: %s", rec.Code, rec.Body.String())
	}
	var summary struct {
		Data struct {
			Total30d       int64 `json:"total_30d_centavos"`
			TotalHistorico int64 `json:"total_historico_centavos"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &summary); err != nil {
		t.Fatalf("json summary: %v", err)
	}
	if summary.Data.TotalHistorico < 300 {
		t.Errorf("total histórico = %d, debe incluir los 300 del fixture", summary.Data.TotalHistorico)
	}
	if summary.Data.TotalHistorico-summary.Data.Total30d < 300 {
		t.Errorf("los días de 2099 deben quedar fuera de los últimos 30 días")
	}

	// ---- weekly ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/dashboard/weekly?fecha=2099-01-06", "", "")
	if rec.Code != 200 {
		t.Fatalf("GET weekly -> %d: %s", rec.Code, rec.Body.String())
	}
	type fuenteJSON struct {
		FuenteID      int64  `json:"fuente_id"`
		Alias         string `json:"alias"`
		Color         string `json:"color"`
		TotalCentavos int64  `json:"total_centavos"`
	}
	var weekly struct {
		Data struct {
			SemanaInicio string `json:"semana_inicio"`
			SemanaFin    string `json:"semana_fin"`
			Dias         []struct {
				Fecha         string       `json:"fecha"`
				TotalCentavos int64        `json:"total_centavos"`
				PorFuente     []fuenteJSON `json:"por_fuente"`
			} `json:"dias"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &weekly); err != nil {
		t.Fatalf("json weekly: %v", err)
	}
	if weekly.Data.SemanaInicio != "2099-01-05" || weekly.Data.SemanaFin != "2099-01-11" {
		t.Errorf("semana = %s..%s", weekly.Data.SemanaInicio, weekly.Data.SemanaFin)
	}
	if len(weekly.Data.Dias) != 7 {
		t.Fatalf("días = %d, se esperaban 7", len(weekly.Data.Dias))
	}
	dias := map[string]struct {
		Total     int64
		PorFuente []fuenteJSON
	}{}
	for _, d := range weekly.Data.Dias {
		dias[d.Fecha] = struct {
			Total     int64
			PorFuente []fuenteJSON
		}{d.TotalCentavos, d.PorFuente}
	}
	if d := dias["2099-01-05"]; d.Total != 200 || len(d.PorFuente) != 1 ||
		d.PorFuente[0].FuenteID != fuenteID || d.PorFuente[0].Alias != "Histórica" ||
		d.PorFuente[0].Color != "#123456" {
		t.Errorf("weekly 2099-01-05 inesperado: %+v", d)
	}
	if d := dias["2099-01-06"]; d.Total != 100 || len(d.PorFuente) != 1 {
		t.Errorf("weekly 2099-01-06 inesperado: %+v", d)
	}

	// ---- monthly ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/dashboard/monthly?mes=1&anio=2099", "", "")
	if rec.Code != 200 {
		t.Fatalf("GET monthly -> %d: %s", rec.Code, rec.Body.String())
	}
	var monthly struct {
		Data struct {
			Mes     int `json:"mes"`
			Anio    int `json:"anio"`
			Bloques []struct {
				Bloque        int    `json:"bloque"`
				Inicio        string `json:"inicio"`
				Fin           string `json:"fin"`
				TotalCentavos int64  `json:"total_centavos"`
			} `json:"bloques"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &monthly); err != nil {
		t.Fatalf("json monthly: %v", err)
	}
	if monthly.Data.Mes != 1 || monthly.Data.Anio != 2099 || len(monthly.Data.Bloques) != 5 {
		t.Fatalf("monthly inesperado: %+v", monthly.Data)
	}
	if b := monthly.Data.Bloques[0]; b.Bloque != 1 || b.Inicio != "2099-01-01" ||
		b.Fin != "2099-01-07" || b.TotalCentavos != 300 {
		t.Errorf("bloque 1 inesperado: %+v", b)
	}

	// ---- yearly ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/dashboard/yearly?anio=2099", "", "")
	if rec.Code != 200 {
		t.Fatalf("GET yearly -> %d: %s", rec.Code, rec.Body.String())
	}
	var yearly struct {
		Data struct {
			Anio  int `json:"anio"`
			Meses []struct {
				Mes           int   `json:"mes"`
				TotalCentavos int64 `json:"total_centavos"`
			} `json:"meses"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &yearly); err != nil {
		t.Fatalf("json yearly: %v", err)
	}
	if yearly.Data.Anio != 2099 || len(yearly.Data.Meses) != 12 {
		t.Fatalf("yearly inesperado: %+v", yearly.Data)
	}
	for _, m := range yearly.Data.Meses {
		esperado := int64(0)
		if m.Mes == 1 {
			esperado = 300
		}
		if m.TotalCentavos != esperado {
			t.Errorf("mes %d = %d, se esperaba %d", m.Mes, m.TotalCentavos, esperado)
		}
	}

	// ---- history (sin tendencia) ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/dashboard/history", "", "")
	if rec.Code != 200 {
		t.Fatalf("GET history -> %d: %s", rec.Code, rec.Body.String())
	}
	if strings.Contains(string(rec.Body.Bytes()), "tendencia") {
		t.Error("history no debe incluir tendencia")
	}
	var history struct {
		Data struct {
			PorMes []struct {
				Anio          int   `json:"anio"`
				Mes           int   `json:"mes"`
				TotalCentavos int64 `json:"total_centavos"`
			} `json:"por_mes"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &history); err != nil {
		t.Fatalf("json history: %v", err)
	}
	var encontrado bool
	for _, p := range history.Data.PorMes {
		if p.Anio == 2099 && p.Mes == 1 && p.TotalCentavos == 300 {
			encontrado = true
		}
	}
	if !encontrado {
		t.Errorf("history no incluye 2099-01 con 300: %+v", history.Data.PorMes)
	}

	// ---- distribution monthly / yearly (fuente soft-deleted incluida) ----
	for _, path := range []string{
		"/api/v1/dashboard/distribution/monthly?mes=1&anio=2099",
		"/api/v1/dashboard/distribution/yearly?anio=2099",
	} {
		rec = doReq(t, r, http.MethodGet, path, "", "")
		if rec.Code != 200 {
			t.Fatalf("GET %s -> %d: %s", path, rec.Code, rec.Body.String())
		}
		var dist struct {
			Data struct {
				TotalCentavos int64        `json:"total_centavos"`
				PorFuente     []fuenteJSON `json:"por_fuente"`
			} `json:"data"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &dist); err != nil {
			t.Fatalf("json %s: %v", path, err)
		}
		if dist.Data.TotalCentavos != 300 || len(dist.Data.PorFuente) != 1 {
			t.Errorf("%s inesperado: %+v", path, dist.Data)
			continue
		}
		f := dist.Data.PorFuente[0]
		if f.FuenteID != fuenteID || f.Alias != "Histórica" || f.Color != "#123456" ||
			f.TotalCentavos != 300 {
			t.Errorf("%s no incluye la fuente soft-deleted: %+v", path, f)
		}
	}

	// ---- distribución vacía: por_fuente = [] ----
	rec = doReq(t, r, http.MethodGet, "/api/v1/dashboard/distribution/monthly?mes=2&anio=2099", "", "")
	if rec.Code != 200 {
		t.Fatalf("GET distribución vacía -> %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(string(rec.Body.Bytes()), `"por_fuente":[]`) {
		t.Errorf("distribución vacía debe serializar por_fuente=[]: %s", rec.Body.String())
	}
}

// TestSplitPendienteExcluyeGeneralHTTP verifica R7.5 sobre HTTP real:
// solo General pendiente -> total 0; General + otra cuenta -> total = solo la otra;
// la transacción de General sigue presente con realizado=false (sin reescritura).
func TestSplitPendienteExcluyeGeneralHTTP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	if os.Getenv("ABYS_SKIP_INTEGRATION") == "1" {
		t.Skip("integración desactivada")
	}
	cfg, pool := testConfigYPostgres(t)
	r := router.Setup(cfg, pool)
	ctx := context.Background()

	var generalID int64
	if err := pool.QueryRow(ctx, `SELECT id FROM cuentas WHERE es_general AND deleted_at IS NULL ORDER BY id LIMIT 1`).Scan(&generalID); err != nil {
		t.Fatalf("cuenta General no encontrada: %v", err)
	}
	var otraID int64
	if err := pool.QueryRow(ctx, `SELECT id FROM cuentas WHERE NOT es_general AND deleted_at IS NULL ORDER BY id LIMIT 1`).Scan(&otraID); err != nil {
		t.Fatalf("cuenta no-general no encontrada: %v", err)
	}
	otraAlias := "Otra"
	_ = pool.QueryRow(ctx, `SELECT alias FROM cuentas WHERE id = $1`, otraID).Scan(&otraAlias)

	crearPago := func(fecha string, monto int64) int64 {
		t.Helper()
		var id int64
		err := pool.QueryRow(ctx, `
			INSERT INTO pagos (fuente_id, fecha_pago, monto_enteros, metodo_pago)
			VALUES (1, $1, $2, 'efectivo') RETURNING id`, fecha, monto).Scan(&id)
		if err != nil {
			t.Fatalf("insert pago: %v", err)
		}
		_, err = pool.Exec(ctx, `
			INSERT INTO dias_trabajados (pago_id, fecha, monto_enteros) VALUES ($1, $2, $3)`, id, fecha, monto)
		if err != nil {
			t.Fatalf("insert día: %v", err)
		}
		return id
	}

	type tx struct {
		cuentaID *int64
		monto    int64
		alias    string
	}
	crearSplit := func(pagoID int64, txs []tx) int64 {
		t.Helper()
		var splitID int64
		if err := pool.QueryRow(ctx, `INSERT INTO splits (pago_id, modo_calculo) VALUES ($1, 'preciso') RETURNING id`, pagoID).Scan(&splitID); err != nil {
			t.Fatalf("insert split: %v", err)
		}
		for _, it := range txs {
			if _, err := pool.Exec(ctx, `
				INSERT INTO transacciones (split_id, cuenta_id, monto_enteros, tasa_bps, alias_snapshot, realizado)
				VALUES ($1, $2, $3, 0, $4, false)`, splitID, it.cuentaID, it.monto, it.alias); err != nil {
				t.Fatalf("insert tx: %v", err)
			}
		}
		return splitID
	}

	assertSplit := func(splitID int64, pendienteEsperado, generalMonto int64, generalPresente bool) {
		t.Helper()
		rec := doReq(t, r, http.MethodGet, "/api/v1/splits/"+strconv.FormatInt(splitID, 10), "", "")
		if rec.Code != 200 {
			t.Fatalf("GET /splits/%d -> %d: %s", splitID, rec.Code, rec.Body.String())
		}
		var resp struct {
			Data struct {
				TotalPendiente int64 `json:"total_pendiente"`
				TotalRealizado int64 `json:"total_realizado"`
				Transacciones  []struct {
					CuentaID  *int64 `json:"cuenta_id"`
					Monto     int64  `json:"monto_enteros"`
					Realizado bool   `json:"realizado"`
				} `json:"transacciones"`
			} `json:"data"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("json: %v", err)
		}
		if resp.Data.TotalPendiente != pendienteEsperado {
			t.Errorf("total_pendiente = %d, se esperaba %d: %s", resp.Data.TotalPendiente, pendienteEsperado, rec.Body.String())
		}
		if resp.Data.TotalRealizado != 0 {
			t.Errorf("total_realizado = %d, se esperaba 0", resp.Data.TotalRealizado)
		}
		if generalPresente {
			found := false
			for _, tx := range resp.Data.Transacciones {
				if tx.CuentaID != nil && *tx.CuentaID == generalID {
					found = true
					if tx.Realizado {
						t.Errorf("transacción de General no debe reescribirse a realizada")
					}
					if tx.Monto != generalMonto {
						t.Errorf("monto General = %d, se esperaba %d", tx.Monto, generalMonto)
					}
				}
			}
			if !found {
				t.Errorf("la transacción de General debe seguir visible: %s", rec.Body.String())
			}
		}
	}

	// Escenario 1: solo General pendiente -> total 0, fila visible.
	pago1 := crearPago("2097-11-01", 1000)
	defer cleanup(t, pool, pago1)
	split1 := crearSplit(pago1, []tx{{cuentaID: &generalID, monto: 1000, alias: "General"}})
	assertSplit(split1, 0, 1000, true)

	// Escenario 2: General + otra cuenta -> total = solo la otra, fila General visible.
	pago2 := crearPago("2097-11-02", 3500)
	defer cleanup(t, pool, pago2)
	split2 := crearSplit(pago2, []tx{
		{cuentaID: &generalID, monto: 1000, alias: "General"},
		{cuentaID: &otraID, monto: 2500, alias: otraAlias},
	})
	assertSplit(split2, 2500, 1000, true)

	// Escenario 3 (regresión): General pendiente no cambia realizado y sigue en transacciones.
	pago3 := crearPago("2097-11-03", 500)
	defer cleanup(t, pool, pago3)
	split3 := crearSplit(pago3, []tx{{cuentaID: &generalID, monto: 500, alias: "General"}})
	rec := doReq(t, r, http.MethodGet, "/api/v1/splits/"+strconv.FormatInt(split3, 10), "", "")
	if rec.Code != 200 {
		t.Fatalf("GET /splits/%d -> %d: %s", split3, rec.Code, rec.Body.String())
	}
	var resp struct {
		Data struct {
			Transacciones []struct {
				CuentaID  *int64 `json:"cuenta_id"`
				Realizado bool   `json:"realizado"`
			} `json:"transacciones"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json: %v", err)
	}
	found := false
	for _, tx := range resp.Data.Transacciones {
		if tx.CuentaID != nil && *tx.CuentaID == generalID {
			found = true
			if tx.Realizado {
				t.Errorf("la transacción de General no debe reescribirse")
			}
		}
	}
	if !found {
		t.Errorf("fila de General no visible en escenario 3: %s", rec.Body.String())
	}
}

func testConfigYPostgres(t *testing.T) (*config.Config, *pgxpool.Pool) {
	t.Helper()
	_ = godotenv.Load("../../.env")
	if os.Getenv("DB_PASSWORD") == "" {
		t.Skip("DB_PASSWORD no disponible en el entorno")
	}
	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("config: %v", err)
	}
	cfg.DBName = "abys_test"
	cfg.CORSOrigins = []string{"http://localhost:5173"}
	pool, err := database.Connect(context.Background(), cfg)
	if err != nil {
		t.Fatalf("conexión a abys_test: %v", err)
	}
	t.Cleanup(pool.Close)
	return cfg, pool
}

func doReq(t *testing.T, r http.Handler, method, path, body, origin string) *httptest.ResponseRecorder {
	t.Helper()
	var b *bytes.Reader
	if body == "" {
		b = bytes.NewReader(nil)
	} else {
		b = bytes.NewReader([]byte(body))
	}
	req := httptest.NewRequest(method, path, b)
	req.Header.Set("Content-Type", "application/json")
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func hasCode(t *testing.T, rec *httptest.ResponseRecorder, code string) bool {
	t.Helper()
	var b struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
		return false
	}
	return b.Error.Code == code
}
