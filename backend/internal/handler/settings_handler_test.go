package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"abys/internal/config"
	"abys/internal/database"
	"abys/internal/router"
)

func TestSettingsRegistrarEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)

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
	cfg.CORSOrigins = []string{"http://localhost:5173"}

	pool, err := database.Connect(context.Background(), cfg)
	if err != nil {
		t.Fatalf("conexión a abys_test: %v", err)
	}
	defer pool.Close()

	r := router.Setup(cfg, pool)
	ctx := context.Background()

	restore := func() {
		_, _ = pool.Exec(ctx, `DELETE FROM app_settings WHERE clave IN ('registrar_metodo_default','registrar_modo_default')`)
	}
	restore()
	defer restore()

	getRegistrar := func() (int, map[string]any) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/settings/registrar", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		var body map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &body)
		return rec.Code, body
	}
	putRegistrar := func(payload string) (int, map[string]any) {
		req := httptest.NewRequest(http.MethodPut, "/api/v1/settings/registrar", bytes.NewReader([]byte(payload)))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		var body map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &body)
		return rec.Code, body
	}

	// GET defaults con tabla vacía.
	code, body := getRegistrar()
	if code != 200 {
		t.Fatalf("GET /settings/registrar -> %d: %v", code, body)
	}
	data, _ := body["data"].(map[string]any)
	if data["metodo_default"] != "efectivo" || data["modo_default"] != "detallado" {
		t.Fatalf("defaults inesperados: %v", data)
	}

	// PUT válido + persistencia (roundtrip).
	code, body = putRegistrar(`{"metodo_default":"qr","modo_default":"distribuido"}`)
	if code != 200 {
		t.Fatalf("PUT válido -> %d: %v", code, body)
	}
	data, _ = body["data"].(map[string]any)
	if data["metodo_default"] != "qr" || data["modo_default"] != "distribuido" {
		t.Fatalf("respuesta PUT inesperada: %v", data)
	}
	code, body = getRegistrar()
	if code != 200 {
		t.Fatalf("GET tras PUT -> %d: %v", code, body)
	}
	data, _ = body["data"].(map[string]any)
	if data["metodo_default"] != "qr" || data["modo_default"] != "distribuido" {
		t.Fatalf("roundtrip inesperado: %v", data)
	}

	// Verificar claves en app_settings.
	for _, tc := range []struct {
		clave string
		valor string
	}{
		{"registrar_metodo_default", "qr"},
		{"registrar_modo_default", "distribuido"},
	} {
		var got string
		if err := pool.QueryRow(ctx, `SELECT valor FROM app_settings WHERE clave=$1`, tc.clave).Scan(&got); err != nil {
			t.Fatalf("clave %s no encontrada: %v", tc.clave, err)
		}
		if got != tc.valor {
			t.Fatalf("clave %s = %q, se esperaba %q", tc.clave, got, tc.valor)
		}
	}

	// PUT inválido no muta.
	invalid := []string{
		`{"metodo_default":"cheque","modo_default":"detallado"}`,
		`{"metodo_default":"efectivo","modo_default":"truncado"}`,
	}
	for _, payload := range invalid {
		code, body = putRegistrar(payload)
		if code != 400 {
			t.Fatalf("PUT inválido %s -> %d: %v", payload, code, body)
		}
		errObj, _ := body["error"].(map[string]any)
		if errObj["code"] != "VALIDATION_ERROR" {
			t.Fatalf("código esperado VALIDATION_ERROR en %s: %v", payload, body)
		}
	}
	// Estado persistido debe seguir siendo el último válido.
	code, body = getRegistrar()
	data, _ = body["data"].(map[string]any)
	if data["metodo_default"] != "qr" || data["modo_default"] != "distribuido" {
		t.Fatalf("PUT inválido mutó estado: %v", data)
	}
}
