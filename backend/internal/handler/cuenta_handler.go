package handler

import (
	"github.com/gin-gonic/gin"

	"abys/internal/model"
	"abys/internal/repository"
	"abys/internal/service"
)

// CuentaHandler expone CRUD de cuentas + QR + historial + tasa.
type CuentaHandler struct {
	svc        *service.CuentaService
	tasaSvc    *service.TasaService
	cuentaRepo *repository.CuentaRepo
	up         *Uploader
}

func NewCuentaHandler(svc *service.CuentaService, tasaSvc *service.TasaService, repo *repository.CuentaRepo, up *Uploader) *CuentaHandler {
	return &CuentaHandler{svc: svc, tasaSvc: tasaSvc, cuentaRepo: repo, up: up}
}

// CuentaRequest es el body de crear/actualizar cuenta.
type CuentaRequest struct {
	Alias  string  `json:"alias" binding:"required"`
	Numero *string `json:"numero"`
	Banco  *string `json:"banco"`
}

// TasaRequest es el body de PUT /cuentas/:id/tasa.
type TasaRequest struct {
	Tasa              float64 `json:"tasa" binding:"required"`
	AplicarPendientes bool    `json:"aplicar_pendientes"`
}

// @Summary Crear cuenta
// @Description Crea una cuenta de distribución (nunca General).
// @Tags cuentas
// @Accept json
// @Produce json
// @Param body body CuentaRequest true "Cuenta"
// @Success 201 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Router /cuentas [post]
func (h *CuentaHandler) Crear(c *gin.Context) {
	var req CuentaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	id, err := h.svc.Crear(c, model.Cuenta{Alias: req.Alias, Numero: req.Numero, Banco: req.Banco})
	if err != nil {
		responderError(c, err)
		return
	}
	resp, err := h.conRespuesta(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(201, gin.H{"data": resp})
}

// @Summary Listar cuentas
// @Description Lista cuentas activas con su tasa vigente (General derivada).
// @Tags cuentas
// @Produce json
// @Success 200 {object} map[string]any
// @Router /cuentas [get]
func (h *CuentaHandler) Listar(c *gin.Context) {
	cs, err := h.svc.Listar(c)
	if err != nil {
		responderError(c, err)
		return
	}
	gralBps, err := h.tasaSvc.CalcularTasaGeneral(c)
	if err != nil {
		responderError(c, err)
		return
	}
	out := make([]gin.H, 0, len(cs))
	for _, cu := range cs {
		out = append(out, h.jsonCuenta(c, cu, gralBps))
	}
	c.JSON(200, gin.H{"data": out})
}

// @Summary Detalle de cuenta
// @Tags cuentas
// @Produce json
// @Param id path int true "ID"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /cuentas/{id} [get]
func (h *CuentaHandler) Detalle(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	resp, err := h.conRespuesta(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": resp})
}

// @Summary Actualizar cuenta
// @Tags cuentas
// @Accept json
// @Produce json
// @Param id path int true "ID"
// @Param body body CuentaRequest true "Cuenta"
// @Success 200 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /cuentas/{id} [put]
func (h *CuentaHandler) Actualizar(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req CuentaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	if err := h.svc.Actualizar(c, model.Cuenta{ID: id, Alias: req.Alias, Numero: req.Numero, Banco: req.Banco}); err != nil {
		responderError(c, err)
		return
	}
	resp, err := h.conRespuesta(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": resp})
}

// @Summary Eliminar cuenta (soft delete)
// @Description General no puede eliminarse; snapshots históricos se conservan (BR-043/084).
// @Tags cuentas
// @Param id path int true "ID"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Failure 409 {object} map[string]any
// @Router /cuentas/{id} [delete]
func (h *CuentaHandler) Eliminar(c *gin.Context) {
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

// @Summary Subir QR de cuenta
// @Tags cuentas
// @Accept multipart/form-data
// @Param id path int true "ID"
// @Param archivo formData file true "Imagen QR"
// @Success 200 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /cuentas/{id}/qr [post]
func (h *CuentaHandler) SubirQR(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	ruta, err := h.up.Guardar(c, "qr")
	if err != nil {
		responderError(c, err)
		return
	}
	if err := h.cuentaRepo.SetQR(c, id, ruta); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"id": id, "qr_ruta": ruta}})
}

// @Summary Eliminar QR de cuenta
// @Tags cuentas
// @Param id path int true "ID"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /cuentas/{id}/qr [delete]
func (h *CuentaHandler) EliminarQR(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.cuentaRepo.ClearQR(c, id); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"id": id, "qr_ruta": nil}})
}

// @Summary Historial de tasas
// @Tags cuentas
// @Produce json
// @Param id path int true "ID"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /cuentas/{id}/historial-tasas [get]
func (h *CuentaHandler) HistorialTasas(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if _, err := h.svc.Detalle(c, id); err != nil {
		responderError(c, err)
		return
	}
	hist, err := h.cuentaRepo.HistorialTasas(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": hist})
}

// @Summary Cambiar tasa de cuenta
// @Description {tasa: 20.5, aplicar_pendientes: false}. Valida Σ≤100% (BR-041),
// registra historial (BR-050) y opcionalmente recalcula pendientes (BR-061).
// @Tags cuentas
// @Accept json
// @Produce json
// @Param id path int true "ID"
// @Param body body TasaRequest true "Tasa en % y aplicar_pendientes"
// @Success 200 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Failure 409 {object} map[string]any
// @Failure 422 {object} map[string]any
// @Router /cuentas/{id}/tasa [put]
func (h *CuentaHandler) CambiarTasa(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req TasaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	res, err := h.tasaSvc.CambiarTasa(c, id, req.Tasa, req.AplicarPendientes)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": res})
}

// conRespuesta construye el JSON de cuenta con su tasa vigente.
func (h *CuentaHandler) conRespuesta(c *gin.Context, id int64) (gin.H, error) {
	cu, err := h.svc.Detalle(c, id)
	if err != nil {
		return nil, err
	}
	gralBps, err := h.tasaSvc.CalcularTasaGeneral(c)
	if err != nil {
		return nil, err
	}
	return h.jsonCuenta(c, *cu, gralBps), nil
}

func (h *CuentaHandler) jsonCuenta(c *gin.Context, cu model.Cuenta, gralBps int64) gin.H {
	var tasaBps int64
	if cu.EsGeneral {
		tasaBps = gralBps
	} else if v, err := h.cuentaRepo.TasaVigente(c, cu.ID); err == nil {
		tasaBps = v
	}
	return gin.H{
		"id":         cu.ID,
		"alias":      cu.Alias,
		"numero":     cu.Numero,
		"banco":      cu.Banco,
		"qr_ruta":    cu.QRRuta,
		"es_general": cu.EsGeneral,
		"tasa_bps":   tasaBps,
		"created_at": cu.CreatedAt,
		"updated_at": cu.UpdatedAt,
	}
}