package service

import (
	"context"
	"fmt"

	"abys/internal/apperr"
	"abys/internal/model"
	"abys/internal/repository"
	"abys/internal/splitcalc"
)

// PagoService orquesta CRUD de pagos con validaciones BR-001..BR-007.
type PagoService struct {
	repo     *repository.PagoRepo
	fuentes  *repository.FuenteRepo
	settings *repository.SettingsRepo
	split    *SplitService
}

func NewPagoService(repo *repository.PagoRepo, fuentes *repository.FuenteRepo,
	settings *repository.SettingsRepo, split *SplitService) *PagoService {
	return &PagoService{repo: repo, fuentes: fuentes, settings: settings, split: split}
}

// CrearPago valida y persiste un pago con sus días trabajados. El total del
// pago se deriva de Σ días; si el cliente envía un total > 0 que no cuadra se
// rechaza con 422 (R3.2).
func (s *PagoService) CrearPago(ctx context.Context, pagoID *int64, fuenteID int64, fechaPago string,
	montoCliente int64, metodo string, notas *string, dias []model.DiaTrabajadoInput) (int64, error) {
	if err := ValidarMontoPago(montoCliente); err != nil {
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
	derivado := SumarMontoDias(dias)
	if err := validarTotalCliente(montoCliente, derivado); err != nil {
		return 0, err
	}
	existe, err := s.repo.ExisteFuente(ctx, fuenteID)
	if err != nil {
		return 0, err
	}
	if !existe {
		return 0, apperr.NewValidation("la fuente indicada no existe")
	}
	return s.repo.Crear(ctx, pagoID, fuenteID, fechaPago, derivado, metodo, notas, dias)
}

// validarTotalCliente exige que un total provisto (> 0) coincida con Σ días.
// Un total 0/ausente significa "no provisto" y se acepta (R3.2).
func validarTotalCliente(montoCliente, derivado int64) error {
	if montoCliente > 0 && montoCliente != derivado {
		return apperr.NewUnprocessable(fmt.Sprintf(
			"el total enviado (%d) no coincide con la suma de los días (%d)",
			montoCliente, derivado))
	}
	return nil
}

// AutoSplit genera un split automático tras crear un pago cuando la fuente
// tiene la opción activa. Devuelve el id del split (nil si no aplica) y una
// advertencia si estaba configurado pero no pudo generarse (p. ej. sin cuenta
// General o tasas inválidas), sin impedir la creación del pago.
func (s *PagoService) AutoSplit(ctx context.Context, pagoID, fuenteID int64) (*int64, string) {
	if s.fuentes == nil || s.split == nil {
		return nil, ""
	}
	f, err := s.fuentes.GetPorID(ctx, fuenteID)
	if err != nil || f == nil || !f.SplitAuto {
		return nil, ""
	}
	modo := ""
	if f.SplitAutoModo != nil {
		modo = *f.SplitAutoModo
	}
	if modo == "" && s.settings != nil {
		if v, ok, err := s.settings.Get(ctx, repository.SettingSplitModoDefault); err == nil && ok {
			modo = v
		}
	}
	if modo == "" {
		modo = splitcalc.ModoPreciso
	}
	id, err := s.split.Generar(ctx, pagoID, modo)
	if err != nil {
		return nil, "el pago se guardó pero no se pudo generar el split automático: " + err.Error()
	}
	return &id, ""
}

// ActualizarPago valida y actualiza un pago. El total del pago se deriva de
// Σ días (o se conserva si los días no vienen en el request); un total del
// cliente > 0 que no cuadra se rechaza con 422. No permite cambiar el monto
// derivado si el pago tiene split (para no romper Σ transacciones = monto,
// BR-081). Si dias != nil reemplaza los días trabajados (puede ser lista vacía
// solo si viene explícita; la validación exige ≥ 1).
func (s *PagoService) ActualizarPago(ctx context.Context, id, fuenteID int64, fechaPago string,
	montoCliente int64, metodo string, notas *string, dias []model.DiaTrabajadoInput, diasSet bool) error {
	if err := ValidarMontoPago(montoCliente); err != nil {
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

	derivado := actual.MontoEnteros
	if diasSet {
		if err := ValidarDiasTrabajados(dias); err != nil {
			return err
		}
		derivado = SumarMontoDias(dias)
	}
	if err := validarTotalCliente(montoCliente, derivado); err != nil {
		return err
	}

	if actual.MontoEnteros != derivado {
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
	return s.repo.ActualizarConDias(ctx, id, fuenteID, fechaPago, derivado, metodo, notas, dias, diasSet)
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

// AgregarDia agrega un día trabajado con su monto validando duplicado
// (BR-006/010) y recalcula el total del pago.
func (s *PagoService) AgregarDia(ctx context.Context, pagoID int64, fecha string, monto int64) error {
	if err := ValidarFechaPago(fecha); err != nil {
		return err
	}
	if monto < 0 {
		return apperr.NewValidation("el monto del día no puede ser negativo")
	}
	return s.repo.AddDia(ctx, pagoID, fecha, monto)
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
