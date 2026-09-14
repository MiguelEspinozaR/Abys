package handler

import (
	"github.com/gin-gonic/gin"

	"abys/internal/repository"
)

// HealthHandler expone health checks.
type HealthHandler struct {
	repo *repository.HealthRepo
}

func NewHealthHandler(repo *repository.HealthRepo) *HealthHandler {
	return &HealthHandler{repo: repo}
}

// @Summary Health básico
// @Tags health
// @Produce json
// @Success 200 {object} map[string]any
// @Router /health [get]
func (h *HealthHandler) Ping(c *gin.Context) {
	c.JSON(200, gin.H{"status": "ok", "time": c.Request.URL.Path})
}

// @Summary Health con base de datos
// @Description Verifica conexión, ping, versión, tamaño y conteos de tablas.
// @Tags health
// @Produce json
// @Success 200 {object} map[string]any
// @Failure 503 {object} map[string]any
// @Router /health/db [get]
func (h *HealthHandler) DB(c *gin.Context) {
	res := h.repo.Check(c)
	if res.Conexion != "ok" {
		c.JSON(503, gin.H{
			"status": "error",
			"error":  gin.H{"code": "DB_UNAVAILABLE", "message": "no se pudo conectar a la base de datos"},
		})
		return
	}
	c.JSON(200, gin.H{"status": "ok", "data": res})
}