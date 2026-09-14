package splitcalc

import (
	"errors"
	"testing"

	"abys/internal/apperr"
)

// escenario de SPEC: pago 633 Bs, Box 20% (2000 bps), Business 30% (3000 bps).
func tasasBase() []TasaCuenta {
	return []TasaCuenta{
		{CuentaID: 2, Alias: "Box", TasaBps: 2000},
		{CuentaID: 1, Alias: "Business", TasaBps: 3000},
		{CuentaID: 3, Alias: "General", EsGeneral: true},
	}
}

func montosPorAlias(t *testing.T, pagoCents int64, txs []TransaccionCalculada) map[string]int64 {
	t.Helper()
	m := map[string]int64{}
	suma := int64(0)
	for _, tx := range txs {
		m[tx.Alias] = tx.Monto
		suma += tx.Monto
	}
	if len(txs) > 0 {
		for _, tx := range txs {
			if tx.TasaBps == 0 && tx.Alias != "General" {
				t.Errorf("solo General puede tener tasa 0; %q tiene tasa 0", tx.Alias)
			}
		}
		if suma != pagoCents {
			t.Errorf("la suma debe ser %d, fue %d", pagoCents, suma)
		}
	}
	return m
}

func TestCalcularSplitRedondeado(t *testing.T) {
	txs, err := CalcularSplit(63300, tasasBase(), ModoRedondeado)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	m := montosPorAlias(t, 63300, txs)
	if m["Business"] != 19000 || m["Box"] != 12700 || m["General"] != 31600 {
		t.Errorf("redondeado: Business=19000 Box=12700 General=31600; got %v", m)
	}
}

func TestCalcularSplitEnteros(t *testing.T) {
	txs, err := CalcularSplit(63300, tasasBase(), ModoEnteros)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	m := montosPorAlias(t, 63300, txs)
	if m["Business"] != 18900 || m["Box"] != 12600 || m["General"] != 31800 {
		t.Errorf("enteros: Business=18900 Box=12600 General=31800; got %v", m)
	}
}

func TestCalcularSplitPreciso(t *testing.T) {
	txs, err := CalcularSplit(63300, tasasBase(), ModoPreciso)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	m := montosPorAlias(t, 63300, txs)
	if m["Business"] != 18990 || m["Box"] != 12660 || m["General"] != 31650 {
		t.Errorf("preciso: Business=18990 Box=12660 General=31650; got %v", m)
	}
}

func TestCalcularSplitUnaCuentaCienPorCiento(t *testing.T) {
	txs, err := CalcularSplit(50000, []TasaCuenta{
		{CuentaID: 1, Alias: "Business", TasaBps: 10000},
		{CuentaID: 3, Alias: "General", EsGeneral: true},
	}, ModoPreciso)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	m := montosPorAlias(t, 50000, txs)
	if m["Business"] != 50000 || m["General"] != 0 {
		t.Errorf("100%%: Business=50000 General=0; got %v", m)
	}
}

func TestCalcularSplitUnCentavo(t *testing.T) {
	// Pago de 1 centavo (1 Bs = 100 céntimos con modos enteros/redondeado,
	// y 1 céntimo con preciso).
	txs, err := CalcularSplit(1, []TasaCuenta{
		{CuentaID: 1, Alias: "Business", TasaBps: 10000},
		{CuentaID: 3, Alias: "General", EsGeneral: true},
	}, ModoPreciso)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	m := montosPorAlias(t, 1, txs)
	if m["Business"] != 1 || m["General"] != 0 {
		t.Errorf("preciso 1 céntimo: Business=1 General=0; got %v", m)
	}

	txs, err = CalcularSplit(100, []TasaCuenta{
		{CuentaID: 1, Alias: "Business", TasaBps: 3000},
		{CuentaID: 2, Alias: "Box", TasaBps: 2000},
		{CuentaID: 3, Alias: "General", EsGeneral: true},
	}, ModoEnteros)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	m = montosPorAlias(t, 100, txs)
	if m["Business"] != 0 || m["Box"] != 0 || m["General"] != 100 {
		t.Errorf("enteros 1 Bs: todas las cuotas 0, General absorbe; got %v", m)
	}
}

func TestCalcularSplitSumaTasasMayorCien(t *testing.T) {
	_, err := CalcularSplit(50000, []TasaCuenta{
		{CuentaID: 1, Alias: "Business", TasaBps: 6000},
		{CuentaID: 2, Alias: "Box", TasaBps: 5000},
		{CuentaID: 3, Alias: "General", EsGeneral: true},
	}, ModoPreciso)
	if err == nil {
		t.Fatal("debe rechazar tasas que suman > 100%")
	}
	var ae *apperr.Error
	if !errors.As(err, &ae) || ae.Kind != apperr.KindValidation {
		t.Fatalf("debe ser error de validación, got %v", err)
	}
}

func TestCalcularSplitRequiereGeneral(t *testing.T) {
	_, err := CalcularSplit(50000, []TasaCuenta{
		{CuentaID: 1, Alias: "Business", TasaBps: 6000},
	}, ModoPreciso)
	if err == nil {
		t.Fatal("debe exigir la cuenta General")
	}
}

func TestCalcularSplitPagoCero(t *testing.T) {
	// BR-035: pago de 0 Bs debe generar split con todas las transacciones en 0.
	txs, err := CalcularSplit(0, tasasBase(), ModoPreciso)
	if err != nil {
		t.Fatalf("pago=0 debe ser aceptado: %v", err)
	}
	m := montosPorAlias(t, 0, txs)
	if m["Business"] != 0 || m["Box"] != 0 || m["General"] != 0 {
		t.Errorf("pago=0: todas las cuentas deben ser 0; got %v", m)
	}
}

// Recalcular BR-061: pago 100000 (1.000 Bs), Box realizada 50000,
// Business pendiente 50000, nuevas tasas Box 60% / Business 40%
// → Business pendiente 40000, General absorbe 10000 (interp. B).
func TestRecalcularInterpB(t *testing.T) {
	rec := []TransaccionRecalculo{
		{ID: 10, CuentaID: 2, Alias: "Box", TasaBps: 6000, Monto: 50000, Realizado: true},
		{ID: 11, CuentaID: 1, Alias: "Business", TasaBps: 3000, Monto: 50000, Realizado: false},
		{ID: 12, CuentaID: 3, Alias: "General", TasaBps: 5000, Monto: 0, Realizado: false, EsGeneral: true},
	}
	res, err := Recalcular(100000, ModoPreciso, rec, map[int64]int64{1: 4000, 2: 6000})
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	var suma int64
	for _, tc := range res.Indice {
		suma += tc.Monto
	}
	if suma+50000 != 100000 {
		t.Fatalf("Σ debe ser 100000, suma parcial %d", suma)
	}
	if res.Indice[11].Monto != 40000 {
		t.Errorf("Business pendiente debe ser 40000, got %d", res.Indice[11].Monto)
	}
	if res.Indice[12].Monto != 10000 {
		t.Errorf("General debe absorber 10000, got %d", res.Indice[12].Monto)
	}
}

// Recalcular sin General pendiente: si las cuotas no cuadran → conflict.
func TestRecalcularSinGeneralNoCuadra(t *testing.T) {
	rec := []TransaccionRecalculo{
		{ID: 11, CuentaID: 1, Alias: "Business", TasaBps: 3000, Monto: 18990, Realizado: false},
		{ID: 12, CuentaID: 2, Alias: "Box", TasaBps: 2000, Monto: 12660, Realizado: false},
	}
	_, err := Recalcular(63300, ModoPreciso, rec, map[int64]int64{1: 3000, 2: 2000})
	if err == nil {
		t.Fatal("sin General pendiente y cuotas que no cuadran debe fallar")
	}
}

// Recalcular queda inmutable si el residuo del General es negativo.
func TestRecalcularResiduoNegativo(t *testing.T) {
	rec := []TransaccionRecalculo{
		{ID: 10, CuentaID: 2, Alias: "Box", TasaBps: 6000, Monto: 90000, Realizado: true},
		{ID: 11, CuentaID: 1, Alias: "Business", TasaBps: 3000, Monto: 10000, Realizado: false},
		{ID: 12, CuentaID: 3, Alias: "General", TasaBps: 5000, Monto: 0, Realizado: false, EsGeneral: true},
	}
	_, err := Recalcular(100000, ModoPreciso, rec, map[int64]int64{1: 4000})
	if err == nil {
		t.Fatal("debe fallar cuando las cuotas exceden el remaining")
	}
	var ae *apperr.Error
	if !errors.As(err, &ae) || ae.Kind != apperr.KindImmutable {
		t.Fatalf("debe ser inmutable (422), got %v", err)
	}
}

func TestRecalcularSinTasaVigente(t *testing.T) {
	rec := []TransaccionRecalculo{
		{ID: 11, CuentaID: 1, Alias: "Business", TasaBps: 3000, Monto: 50000, Realizado: false},
		{ID: 12, CuentaID: 3, Alias: "General", TasaBps: 5000, Monto: 0, Realizado: false, EsGeneral: true},
	}
	_, err := Recalcular(100000, ModoPreciso, rec, map[int64]int64{})
	if err == nil {
		t.Fatal("debe fallar si la cuenta no tiene tasa vigente")
	}
}