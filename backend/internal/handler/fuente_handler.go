package handler

import (
	"github.com/gin-gonic/gin"

	"abys/internal/model"
	"abys/internal/service"
)

// FuenteHandler expone el CRUD de fuentes.
type FuenteHandler struct {
	svc *service.FuenteService
}

func NewFuenteHandler(svc *service.FuenteService) *FuenteHandler { return &FuenteHandler{svc: svc} }

// FuenteRequest es el body de crear/actualizar fuente.
type FuenteRequest struct {
	Alias    string  `json:"alias" binding:"required"`
	Color    string  `json:"color"`
	LogoRuta *string `json:"logo_ruta"`
}

// @Summary Crear fuente
// @Tags fuentes
// @Accept json
// @Produce json
// @Param body body FuenteRequest true "Fuente"
// @Success 201 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Router /fuentes [post]
func (h *FuenteHandler) Crear(c *gin.Context) {
	var req FuenteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	color := req.Color
	if color == "" {
		color = "#3b82f6"
	}
	id, err := h.svc.Crear(c, model.Fuente{Alias: req.Alias, Color: color, LogoRuta: req.LogoRuta})
	if err != nil {
		responderError(c, err)
		return
	}
	f, err := h.svc.Detalle(c, id)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(201, gin.H{"data": f})
}

// @Summary Listar fuentes
// @Tags fuentes
// @Produce json
// @Success 200 {object} map[string]any
// @Router /fuentes [get]
func (h *FuenteHandler) Listar(c *gin.Context) {
	fs, err := h.svc.Listar(c)
	if err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": fs})
}

// @Summary Actualizar fuente
// @Tags fuentes
// @Accept json
// @Produce json
// @Param id path int true "ID"
// @Param body body FuenteRequest true "Fuente"
// @Success 200 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /fuentes/{id} [put]
func (h *FuenteHandler) Actualizar(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req FuenteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	if err := h.svc.Actualizar(c, model.Fuente{ID: id, Alias: req.Alias, Color: req.Color, LogoRuta: req.LogoRuta}); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"id": id, "actualizado": true}})
}

// @Summary Eliminar fuente (soft delete)
// @Tags fuentes
// @Param id path int true "ID"
// @Success 200 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /fuentes/{id} [delete]
func (h *FuenteHandler) Eliminar(c *gin.Context) {
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