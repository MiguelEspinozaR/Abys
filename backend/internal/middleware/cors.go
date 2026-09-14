package middleware

import (
	"slices"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS permite múltiples orígenes separados por coma (CORS_ORIGIN).
// Responde al preflight y refleja el Origin solo si está permitido.
func CORS(origins []string) gin.HandlerFunc {
	allowAll := slices.Contains(origins, "*")
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && (allowAll || slices.Contains(origins, origin)) {
			if allowAll {
				c.Header("Access-Control-Allow-Origin", "*")
				c.Header("Vary", "Origin")
			} else {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Vary", "Origin")
			}
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Origin")
			c.Header("Access-Control-Max-Age", "86400")
		}
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

var _ = strings.TrimSpace