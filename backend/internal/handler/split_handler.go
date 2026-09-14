package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"abys/internal/model"
	"abys/internal/repository"
	"abys/internal/service"
)

// SplitHandler expone splits y transacciones.
type SplitHandler struct {
	svc       *service.SplitService
	splitRepo *repository.SplitRepo
}

func NewSplitHandler(svc *service.SplitService, sr *repository.SplitRepo) *SplitHandler {
	return &SplitHandler{svc: svc, splitRepo: sr}
}

// GenerarSplitRequest es el body de POST /splits.
type GenerarSplitRequest struct {
	PagoID      int64  `json:"pago_id" binding:"required"`
	ModoCalculo string `json:"modo_calculo"`
}

func splitJSON(s *model.Split, txs []model.Transaccion) gin.H {
	txList := make([]gin.H, 0, len(txs))
	totalRealizado, totalPendiente := int64(0), int64(0)
	for _, t := range txs {
		txList = append(txList, transaccionJSON(t))
		if t.Realizado {
			totalRealizado += t.MontoEnteros
		} else {
			totalPendiente += t.MontoEnteros
		}
	}
	return gin.H{
		"id":              s.ID,
		"pago_id":         s.PagoID,
		"modo_calculo":    s.ModoCalculo,
		"created_at":      s.CreatedAt,
		"updated_at":      s.UpdatedAt,
		"transacciones":   txList,
		"total_realizado": totalRealizado,
		"total_pendiente": totalPendiente,
	}
}

// @Summary Generar split
// @Description Crea el split de un pago atómicamente con tasas vigentes (BR-031/032).
// @Tags splits
// @Accept json
// @Produce json
// @Param body body GenerarSplitRequest true "pago_id y modo_calculo"
// @Success 201 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Failure 409 {object} map[string]any
// @Router /splits [post]
func (h *SplitHandler) Generar(c *gin.Context) {
	var req GenerarSplitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	if req.ModoCalculo == "" {
		req.ModoCalculo = "preciso"
	}
	id, err := h.svc.Generar(c, req.PagoID, req.ModoCalculo)
	if err != nil {
		responderError(c, err)
		return
	}
	s, txs, err := h.splitRepo.GetPorID(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(201, gin.H{"data": splitJSON(s, txs)})
}

// @Summary Listar splits
// @Tags splits
// @Produce json
// @Success 200 {object} map[string]any
// @Router /splits [get]
func (h *SplitHandler) Listar(c *gin.Context) {
	splits, err := h.splitRepo.Listar(c)
	if err != nil {
		responderError(c, err)
		return
	}
	out := make([]gin.H, 0, len(splits))
	for i := range splits {
		txs, err := h.splitRepo.TransaccionesPorSplit(c, splits[i].ID)
		if err != nil {
			responderError(c, err)
			return
		}
		out = append(out, splitJSON(&splits[i], txs))
	}
	c.JSON(200, gin.H{"data": out})
}

// @Summary Detalle de split
// @Tags splits
// @Produce json
// @Param id path int true "ID del split"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /splits/{id} [get]
func (h *SplitHandler) Detalle(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	s, txs, err := h.splitRepo.GetPorID(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": splitJSON(s, txs)})
}

// @Summary Split de un pago
// @Tags splits
// @Produce json
// @Param id path int true "ID del pago"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /pagos/{id}/split [get]
func (h *SplitHandler) PorPago(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	s, txs, err := h.splitRepo.GetPorPagoID(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	if s == nil {
		c.JSON(200, gin.H{"data": nil})
		return
	}
	c.JSON(200, gin.H{"data": splitJSON(s, txs)})
}

// @Summary Recalcular split
// @Description Aplica tasas vigentes a pendientes; realizadas congeladas (BR-061).
// @Tags splits
// @Param id path int true "ID del split"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Failure 409 {object} map[string]any
// @Failure 422 {object} map[string]any
// @Router /splits/{id} [put]
func (h *SplitHandler) Recalcular(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.svc.Recalcular(c, id); err != nil {
		responderError(c, err)
		return
	}
	s, txs, err := h.splitRepo.GetPorID(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": splitJSON(s, txs)})
}

// @Summary Eliminar split
// @Description Elimina el split y sus pendientes; rechazado con realizadas (BR-036).
// @Tags splits
// @Param id path int true "ID del split"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Failure 409 {object} map[string]any
// @Router /splits/{id} [delete]
func (h *SplitHandler) Eliminar(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.svc.Eliminar(c, id); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"eliminado": true, "id": id}})
}

// @Summary Marcar transacción realizada
// @Description Congela la transacción y registra fecha_realizacion (BR-072).
// @Tags transacciones
// @Param id path int true "ID de la transacción"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /transacciones/{id}/realizar [put]
func (h *SplitHandler) MarcarRealizada(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.svc.MarcarTransaccionRealizada(c, id); err != nil {
		responderError(c, err)
		return
	}
	txs, err := h.splitRepo.ListarTransacciones(c, nil, nil, nil)
	if err != nil {
		responderError(c, err)
		return
	}
	for i := range txs {
		if txs[i].ID == id {
			c.JSON(200, gin.H{"data": transaccionJSON(txs[i])})
			return
		}
	}
	c.JSON(200, gin.H{"data": gin.H{"id": id, "realizada": true}})
}

// @Summary Listar transacciones
// @Description Filtros opcionales: split_id, cuenta_id, realizado.
// @Tags transacciones
// @Produce json
// @Param split_id query int false "Filtrar por split"
// @Param cuenta_id query int false "Filtrar por cuenta"
// @Param realizado query bool false "true|false"
// @Success 200 {object} map[string]any
// @Router /transacciones [get]
func (h *SplitHandler) ListarTransacciones(c *gin.Context) {
	var splitID, cuentaID *int64
	if v := c.Query("split_id"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			splitID = &n
		}
	}
	if v := c.Query("cuenta_id"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			cuentaID = &n
		}
	}
	var realizado *bool
	if v := c.Query("realizado"); v != "" {
		b := v == "true" || v == "1"
		realizado = &b
	}
	txs, err := h.splitRepo.ListarTransacciones(c, splitID, cuentaID, realizado)
	if err != nil {
		responderError(c, err)
		return
	}
	out := make([]gin.H, 0, len(txs))
	for _, t := range txs {
		out = append(out, transaccionJSON(t))
	}
	c.JSON(200, gin.H{"data": out})
}

func transaccionJSON(t model.Transaccion) gin.H {
	return gin.H{
		"id":                 t.ID,
		"split_id":           t.SplitID,
		"cuenta_id":          t.CuentaID,
		"monto_enteros":      t.MontoEnteros,
		"tasa_bps":           t.TasaBps,
		"alias_snapshot":     t.AliasSnapshot,
		"realizado":          t.Realizado,
		"fecha_realizacion":  t.FechaRealizacion,
		"created_at":         t.CreatedAt,
		"updated_at":         t.UpdatedAt,
	}
}