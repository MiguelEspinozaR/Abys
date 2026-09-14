package router_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
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

	// ---- POST /pagos ----
	body := `{"fuente_id":1,"fecha_pago":"2026-06-15","monto_enteros":63300,
		"metodo_pago":"qr","notas":"test integración",
		"dias_trabajados":["2026-06-15","2026-06-16"]}`
	rec := doReq(t, r, http.MethodPost, "/api/v1/pagos", body, "")
	if rec.Code != 201 {
		t.Fatalf("POST /pagos -> %d: %s", rec.Code, rec.Body.String())
	}
	var creado struct {
		Data struct {
			ID int64 `json:"id"`
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
			ID           int64 `json:"id"`
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