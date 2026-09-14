package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"abys/internal/apperr"
)

// responderError escribe el error JSON consistente:
//
//	{"error":{"code","message","details?"}}
//
// Mapeo: NotFound→404, Validation→400, Conflict→409, Immutable→422, resto→500.
func responderError(c *gin.Context, err error) {
	var se *apperr.Error
	if !errors.As(err, &se) {
		se = apperr.NewInternal(err.Error())
	}
	status := http.StatusInternalServerError
	code := "INTERNAL_ERROR"
	switch se.Kind {
	case apperr.KindNotFound:
		status, code = http.StatusNotFound, "NOT_FOUND"
	case apperr.KindValidation:
		status, code = http.StatusBadRequest, "VALIDATION_ERROR"
	case apperr.KindConflict:
		status, code = http.StatusConflict, "BUSINESS_RULE_CONFLICT"
	case apperr.KindImmutable:
		status, code = http.StatusUnprocessableEntity, "IMMUTABLE_DATA"
	}
	body := gin.H{"error": gin.H{"code": code, "message": se.Message}}
	if se.Details != nil {
		body["error"].(gin.H)["details"] = se.Details
	}
	c.AbortWithStatusJSON(status, body)
}

// badRequest responde un error 400 de validación directa (parseo de request).
func badRequest(c *gin.Context, msg string) {
	responderError(c, apperr.NewValidation(msg))
}