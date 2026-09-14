package service

import (
	"slices"
	"strings"
	"time"

	"abys/internal/apperr"
)

// Métodos de pago permitidos (BR-007).
var MetodosPago = []string{"efectivo", "qr", "transaccion"}

// ValidarMontoPago valida monto ≥ 0 (BR-006).
func ValidarMontoPago(monto int64) error {
	if monto < 0 {
		return apperr.NewValidation("el monto del pago no puede ser negativo")
	}
	return nil
}

// ValidarFechaPago valida fecha YYYY-MM-DD real (evita 31/02, BR-006).
func ValidarFechaPago(fecha string) error {
	t, err := time.Parse("2006-01-02", fecha)
	if err != nil {
		return apperr.NewValidation("fecha inválida, use YYYY-MM-DD: " + fecha)
	}
	// time.Parse normaliza días fuera de rango (p. ej. 31/02); verificamos round-trip.
	if t.Format("2006-01-02") != fecha {
		return apperr.NewValidation("fecha inválida: " + fecha)
	}
	return nil
}

// ValidarMetodoPago valida el método contra la lista fija (BR-007).
func ValidarMetodoPago(metodo string) error {
	if !slices.Contains(MetodosPago, metodo) {
		return apperr.NewValidation("método de pago inválido; use: " + strings.Join(MetodosPago, ", "))
	}
	return nil
}

// ValidarDiasTrabajados valida ≥ 1 día y fechas únicas dentro del pago (BR-001/BR-006/BR-010).
func ValidarDiasTrabajados(dias []string) error {
	if len(dias) == 0 {
		return apperr.NewValidation("un pago debe tener al menos un día trabajado")
	}
	seen := map[string]bool{}
	for _, f := range dias {
		if err := ValidarFechaPago(f); err != nil {
			return err
		}
		if seen[f] {
			return apperr.NewValidation("fechas de trabajo duplicadas dentro del mismo pago: " + f)
		}
		seen[f] = true
	}
	return nil
}

// LaPaz devuelve la zona horaria del proyecto (America/La_Paz, UTC-4).
func LaPaz() *time.Location {
	loc, err := time.LoadLocation("America/La_Paz")
	if err != nil {
		return time.FixedZone("America/La_Paz", -4*3600)
	}
	return loc
}