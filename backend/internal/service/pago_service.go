package service

import (
	"context"

	"abys/internal/apperr"
	"abys/internal/repository"
)

// PagoService orquesta CRUD de pagos con validaciones BR-001..BR-007.
type PagoService struct {
	repo *repository.PagoRepo
}

func NewPagoService(repo *repository.PagoRepo) *PagoService { return &PagoService{repo: repo} }

// CrearPago valida y persiste un pago con sus días trabajados.
func (s *PagoService) CrearPago(ctx context.Context, pagoID *int64, fuenteID int64, fechaPago string,
	monto int64, metodo string, notas *string, dias []string) (int64, error) {
	if err := ValidarMontoPago(monto); err != nil {
		return 0, err
	}
	if err := ValidarFechaPago(fechaPago); err != nil {
		return 0, err
	}
	if err := ValidarMetodoPago(metodo); err != nil {
		return 0, err
	}
	if err := ValidarDiasTrabajados(dias); err != nil {
		return 0, err
	}
	existe, err := s.repo.ExisteFuente(ctx, fuenteID)
	if err != nil {
		return 0, err
	}
	if !existe {
		return 0, apperr.NewValidation("la fuente indicada no existe")
	}
	return s.repo.Crear(ctx, pagoID, fuenteID, fechaPago, monto, metodo, notas, dias)
}

// ActualizarPago valida y actualiza un pago. No permite cambiar el monto si el
// pago tiene split (para no romper Σ transacciones = monto, BR-081). Si
// dias != nil reemplaza los días trabajados (puede ser lista vacía solo si
// viene explícita; la validación exige ≥ 1).
func (s *PagoService) ActualizarPago(ctx context.Context, id, fuenteID int64, fechaPago string,
	monto int64, metodo string, notas *string, dias []string, diasSet bool) error {
	if err := ValidarMontoPago(monto); err != nil {
		return err
	}
	if err := ValidarFechaPago(fechaPago); err != nil {
		return err
	}
	if err := ValidarMetodoPago(metodo); err != nil {
		return err
	}

	actual, err := s.repo.GetPorID(ctx, id)
	if err != nil {
		return err
	}
	if actual == nil {
		return apperr.NewNotFound("pago no encontrado")
	}
	if actual.MontoEnteros != monto {
		conSplit, err := s.repo.HasSplit(ctx, id)
		if err != nil {
			return err
		}
		if conSplit {
			return apperr.NewImmutable("no se puede cambiar el monto de un pago con split; elimina o recalcula el split primero")
		}
	}
	if actual.FuenteID != fuenteID {
		existe, err := s.repo.ExisteFuente(ctx, fuenteID)
		if err != nil {
			return err
		}
		if !existe {
			return apperr.NewValidation("la fuente indicada no existe")
		}
	}
	if diasSet {
		if err := ValidarDiasTrabajados(dias); err != nil {
			return err
		}
	}
	return s.repo.ActualizarConDias(ctx, id, fuenteID, fechaPago, monto, metodo, notas, dias, diasSet)
}

// EliminarPago aplica soft delete; rechaza si hay transacciones realizadas (BR-005).
func (s *PagoService) EliminarPago(ctx context.Context, id int64) error {
	realizadas, err := s.repo.HasTransaccionesRealizadas(ctx, id)
	if err != nil {
		return err
	}
	if realizadas {
		return apperr.NewConflict("no se puede eliminar un pago con transacciones realizadas")
	}
	return s.repo.SoftDelete(ctx, id)
}

// AgregarDia agrega un día trabajado validando duplicado (BR-006/010).
func (s *PagoService) AgregarDia(ctx context.Context, pagoID int64, fecha string) error {
	if err := ValidarFechaPago(fecha); err != nil {
		return err
	}
	return s.repo.AddDia(ctx, pagoID, fecha)
}

// EliminarDia elimina un día manteniendo ≥ 1 (BR-002).
func (s *PagoService) EliminarDia(ctx context.Context, pagoID, diaID int64) error {
	n, err := s.repo.CountDias(ctx, pagoID)
	if err != nil {
		return err
	}
	if n <= 1 {
		return apperr.NewValidation("un pago debe mantener al menos un día trabajado")
	}
	return s.repo.DeleteDia(ctx, pagoID, diaID)
}

// SubirComprobante actualiza la ruta de imagen del pago.
func (s *PagoService) SubirComprobante(ctx context.Context, pagoID int64, ruta string) error {
	return s.repo.SetImagenRuta(ctx, pagoID, ruta)
}

// Listar delega al repo con filtros.
func (s *PagoService) Listar(ctx context.Context, f repository.FiltroPagos) ([]repository.PagoDetallado, int64, error) {
	return s.repo.Listar(ctx, f)
}

// Detalle delega al repo.
func (s *PagoService) Detalle(ctx context.Context, id int64) (*repository.PagoDetallado, error) {
	return s.repo.GetDetallado(ctx, id)
}