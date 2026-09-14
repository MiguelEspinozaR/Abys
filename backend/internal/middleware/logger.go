package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger registra método, ruta, status y latencia de cada request.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Printf("[%s] %s %s -> %d (%s)",
			c.Request.Method, c.FullPath(), c.Request.URL.Path,
			c.Writer.Status(), time.Since(start).Round(time.Microsecond))
	}
}