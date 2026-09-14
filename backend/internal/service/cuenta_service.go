package service

import (
	"context"

	"abys/internal/apperr"
	"abys/internal/model"
	"abys/internal/repository"
)

// FuenteService orquesta el CRUD de fuentes (BR-020, BR-084).
type FuenteService struct {
	repo *repository.FuenteRepo
}

func NewFuenteService(repo *repository.FuenteRepo) *FuenteService { return &FuenteService{repo: repo} }

func (s *FuenteService) Crear(ctx context.Context, f model.Fuente) (int64, error) {
	if f.Alias == "" {
		return 0, apperr.NewValidation("el alias de la fuente es obligatorio")
	}
	return s.repo.Crear(ctx, f)
}

func (s *FuenteService) Listar(ctx context.Context) ([]model.Fuente, error) {
	return s.repo.Listar(ctx)
}

func (s *FuenteService) Actualizar(ctx context.Context, f model.Fuente) error {
	if f.Alias == "" {
		return apperr.NewValidation("el alias de la fuente es obligatorio")
	}
	return s.repo.Actualizar(ctx, f)
}

func (s *FuenteService) Eliminar(ctx context.Context, id int64) error {
	return s.repo.SoftDelete(ctx, id)
}

func (s *FuenteService) Detalle(ctx context.Context, id int64) (*model.Fuente, error) {
	f, err := s.repo.GetPorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if f == nil {
		return nil, apperr.NewNotFound("fuente no encontrada")
	}
	return f, nil
}

// CuentaService orquesta el CRUD de cuentas (BR-040..BR-043, BR-084).
type CuentaService struct {
	repo *repository.CuentaRepo
}

func NewCuentaService(repo *repository.CuentaRepo) *CuentaService {
	return &CuentaService{repo: repo}
}

func (s *CuentaService) Crear(ctx context.Context, c model.Cuenta) (int64, error) {
	if c.Alias == "" {
		return 0, apperr.NewValidation("el alias de la cuenta es obligatorio")
	}
	return s.repo.Crear(ctx, c)
}

func (s *CuentaService) Listar(ctx context.Context) ([]model.Cuenta, error) {
	return s.repo.Listar(ctx)
}

func (s *CuentaService) Actualizar(ctx context.Context, c model.Cuenta) error {
	if c.Alias == "" {
		return apperr.NewValidation("el alias de la cuenta es obligatorio")
	}
	return s.repo.Actualizar(ctx, c)
}

func (s *CuentaService) Eliminar(ctx context.Context, id int64) error {
	g, err := s.repo.GetGeneral(ctx)
	if err != nil {
		return err
	}
	if g != nil && g.ID == id {
		return apperr.NewConflict("la cuenta General no puede eliminarse")
	}
	return s.repo.SoftDelete(ctx, id)
}

func (s *CuentaService) Detalle(ctx context.Context, id int64) (*model.Cuenta, error) {
	c, err := s.repo.GetPorID(ctx, id)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, apperr.NewNotFound("cuenta no encontrada")
	}
	return c, nil
}