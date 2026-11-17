package service

import (
	"errors"
	"testing"

	"abys/internal/apperr"
	"abys/internal/model"
)

func TestDerivarTotalPagoY422(t *testing.T) {
	dias := []model.DiaTrabajadoInput{
		{Fecha: "2026-10-20", MontoEnteros: 15000},
		{Fecha: "2026-10-21", MontoEnteros: 20000},
		{Fecha: "2026-10-22", MontoEnteros: 25000},
	}
	derivado := SumarMontoDias(dias)
	if derivado != 60000 {
		t.Fatalf("Σ días = %d, se esperaba 60000", derivado)
	}

	// Total ausente (0) se acepta.
	if err := validarTotalCliente(0, derivado); err != nil {
		t.Errorf("total ausente no debe fallar: %v", err)
	}
	// Total igual a Σ se acepta.
	if err := validarTotalCliente(derivado, derivado); err != nil {
		t.Errorf("total coincidente no debe fallar: %v", err)
	}
	// Total desincronizado → 422 (KindUnprocessable).
	err := validarTotalCliente(derivado+1, derivado)
	if err == nil {
		t.Fatal("total desincronizado debe fallar")
	}
	var se *apperr.Error
	if !errors.As(err, &se) {
		t.Fatalf("error no tipado: %v", err)
	}
	if se.Kind != apperr.KindUnprocessable {
		t.Errorf("kind = %v, se esperaba KindUnprocessable", se.Kind)
	}
}

func TestValidarDiasTrabajados(t *testing.T) {
	casos := []struct {
		nombre string
		dias   []model.DiaTrabajadoInput
		ok     bool
	}{
		{"vacío", nil, false},
		{"válido", []model.DiaTrabajadoInput{{Fecha: "2026-10-20", MontoEnteros: 0}}, true},
		{"fecha inválida", []model.DiaTrabajadoInput{{Fecha: "2026-02-31"}}, false},
		{"monto negativo", []model.DiaTrabajadoInput{{Fecha: "2026-10-20", MontoEnteros: -1}}, false},
		{"fecha duplicada", []model.DiaTrabajadoInput{
			{Fecha: "2026-10-20"}, {Fecha: "2026-10-20"},
		}, false},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			err := ValidarDiasTrabajados(c.dias)
			if c.ok && err != nil {
				t.Errorf("no debía fallar: %v", err)
			}
			if !c.ok && err == nil {
				t.Error("debía fallar")
			}
		})
	}
}
