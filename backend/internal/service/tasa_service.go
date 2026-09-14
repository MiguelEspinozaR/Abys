package service

import (
	"context"

	"abys/internal/apperr"
	"abys/internal/repository"
)

// TasaService gestiona cambios de tasa con historial y aplicar-pendientes.
type TasaService struct {
	cuentaRepo *repository.CuentaRepo
	splitSvc   *SplitService
}

func NewTasaService(cr *repository.CuentaRepo, ss *SplitService) *TasaService {
	return &TasaService{cuentaRepo: cr, splitSvc: ss}
}

// CambiarTasa valida Σ ≤ 100%, registra historial (BR-050) y, si
// aplicarPendientes, recalcula pendientes (BR-051/061).
//
// tasaPorcentaje llega en % (ej. 20.5) y se convierte a bps (2050).
func (s *TasaService) CambiarTasa(ctx context.Context, cuentaID int64, tasaPorcentaje float64, aplicarPendientes bool) (*CambioTasaResultado, error) {
	if tasaPorcentaje < 0 || tasaPorcentaje > 100 {
		return nil, apperr.NewValidation("la tasa debe estar entre 0 y 100")
	}
	cuenta, err := s.cuentaRepo.GetPorID(ctx, cuentaID)
	if err != nil {
		return nil, err
	}
	if cuenta == nil {
		return nil, apperr.NewNotFound("cuenta no encontrada")
	}
	if cuenta.EsGeneral {
		return nil, apperr.NewValidation("la tasa de la cuenta General es derivada (100% − Σ otras) y no es configurable")
	}

	bps := int64(roundFloat(tasaPorcentaje * 100)) // 20.5% → 2050 bps

	// Σ tasas vigentes (otras cuentas ≠ esta) + nueva tasa ≤ 10000 (BR-041).
	vigentes, err := s.cuentaRepo.TasasVigentesActivas(ctx)
	if err != nil {
		return nil, err
	}
	suma := bps
	for id, v := range vigentes {
		if id != cuentaID {
			suma += v
		}
	}
	if suma > 10000 {
		return nil, apperr.NewConflict("la suma de tasas superaría 100%")
	}

	resultado := &CambioTasaResultado{TasaBps: bps}

	// Primero registrar la nueva tasa en el historial, para que las
	// tasas vigentes incluyan la nueva al recalcular pendientes (BR-061).
	if err := s.cuentaRepo.InsertHistorial(ctx, cuentaID, bps, ""); err != nil {
		return nil, err
	}
	resultado.Registrado = true

	// Luego recalcular pendientes con las tasas vigentes actualizadas.
	conteo := 0
	if aplicarPendientes {
		conteo, err = s.splitSvc.AplicarPendientes(ctx)
		if err != nil {
			return nil, err
		}
		resultado.SplitsRecalculados = conteo
	}

	return resultado, nil
}

// CambioTasaResultado resume la operación.
type CambioTasaResultado struct {
	TasaBps            int64 `json:"tasa_bps"`
	SplitsRecalculados int   `json:"splits_recalculados"`
	Registrado         bool  `json:"registrado"`
}

// CalcularTasaGeneral deriva la tasa de General = 10000 − Σ(vigentes otras) (BR-040).
func (s *TasaService) CalcularTasaGeneral(ctx context.Context) (int64, error) {
	vigentes, err := s.cuentaRepo.TasasVigentesActivas(ctx)
	if err != nil {
		return 0, err
	}
	suma := int64(0)
	for _, v := range vigentes {
		suma += v
	}
	gral := 10000 - suma
	if gral < 0 {
		return 0, apperr.NewConflict("la suma de tasas vigentes supera 100%")
	}
	return gral, nil
}

func roundFloat(f float64) float64 {
	if f < 0 {
		return -roundFloat(-f)
	}
	return float64(int64(f + 0.5))
}