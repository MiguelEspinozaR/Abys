package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"abys/internal/service"
)

// DashboardHandler expone las vistas del dashboard.
type DashboardHandler struct {
	svc *service.DashboardService
}

func NewDashboardHandler(svc *service.DashboardService) *DashboardHandler {
	return &DashboardHandler{svc: svc}
}

// Tipos de respuesta para Swagger (el JSON real va envuelto en "data").
type DashboardSummaryResponse struct {
	Data service.SummaryResultado `json:"data"`
}

type DashboardWeeklyResponse struct {
	Data service.WeeklyResultado `json:"data"`
}

type DashboardMonthlyResponse struct {
	Data service.MonthlyResultado `json:"data"`
}

type DashboardYearlyResponse struct {
	Data service.YearlyResultado `json:"data"`
}

type DashboardHistoryResponse struct {
	Data service.HistoryResultado `json:"data"`
}

type DashboardDistributionMonthlyResponse struct {
	Data service.DistributionMonthlyResultado `json:"data"`
}

type DashboardDistributionYearlyResponse struct {
	Data service.DistributionYearlyResultado `json:"data"`
}

func mesAnio(c *gin.Context) (int, int) {
	mes, err1 := strconv.Atoi(c.DefaultQuery("mes", "0"))
	anio, err2 := strconv.Atoi(c.DefaultQuery("anio", "0"))
	if err1 != nil || err2 != nil {
		return 0, 0
	}
	return mes, anio
}

// @Summary Resumen de 30 días e histórico
// @Description Suma de días trabajados en los últimos 30 días calendario (La Paz) y el histórico.
// @Tags dashboard
// @Produce json
// @Success 200 {object} DashboardSummaryResponse
// @Router /dashboard/summary [get]
func (h *DashboardHandler) Summary(c *gin.Context) {
	res, err := h.svc.Summary(c)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}

// @Summary Semana actual/consultada (7 días, apilado por fuente)
// @Description Totales por día (lunes a domingo) con desglose por fuente, incluyendo fuentes soft-deleted.
// @Tags dashboard
// @Produce json
// @Param fecha query string false "YYYY-MM-DD (default hoy)"
// @Success 200 {object} DashboardWeeklyResponse
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

// @Summary Mes por bloques de días
// @Description Bloques 1–7, 8–14, 15–21, 22–28 y 29–fin del mes, con totales de días trabajados.
// @Tags dashboard
// @Produce json
// @Param mes query int true "Mes (1-12)"
// @Param anio query int true "Año (YYYY)"
// @Success 200 {object} DashboardMonthlyResponse
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
// @Description Totales mensuales (12 meses) de días trabajados.
// @Tags dashboard
// @Produce json
// @Param anio query int true "Año (YYYY)"
// @Success 200 {object} DashboardYearlyResponse
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

// @Summary Histórico mensual completo
// @Description Totales mensuales de todo el histórico de días trabajados.
// @Tags dashboard
// @Produce json
// @Success 200 {object} DashboardHistoryResponse
// @Router /dashboard/history [get]
func (h *DashboardHandler) History(c *gin.Context) {
	res, err := h.svc.History(c)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}

// @Summary Distribución del mes por fuente
// @Description Totales del mes por fuente (incluye fuentes soft-deleted).
// @Tags dashboard
// @Produce json
// @Param mes query int true "Mes (1-12)"
// @Param anio query int true "Año (YYYY)"
// @Success 200 {object} DashboardDistributionMonthlyResponse
// @Router /dashboard/distribution/monthly [get]
func (h *DashboardHandler) DistributionMonthly(c *gin.Context) {
	mes, anio := mesAnio(c)
	if mes < 1 || mes > 12 || anio < 2000 {
		badRequest(c, "se requieren mes (1-12) y anio (YYYY) válidos")
		return
	}
	res, err := h.svc.DistributionMonthly(c, mes, anio)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}

// @Summary Distribución del año por fuente
// @Description Totales del año por fuente (incluye fuentes soft-deleted).
// @Tags dashboard
// @Produce json
// @Param anio query int true "Año (YYYY)"
// @Success 200 {object} DashboardDistributionYearlyResponse
// @Router /dashboard/distribution/yearly [get]
func (h *DashboardHandler) DistributionYearly(c *gin.Context) {
	anio, err := strconv.Atoi(c.DefaultQuery("anio", "0"))
	if err != nil || anio < 2000 {
		badRequest(c, "se requiere anio (YYYY) válido")
		return
	}
	res, err := h.svc.DistributionYearly(c, anio)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}
