package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"abys/internal/middleware"
)

// servirCORS monta el middleware sobre rutas GET y OPTIONS para poder verificar
// tanto la respuesta normal como el preflight (que debe abortar con 204).
func servirCORS(origins []string, method, origin string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.CORS(origins))
	ok := func(c *gin.Context) { c.String(http.StatusOK, "ok") }
	r.GET("/ping", ok)
	r.OPTIONS("/ping", ok)

	req := httptest.NewRequest(method, "/ping", nil)
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func TestCORSOrigenPermitidoReflejaOrigenYVary(t *testing.T) {
	rec := servirCORS([]string{"http://localhost:5173"}, http.MethodGet, "http://localhost:5173")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET -> %d, se esperaba 200: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("Access-Control-Allow-Origin = %q, se esperaba el origen permitido", got)
	}
	if got := rec.Header().Get("Vary"); got != "Origin" {
		t.Errorf("Vary = %q, se esperaba Origin", got)
	}
}

func TestCORSOrigenNoPermitidoSinCabeceras(t *testing.T) {
	rec := servirCORS([]string{"http://localhost:5173"}, http.MethodGet, "https://no-listado.example")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET -> %d, se esperaba 200: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("origen no listado no debe emitir Access-Control-Allow-Origin, dio %q", got)
	}
	if got := rec.Header().Get("Vary"); got != "" {
		t.Errorf("origen no listado no debe emitir Vary, dio %q", got)
	}
}

func TestCORSPreflightResponde204(t *testing.T) {
	rec := servirCORS([]string{"http://localhost:5173"}, http.MethodOptions, "http://localhost:5173")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("OPTIONS -> %d, se esperaba 204: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("preflight Access-Control-Allow-Origin = %q", got)
	}
	if got := rec.Header().Get("Vary"); got != "Origin" {
		t.Errorf("preflight Vary = %q, se esperaba Origin", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); got == "" {
		t.Error("preflight debe anunciar Access-Control-Allow-Methods")
	}
}

func TestCORSComodinDevuelveAsterisco(t *testing.T) {
	rec := servirCORS([]string{"*"}, http.MethodGet, "https://cualquiera.example")
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Access-Control-Allow-Origin = %q, se esperaba *", got)
	}
}

func TestCORSSinOrigenNoEmiteCabeceras(t *testing.T) {
	rec := servirCORS([]string{"http://localhost:5173"}, http.MethodGet, "")
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("sin header Origin no debe emitir CORS, dio %q", got)
	}
}
