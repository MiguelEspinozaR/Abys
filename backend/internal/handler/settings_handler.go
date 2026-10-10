package handler

import (
	"slices"

	"github.com/gin-gonic/gin"

	"abys/internal/repository"
	"abys/internal/splitcalc"
)

// SettingsHandler expone la configuración global de la app.
type SettingsHandler struct {
	repo *repository.SettingsRepo
}

func NewSettingsHandler(repo *repository.SettingsRepo) *SettingsHandler {
	return &SettingsHandler{repo: repo}
}

// SplitSettingsRequest es el body de PUT /settings/split.
type SplitSettingsRequest struct {
	ModoDefault string `json:"modo_default" binding:"required"`
}

// @Summary Obtener configuración de split
// @Tags settings
// @Produce json
// @Success 200 {object} map[string]any
// @Router /settings/split [get]
func (h *SettingsHandler) GetSplit(c *gin.Context) {
	modo, ok, err := h.repo.Get(c, repository.SettingSplitModoDefault)
	if err != nil {
		responderError(c, err)
		return
	}
	if !ok || modo == "" {
		modo = splitcalc.ModoPreciso
	}
	c.JSON(200, gin.H{"data": gin.H{"modo_default": modo}})
}

// @Summary Actualizar configuración de split
// @Tags settings
// @Accept json
// @Produce json
// @Param body body SplitSettingsRequest true "Modo por defecto"
// @Success 200 {object} map[string]any
// @Failure 400 {object} map[string]any
// @Router /settings/split [put]
func (h *SettingsHandler) SetSplit(c *gin.Context) {
	var req SplitSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "body inválido: "+err.Error())
		return
	}
	if !slices.Contains(splitcalc.ModosValidos, req.ModoDefault) {
		badRequest(c, "modo de split inválido: "+req.ModoDefault)
		return
	}
	if err := h.repo.Set(c, repository.SettingSplitModoDefault, req.ModoDefault); err != nil {
		responderError(c, err)
		return
	}
	c.JSON(200, gin.H{"data": gin.H{"modo_default": req.ModoDefault}})
}
