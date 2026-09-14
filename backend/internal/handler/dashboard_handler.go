package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"abys/internal/service"
)

// DashboardHandler expone las 4 vistas del dashboard.
type DashboardHandler struct {
	svc *service.DashboardService
}

func NewDashboardHandler(svc *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

func mesAnio(c *gin.Context) (int, int) {
	mes, err1 := strconv.Atoi(c.DefaultQuery("mes", "0"))
	anio, err2 := strconv.Atoi(c.DefaultQuery("anio", "0"))
	if err1 != nil || err2 != nil {
		return 0, 0
	}
	return mes, anio
}

// @Summary Resumen mensual
// @Tags dashboard
// @Produce json
// @Param mes query int true "Mes (1-12)"
// @Param anio query int true "Año (YYYY)"
// @Success 200 {object} map[string]any
// @Router /dashboard/summary [get]
func (h *DashboardHandler) Summary(c *gin.Context) {
	mes, anio := mesAnio(c)
	if mes < 1 || mes > 12 || anio < 2000 {
		badRequest(c, "se requieren mes (1-12) y anio (YYYY) válidos")
		return
	}
	res, err := h.svc.Summary(c, mes, anio)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}

// @Summary Semana actual/consultada (7 días)
// @Tags dashboard
// @Produce json
// @Param fecha query string false "YYYY-MM-DD (default hoy)"
// @Success 200 {object} map[string]any
// @Router /dashboard/weekly [get]
func (h *DashboardHandler) Weekly(c *gin.Context) {
	fecha := c.DefaultQuery("fecha", "")
	if fecha == "" {
		fecha = hoyLaPaz()
	}
	res, err := h.svc.Weekly(c, fecha)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}

// @Summary Mes por semanas
// @Tags dashboard
// @Produce json
// @Param mes query int true "Mes (1-12)"
// @Param anio query int true "Año (YYYY)"
// @Success 200 {object} map[string]any
// @Router /dashboard/monthly [get]
func (h *DashboardHandler) Monthly(c *gin.Context) {
	mes, anio := mesAnio(c)
	if mes < 1 || mes > 12 || anio < 2000 {
		badRequest(c, "se requieren mes (1-12) y anio (YYYY) válidos")
		return
	}
	res, err := h.svc.Monthly(c, mes, anio)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}

// @Summary Año por meses
// @Tags dashboard
// @Produce json
// @Param anio query int true "Año (YYYY)"
// @Success 200 {object} map[string]any
// @Router /dashboard/yearly [get]
func (h *DashboardHandler) Yearly(c *gin.Context) {
	anio, err := strconv.Atoi(c.DefaultQuery("anio", "0"))
	if err != nil || anio < 2000 {
		badRequest(c, "se requiere anio (YYYY) válido")
		return
	}
	res, err := h.svc.Yearly(c, anio)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}

// @Summary Histórico con tendencia
// @Tags dashboard
// @Produce json
// @Success 200 {object} map[string]any
// @Router /dashboard/history [get]
func (h *DashboardHandler) History(c *gin.Context) {
	res, err := h.svc.History(c)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}