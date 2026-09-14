// Package splitcalc contiene la lógica pura de cálculo de splits
// (BR-031/032/034, BR-060/061). No depende de repositories ni servicios
// para evitar ciclos de importación.
package splitcalc

import (
	"fmt"
	"math"
	"slices"

	"abys/internal/apperr"
)

// Modos de cálculo del split (BR-034): redondeado (half-up a 1 Bs),
// enteros (truncado a 1 Bs), preciso (truncado al centavo).
const (
	ModoRedondeado = "redondeado"
	ModoEnteros    = "enteros"
	ModoPreciso    = "preciso"
)

// ModosValidos es la lista de modos aceptados por la API.
var ModosValidos = []string{ModoRedondeado, ModoEnteros, ModoPreciso}

// TasaCuenta describe una cuenta con su tasa al momento de calcular.
type TasaCuenta struct {
	CuentaID  int64
	Alias     string
	TasaBps   int64 // basis points: 20% = 2000
	EsGeneral bool
}

// TransaccionCalculada es el resultado de aplicar tasa a un monto de pago.
type TransaccionCalculada struct {
	CuentaID int64
	Alias    string
	TasaBps  int64
	Monto    int64 // centavos
}

// rawCents calcula pagoCents * tasaBps / 10000 con guarda de desborde.
func rawCents(pagoCents, tasaBps int64) (int64, error) {
	if pagoCents < 0 {
		return 0, apperr.NewValidation("monto negativo no permitido")
	}
	if tasaBps < 0 || tasaBps > 10000 {
		return 0, apperr.NewValidation(fmt.Sprintf("tasa fuera de rango: %d bps", tasaBps))
	}
	if pagoCents > 0 && tasaBps > math.MaxInt64/pagoCents {
		return 0, apperr.NewValidation("overflow en el cálculo del split")
	}
	return pagoCents * tasaBps / 10000, nil
}

// aplicarModo redondea el raw según el modo (BR-034).
func aplicarModo(raw int64, modo string) int64 {
	switch modo {
	case ModoRedondeado:
		return ((raw + 50) / 100) * 100
	case ModoEnteros:
		return (raw / 100) * 100
	default: // preciso
		return raw
	}
}

// CalcularSplit distribuye un pago entre las cuentas dadas (BR-031/032/034).
// La cuenta General absorbe el residuo: monto = pago − Σ(otras). La suma
// resultante siempre es exactamente el monto del pago (BR-081).
// Acepta pagoCents >= 0 (BR-035 permite transacciones de 0 Bs).
func CalcularSplit(pagoCents int64, tasas []TasaCuenta, modo string) ([]TransaccionCalculada, error) {
	if !slices.Contains(ModosValidos, modo) {
		return nil, apperr.NewValidation("modo de cálculo inválido: " + modo)
	}
	if pagoCents < 0 {
		return nil, apperr.NewValidation("el monto del pago no puede ser negativo")
	}

	var general *TasaCuenta
	sumaTasas := int64(0)
	for i := range tasas {
		if tasas[i].EsGeneral {
			general = &tasas[i]
			continue
		}
		sumaTasas += tasas[i].TasaBps
	}
	if sumaTasas > 10000 {
		return nil, apperr.NewValidation("la suma de tasas supera 100% (10.000 bps)")
	}
	if general == nil {
		return nil, apperr.NewValidation("se requiere la cuenta General para absorber el residuo")
	}

	out := make([]TransaccionCalculada, 0, len(tasas))
	sumaOtras := int64(0)
	for _, t := range tasas {
		if t.EsGeneral {
			continue
		}
		raw, err := rawCents(pagoCents, t.TasaBps)
		if err != nil {
			return nil, err
		}
		monto := aplicarModo(raw, modo)
		sumaOtras += monto
		out = append(out, TransaccionCalculada{CuentaID: t.CuentaID, Alias: t.Alias, TasaBps: t.TasaBps, Monto: monto})
	}

	generalMonto := pagoCents - sumaOtras
	if generalMonto < 0 {
		return nil, apperr.NewValidation("las cuotas superan el monto del pago; reduzca las tasas")
	}
	out = append(out, TransaccionCalculada{CuentaID: general.CuentaID, Alias: general.Alias, TasaBps: 0, Monto: generalMonto})

	return out, nil
}

// TransaccionRecalculo describe el estado actual de una transacción para
// recalcular pendientes (BR-061).
type TransaccionRecalculo struct {
	ID        int64
	CuentaID  int64
	Alias     string
	TasaBps   int64
	Monto     int64
	Realizado bool
	EsGeneral bool
}

// ResultadoRecalculo contiene el mapa de montos nuevos por transacción.
type ResultadoRecalculo struct {
	Indice map[int64]TransaccionCalculada
	Suma   int64
}

// Recalcular aplica tasas vigentes a las pendientes (BR-060/061):
//   - Realizadas quedan congeladas (no se tocan).
//   - Pendientes ≠ General: monto = tasa_vigente × pago completo (modo del split).
//   - Pendiente General: absorbe remaining − Σ(cuotas) (interp. B).
//   - Si el residuo es negativo → inmutable (422).
//   - Siempre Σ transacciones = monto del pago (BR-081).
func Recalcular(pagoCents int64, modo string, txns []TransaccionRecalculo, tasasVigentes map[int64]int64) (*ResultadoRecalculo, error) {
	if !slices.Contains(ModosValidos, modo) {
		return nil, apperr.NewValidation("modo de cálculo inválido: " + modo)
	}
	indice := map[int64]TransaccionCalculada{}
	var frozenSum int64
	var pendGeneral []TransaccionRecalculo

	for _, t := range txns {
		if t.Realizado {
			frozenSum += t.Monto
			continue
		}
		if t.EsGeneral {
			pendGeneral = append(pendGeneral, t)
			continue
		}
		tasa, ok := tasasVigentes[t.CuentaID]
		if !ok {
			return nil, apperr.NewConflict(fmt.Sprintf(
				"la cuenta %d (alias %q) no tiene tasa vigente; defina su tasa primero", t.CuentaID, t.Alias))
		}
		raw, err := rawCents(pagoCents, tasa)
		if err != nil {
			return nil, err
		}
		monto := aplicarModo(raw, modo)
		indice[t.ID] = TransaccionCalculada{CuentaID: t.CuentaID, Alias: t.Alias, TasaBps: tasa, Monto: monto}
	}

	remaining := pagoCents - frozenSum
	var sumCuotas int64
	for _, tc := range indice {
		sumCuotas += tc.Monto
	}

	switch len(pendGeneral) {
	case 0:
		if sumCuotas != remaining {
			return nil, apperr.NewConflict("sin cuenta General pendiente las cuotas no cuadran con el monto del pago")
		}
	case 1:
		gral := pendGeneral[0]
		gralMonto := remaining - sumCuotas
		if gralMonto < 0 {
			return nil, apperr.NewImmutable("el monto restante no alcanza para cubrir las cuotas recalculadas")
		}
		indice[gral.ID] = TransaccionCalculada{
			CuentaID: gral.CuentaID, Alias: gral.Alias, TasaBps: gral.TasaBps, Monto: gralMonto,
		}
	default:
		return nil, apperr.NewConflict("hay más de una transacción General pendiente; revise la configuración")
	}

	var suma int64
	for _, tc := range indice {
		suma += tc.Monto
	}
	if suma+frozenSum != pagoCents {
		return nil, apperr.NewInternal(fmt.Sprintf("recalculo no cuadra: %d + %d != %d", suma, frozenSum, pagoCents))
	}
	return &ResultadoRecalculo{Indice: indice, Suma: suma}, nil
}