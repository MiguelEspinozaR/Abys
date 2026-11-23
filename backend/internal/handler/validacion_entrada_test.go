package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"abys/internal/apperr"
)

// contextoJSON construye un gin.Context con un body JSON, como hacen los tests
// de router/handler ya presentes en el repositorio.
func contextoJSON(t *testing.T, method, body string) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(method, "/api/v1/cuentas", bytes.NewBufferString(body))
	c.Request.Header.Set("Content-Type", "application/json")
	return c, rec
}

// TestValidacionCuentaInputInvalido verifica que los nuevos topes (que replica
// el esquema SQL) se rechazan con el contrato de error vigente antes de tocar
// la capa de servicio.
func TestValidacionCuentaInputInvalido(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewCuentaHandler(nil, nil, nil, nil)

	casos := []struct {
		nombre string
		body   string
	}{
		{"alias ausente", `{}`},
		{"alias vacío", `{"alias":""}`},
		{"alias mayor que 100", `{"alias":"` + strings.Repeat("a", 101) + `"}`},
		{"numero mayor que 50", `{"alias":"Business","numero":"` + strings.Repeat("9", 51) + `"}`},
		{"banco mayor que 100", `{"alias":"Business","banco":"` + strings.Repeat("B", 101) + `"}`},
	}
	for _, tc := range casos {
		t.Run(tc.nombre, func(t *testing.T) {
			c, rec := contextoJSON(t, http.MethodPost, tc.body)
			h.Crear(c) // con input inválido debe retornar antes de usar el servicio
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("POST cuenta -> %d, se esperaba 400: %s", rec.Code, rec.Body.String())
			}
			assertErrorValidacion(t, rec.Body.Bytes())
		})
	}

	t.Run("actualizar con alias sobredimensionado", func(t *testing.T) {
		c, rec := contextoJSON(t, http.MethodPut, `{"alias":"`+strings.Repeat("a", 101)+`"}`)
		c.Params = gin.Params{{Key: "id", Value: "1"}}
		h.Actualizar(c)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("PUT cuenta -> %d, se esperaba 400: %s", rec.Code, rec.Body.String())
		}
		assertErrorValidacion(t, rec.Body.Bytes())
	})
}

// TestValidacionCuentaDatosValidosYLegacy comprueba que los topes no rechazan
// ni el valor límite del esquema ni un registro migrado (alias/numero/banco
// históricos), que siguen pasando el binding tal cual.
func TestValidacionCuentaDatosValidosYLegacy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	casos := []struct {
		nombre string
		body   string
		alias  string
	}{
		{
			"tope exacto del esquema",
			`{"alias":"` + strings.Repeat("a", 100) + `","numero":"` + strings.Repeat("9", 50) + `","banco":"` + strings.Repeat("B", 100) + `"}`,
			strings.Repeat("a", 100),
		},
		{
			"dato legacy migrado",
			`{"alias":"Business","numero":"1016387238","banco":"BMSC"}`,
			"Business",
		},
	}
	for _, tc := range casos {
		t.Run(tc.nombre, func(t *testing.T) {
			c, _ := contextoJSON(t, http.MethodPost, tc.body)
			var req CuentaRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				t.Fatalf("binding rechazó un dato válido: %v", err)
			}
			if req.Alias != tc.alias {
				t.Errorf("alias = %q, se esperaba %q", req.Alias, tc.alias)
			}
		})
	}
}

// TestResponderErrorConservaDetails guarda el contrato HTTP de errores: un
// error de validación sigue siendo 400/VALIDATION_ERROR y serializa details.
func TestResponderErrorConservaDetails(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, rec := contextoJSON(t, http.MethodGet, "")
	responderError(c, &apperr.Error{
		Kind:    apperr.KindValidation,
		Message: "alias inválido",
		Details: gin.H{"campo": "alias"},
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("responderError -> %d, se esperaba 400", rec.Code)
	}
	var resp struct {
		Error struct {
			Code    string         `json:"code"`
			Message string         `json:"message"`
			Details map[string]any `json:"details"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("json: %v", err)
	}
	if resp.Error.Code != "VALIDATION_ERROR" {
		t.Errorf("code = %q, se esperaba VALIDATION_ERROR", resp.Error.Code)
	}
	if resp.Error.Details["campo"] != "alias" {
		t.Errorf("details no serializado: %s", rec.Body.String())
	}
}

func assertErrorValidacion(t *testing.T, body []byte) {
	t.Helper()
	var resp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		t.Fatalf("json: %v", err)
	}
	if resp.Error.Code != "VALIDATION_ERROR" {
		t.Errorf("code = %q, se esperaba VALIDATION_ERROR: %s", resp.Error.Code, body)
	}
}
