package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"abys/internal/repository"
	"abys/internal/service"
)

// PagoHandler expone el CRUD de pagos + días + comprobante.
type PagoHandler struct {
	svc *service.PagoService
	up  *Uploader
}

func NewPagoHandler(svc *service.PagoService, up *Uploader) *PagoHandler {
	return &PagoHandler{svc: svc, up: up}
}

// CreatePagoRequest es el body de POST /api/v1/pagos.
type CreatePagoRequest struct {
	FuenteID       int64    `json:"fuente_id" binding:"required"`
	FechaPago      string   `json:"fecha_pago" binding:"required"`
	MontoEnteros   int64    `json:"monto_enteros"`
	MetodoPago     string   `json:"metodo_pago" binding:"required"`
	Notas          *string  `json:"notas"`
	DiasTrabajados []string `json:"dias_trabajados" binding:"required,min=1"`
}

// UpdatePagoRequest es el body de PUT /api/v1/pagos/:id (dias opcional).
type UpdatePagoRequest struct {
	FuenteID       int64    `json:"fuente_id" binding:"required"`
	FechaPago      string   `json:"fecha_pago" binding:"required"`
	MontoEnteros   int64    `json:"monto_enteros"`
	MetodoPago     string   `json:"metodo_pago" binding:"required"`
	Notas          *string  `json:"notas"`
	DiasTrabajados []string `json:"dias_trabajados"`
}

// @Summary Crear pago
// @Description Crea un pago con sus días trabajados (BR-001..BR-007).
// @Tags pagos
// @Accept json
// @Produce json
// @Param body body CreatePagoRequest true "Datos del pago"
// @Success 201 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 409 {object} map[string]any
// @Router /pagos [post]
func (h *PagoHandler) Crear(c *gin.Context) {
	var req CreatePagoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	id, err := h.svc.CrearPago(c, nil, req.FuenteID, req.FechaPago, req.MontoEnteros,
		req.MetodoPago, req.Notas, req.DiasTrabajados)
	if err != nil {
		responderError(c, err)
		return
	}
	detalle, err := h.svc.Detalle(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(201, gin.H{"data": detalle})
}

// @Summary Listar pagos
// @Description Lista pagos activos con filtros y paginación (excluye soft-deleted).
// @Tags pagos
// @Produce json
// @Param fecha_inicio query string false "YYYY-MM-DD"
// @Param fecha_fin query string false "YYYY-MM-DD"
// @Param fuente_id query int false "Filtrar por fuente"
// @Param metodo_pago query string false "efectivo|qr|transaccion"
// @Param page query int false "Página (default 1)"
// @Param page_size query int false "Por página (default 20, máx 100)"
// @Success 200 {object} map[string]any
// @Router /pagos [get]
func (h *PagoHandler) Listar(c *gin.Context) {
	f := repository.FiltroPagos{}
	if v := c.Query("fecha_inicio"); v != "" {
		f.FechaInicio = &v
	}
	if v := c.Query("fecha_fin"); v != "" {
		f.FechaFin = &v
	}
	if v := c.Query("fuente_id"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			f.FuenteID = &n
		} else {
			badRequest(c, "fuente_id inválido")
			return
		}
	}
	if v := c.Query("metodo_pago"); v != "" {
		f.MetodoPago = &v
	}
	f.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	f.PageSize, _ = strconv.Atoi(c.DefaultQuery("page_size", "20"))

	pagos, total, err := h.svc.Listar(c, f)
	if err != nil {
		responderError(c, err)
		return
	}
	pageSize := f.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	c.JSON(200, gin.H{
		"data": pagos,
		"meta": gin.H{
			"page":        f.Page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// @Summary Detalle de pago
// @Description Devuelve un pago activo con días, fuente y split.
// @Tags pagos
// @Produce json
// @Param id path int true "ID del pago"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /pagos/{id} [get]
func (h *PagoHandler) Detalle(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	detalle, err := h.svc.Detalle(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": detalle})
}

// @Summary Actualizar pago
// @Description Actualiza campos del pago. No permite cambiar el monto si tiene split.
// @Tags pagos
// @Accept json
// @Produce json
// @Param id path int true "ID del pago"
// @Param body body UpdatePagoRequest true "Datos a actualizar"
// @Success 200 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Failure 422 {object} map[string]any
// @Router /pagos/{id} [put]
func (h *PagoHandler) Actualizar(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req UpdatePagoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	diasSet := false
	if req.DiasTrabajados != nil {
		diasSet = true
	}
	err := h.svc.ActualizarPago(c, id, req.FuenteID, req.FechaPago, req.MontoEnteros,
		req.MetodoPago, req.Notas, req.DiasTrabajados, diasSet)
	if err != nil {
		responderError(c, err)
		return
	}
	detalle, err := h.svc.Detalle(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": detalle})
}

// @Summary Eliminar pago (soft delete)
// @Description Marca deleted_at. Rechazado si hay transacciones realizadas (BR-005).
// @Tags pagos
// @Param id path int true "ID del pago"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Failure 409 {object} map[string]any
// @Router /pagos/{id} [delete]
func (h *PagoHandler) Eliminar(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	if err := h.svc.EliminarPago(c, id); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"deleted": true, "id": id}})
}

// @Summary Agregar día trabajado
// @Description Agrega un día a un pago (fechas únicas por pago, BR-006/010).
// @Tags pagos
// @Accept json
// @Produce json
// @Param id path int true "ID del pago"
// @Param body body map[string]string true "{\"fecha\":\"YYYY-MM-DD\"}"
// @Success 201 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Router /pagos/{id}/dias [post]
func (h *PagoHandler) AgregarDia(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var body struct {
		Fecha string `json:"fecha" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		badRequest(c, "body inválido: se requiere {\"fecha\":\"YYYY-MM-DD\"}")
		return
	}
	if err := h.svc.AgregarDia(c, id, body.Fecha); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(201, gin.H{"data": gin.H{"pago_id": id, "fecha": body.Fecha, "agregado": true}})
}

// @Summary Eliminar día trabajado
// @Description Elimina un día manteniendo al menos uno (BR-002).
// @Tags pagos
// @Param id path int true "ID del pago"
// @Param diaId path int true "ID del día"
// @Success 200 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /pagos/{id}/dias/{diaId} [delete]
func (h *PagoHandler) EliminarDia(c *gin.Context) {
	pagoID, ok := pathID(c)
	if !ok {
		return
	}
	diaID, err := strconv.ParseInt(c.Param("diaId"), 10, 64)
	if err != nil || diaID <= 0 {
		badRequest(c, "diaId inválido")
		return
	}
	if err := h.svc.EliminarDia(c, pagoID, diaID); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"eliminado": true, "pago_id": pagoID, "dia_id": diaID}})
}

// @Summary Subir comprobante del pago
// @Description Multipart: campo 'archivo'. Valida formato imagen y tamaño máximo.
// @Tags pagos
// @Accept multipart/form-data
// @Param id path int true "ID del pago"
// @Param archivo formData file true "Imagen comprobante"
// @Success 200 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /pagos/{id}/comprobante [post]
func (h *PagoHandler) SubirComprobante(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	ruta, err := h.up.Guardar(c, "comprobante")
	if err != nil {
		responderError(c, err)
		return
	}
	if err := h.svc.SubirComprobante(c, id, ruta); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"id": id, "imagen_ruta": ruta}})
}

func pathID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		badRequest(c, "id inválido")
		return 0, false
	}
	return id, true
}