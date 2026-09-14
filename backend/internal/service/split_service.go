package service

import (
	"context"
	"slices"

	"abys/internal/apperr"
	"abys/internal/repository"
	"abys/internal/splitcalc"
)

// SplitService orquesta splits y transacciones (BR-030..036, BR-060/061).
type SplitService struct {
	splitRepo  *repository.SplitRepo
	pagoRepo   *repository.PagoRepo
	cuentaRepo *repository.CuentaRepo
}

func NewSplitService(sr *repository.SplitRepo, pr *repository.PagoRepo, cr *repository.CuentaRepo) *SplitService {
	return &SplitService{splitRepo: sr, pagoRepo: pr, cuentaRepo: cr}
}

// tasasActivas arma []splitcalc.TasaCuenta con General y activas para splitcalc.CalcularSplit.
func (s *SplitService) tasasActivas(ctx context.Context) ([]splitcalc.TasaCuenta, error) {
	general, err := s.cuentaRepo.GetGeneral(ctx)
	if err != nil {
		return nil, err
	}
	cuentas, err := s.cuentaRepo.Listar(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]splitcalc.TasaCuenta, 0, len(cuentas))
	for _, c := range cuentas {
		tc := splitcalc.TasaCuenta{CuentaID: c.ID, Alias: c.Alias, EsGeneral: c.EsGeneral}
		if !c.EsGeneral {
			bps, err := s.cuentaRepo.TasaVigente(ctx, c.ID)
			if err != nil {
				return nil, err
			}
			tc.TasaBps = bps
		}
		out = append(out, tc)
	}
	if general == nil {
		return nil, apperr.NewConflict("no hay cuenta General configurada")
	}
	return out, nil
}

// Generar crea un split atómico para un pago (BR-031/032).
func (s *SplitService) Generar(ctx context.Context, pagoID int64, modo string) (int64, error) {
	if !slices.Contains(splitcalc.ModosValidos, modo) {
		return 0, apperr.NewValidation("modo de cálculo inválido: " + modo)
	}
	pago, err := s.pagoRepo.GetPorID(ctx, pagoID)
	if err != nil {
		return 0, err
	}
	if pago == nil {
		return 0, apperr.NewNotFound("pago no encontrado")
	}
	conSplit, err := s.pagoRepo.HasSplit(ctx, pagoID)
	if err != nil {
		return 0, err
	}
	if conSplit {
		return 0, apperr.NewConflict("el pago ya tiene un split (máximo 1 por pago)")
	}
	tasas, err := s.tasasActivas(ctx)
	if err != nil {
		return 0, err
	}
	txs, err := splitcalc.CalcularSplit(pago.MontoEnteros, tasas, modo)
	if err != nil {
		return 0, err
	}
	return s.splitRepo.CrearAtomico(ctx, pagoID, modo, txs)
}

// Eliminar borra el split; rechaza si alguna transacción está realizada (BR-036).
func (s *SplitService) Eliminar(ctx context.Context, splitID int64) error {
	_, txs, err := s.splitRepo.GetPorID(ctx, splitID)
	if err != nil {
		return err
	}
	for _, t := range txs {
		if t.Realizado {
			return apperr.NewConflict("no se puede eliminar un split con transacciones realizadas")
		}
	}
	return s.splitRepo.Delete(ctx, splitID)
}

// MarcarTransaccionRealizada congela la transacción (BR-072).
func (s *SplitService) MarcarTransaccionRealizada(ctx context.Context, txID int64) error {
	return s.splitRepo.MarcarRealizada(ctx, txID)
}

// Recalcular aplica las tasas vigentes a las transacciones pendientes (BR-061).
func (s *SplitService) Recalcular(ctx context.Context, splitID int64) error {
	split, txs, err := s.splitRepo.GetPorID(ctx, splitID)
	if err != nil {
		return err
	}
	pago, err := s.pagoRepo.GetPorID(ctx, split.PagoID)
	if err != nil {
		return err
	}
	if pago == nil {
		return apperr.NewNotFound("el pago del split no existe")
	}
	vigentes, err := s.cuentaRepo.TasasVigentesActivas(ctx)
	if err != nil {
		return err
	}

	rec := make([]splitcalc.TransaccionRecalculo, 0, len(txs))
	for _, t := range txs {
		esGral := t.CuentaID != nil && esGeneralID(ctx, s, *t.CuentaID)
		rec = append(rec, splitcalc.TransaccionRecalculo{
			ID: t.ID, CuentaID: deref(t.CuentaID), Alias: t.AliasSnapshot,
			TasaBps: t.TasaBps, Monto: t.MontoEnteros, Realizado: t.Realizado, EsGeneral: esGral,
		})
	}
	res, err := splitcalc.Recalcular(pago.MontoEnteros, split.ModoCalculo, rec, vigentes)
	if err != nil {
		return err
	}
	return s.splitRepo.ActualizarPendientes(ctx, splitID, res.Indice)
}

// AplicarPendientes recalcula todos los splits con pendientes tras un cambio
// de tasa (BR-051/061). Toda la operación es atómica en una transacción global (BR-012).
func (s *SplitService) AplicarPendientes(ctx context.Context) (int, error) {
	splits, err := s.splitRepo.SplitsConPendientes(ctx)
	if err != nil {
		return 0, err
	}
	vigentes, err := s.cuentaRepo.TasasVigentesActivas(ctx)
	if err != nil {
		return 0, err
	}

	// Obtener la cuenta General una vez para evitar N+1 (F-006).
	general, err := s.cuentaRepo.GetGeneral(ctx)
	if err != nil {
		return 0, err
	}
	if general == nil {
		return 0, apperr.NewConflict("no hay cuenta General configurada")
	}

	// Se valida primero TODO el conjunto antes de escribir nada (operación única).
	type plan struct {
		splitID int64
		indice  map[int64]splitcalc.TransaccionCalculada
	}
	planes := make([]plan, 0, len(splits))
	for _, sp := range splits {
		rec := make([]splitcalc.TransaccionRecalculo, 0, len(sp.Txs))
		for _, t := range sp.Txs {
			esGral := t.CuentaID != nil && general.ID == *t.CuentaID
			rec = append(rec, splitcalc.TransaccionRecalculo{
				ID: t.ID, CuentaID: deref(t.CuentaID), Alias: t.AliasSnapshot,
				TasaBps: t.TasaBps, Monto: t.MontoEnteros, Realizado: t.Realizado, EsGeneral: esGral,
			})
		}
		res, err := splitcalc.Recalcular(sp.Pago.MontoEnteros, sp.Split.ModoCalculo, rec, vigentes)
		if err != nil {
			return 0, err
		}
		planes = append(planes, plan{splitID: sp.Split.ID, indice: res.Indice})
	}

	// Aplicar todos los planes en una única transacción global (BR-012).
	tx, err := s.splitRepo.BeginTx(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	conteo := 0
	for _, pl := range planes {
		if err := s.splitRepo.ActualizarPendientesTx(ctx, tx, pl.splitID, pl.indice); err != nil {
			return 0, err
		}
		conteo++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return conteo, nil
}

func deref(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}

func esGeneralID(ctx context.Context, s *SplitService, cuentaID int64) bool {
	g, err := s.cuentaRepo.GetGeneral(ctx)
	if err != nil || g == nil {
		return false
	}
	return g.ID == cuentaID
}