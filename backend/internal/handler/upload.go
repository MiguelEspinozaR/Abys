package handler

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"abys/internal/apperr"
)

// Uploader persiste archivos multipart (comprobantes y QR) en un directorio
// con límite de tamaño. Se construye en el router con la config del .env.
type Uploader struct {
	Dir      string
	MaxBytes int64
}

// Guardar persiste el campo multipart 'archivo' y devuelve la ruta pública
// relativa /uploads/<nombre>. Valida formato de imagen y tamaño máximo.
func (u *Uploader) Guardar(c *gin.Context, prefijo string) (string, error) {
	archivo, err := c.FormFile("archivo")
	if err != nil {
		return "", apperr.NewValidation("se requiere el campo multipart 'archivo'")
	}
	if u.MaxBytes > 0 && archivo.Size > u.MaxBytes {
		return "", apperr.NewValidation(fmt.Sprintf(
			"el archivo excede el tamaño máximo (%d bytes)", u.MaxBytes))
	}
	ext := strings.ToLower(filepath.Ext(archivo.Filename))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif":
	default:
		return "", apperr.NewValidation("formato de imagen no permitido: " + ext)
	}
	rutaAbs := u.Dir
	if !filepath.IsAbs(rutaAbs) {
		rutaAbs, err = filepath.Abs(rutaAbs)
		if err != nil {
			return "", apperr.NewInternal("no se pudo resolver el directorio de uploads: " + err.Error())
		}
	}
	if err := os.MkdirAll(rutaAbs, 0o755); err != nil {
		return "", apperr.NewInternal("no se pudo crear el directorio de uploads: " + err.Error())
	}
	nombre := fmt.Sprintf("%s_%d%s", prefijo, time.Now().UnixNano(), ext)
	destino := filepath.Join(rutaAbs, nombre)
	if err := c.SaveUploadedFile(archivo, destino); err != nil {
		return "", apperr.NewInternal("fallo al guardar el archivo: " + err.Error())
	}
	return "/uploads/" + nombre, nil
}