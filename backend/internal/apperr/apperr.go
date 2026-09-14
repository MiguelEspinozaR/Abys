// Package apperr define errores tipados del dominio, mapeables a HTTP.
// Vive en su propio paquete para que repository y service puedan usarlo
// sin ciclos de importación.
package apperr

import "fmt"

// Kind clasifica errores de negocio para mapearlos a HTTP.
type Kind int

const (
	KindNotFound Kind = iota // 404
	KindValidation           // 400
	KindConflict             // 409 (regla de negocio)
	KindImmutable            // 422 (datos congelados/inmutables)
	KindInternal             // 500
)

// Error es un error tipado de las capas de servicio/repositorio.
type Error struct {
	Kind    Kind
	Message string
	Details any
}

func (e *Error) Error() string {
	nombre := map[Kind]string{
		KindNotFound:   "NotFound",
		KindValidation: "Validation",
		KindConflict:   "Conflict",
		KindImmutable:  "Immutable",
		KindInternal:   "Internal",
	}[e.Kind]
	return fmt.Sprintf("%s: %s", nombre, e.Message)
}

func NewNotFound(msg string) *Error   { return &Error{Kind: KindNotFound, Message: msg} }
func NewValidation(msg string) *Error { return &Error{Kind: KindValidation, Message: msg} }
func NewConflict(msg string) *Error   { return &Error{Kind: KindConflict, Message: msg} }
func NewImmutable(msg string) *Error  { return &Error{Kind: KindImmutable, Message: msg} }
func NewInternal(msg string) *Error   { return &Error{Kind: KindInternal, Message: msg} }

// WithDetails adjunta detalles estructurados al error.
func (e *Error) WithDetails(d any) *Error { e.Details = d; return e }

// AsError convierte cualquier error en *Error tipado.
func AsError(err error) *Error {
	if err == nil {
		return nil
	}
	if e, ok := err.(*Error); ok {
		return e
	}
	return NewInternal(err.Error())
}