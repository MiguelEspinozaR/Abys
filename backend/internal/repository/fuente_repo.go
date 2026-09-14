package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"abys/internal/apperr"
	"abys/internal/model"
)

// FuenteRepo persiste fuentes de ingreso (BR-020).
type FuenteRepo struct {
	pool *pgxpool.Pool
}

func NewFuenteRepo(pool *pgxpool.Pool) *FuenteRepo { return &FuenteRepo{pool: pool} }

const colFuentes = `id, alias, color, logo_ruta, created_at, updated_at, deleted_at`

func scanFuente(row pgx.Row) (*model.Fuente, error) {
	var f model.Fuente
	err := row.Scan(&f.ID, &f.Alias, &f.Color, &f.LogoRuta, &f.CreatedAt, &f.UpdatedAt, &f.DeletedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

// Crear inserta una fuente activa.
func (r *FuenteRepo) Crear(ctx context.Context, f model.Fuente) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO fuentes (alias, color, logo_ruta) VALUES ($1, $2, $3) RETURNING id`,
		f.Alias, f.Color, f.LogoRuta).Scan(&id)
	if err != nil {
		return 0, apperr.NewValidation("no se pudo crear la fuente: " + err.Error())
	}
	return id, nil
}

// GetPorID devuelve una fuente activa o nil.
func (r *FuenteRepo) GetPorID(ctx context.Context, id int64) (*model.Fuente, error) {
	f, err := scanFuente(r.pool.QueryRow(ctx,
		`SELECT `+colFuentes+` FROM fuentes WHERE id = $1 AND deleted_at IS NULL`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return f, nil
}

// Listar devuelve fuentes activas (BR-084: excluye soft-deleted).
func (r *FuenteRepo) Listar(ctx context.Context) ([]model.Fuente, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+colFuentes+` FROM fuentes WHERE deleted_at IS NULL ORDER BY alias`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.Fuente{}
	for rows.Next() {
		f, err := scanFuente(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *f)
	}
	return out, rows.Err()
}

// Actualizar modifica una fuente activa.
func (r *FuenteRepo) Actualizar(ctx context.Context, f model.Fuente) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE fuentes SET alias=$1, color=$2, logo_ruta=$3, updated_at=NOW()
		 WHERE id=$4 AND deleted_at IS NULL`,
		f.Alias, f.Color, f.LogoRuta, f.ID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("fuente %d no encontrada", f.ID))
	}
	return nil
}

// SoftDelete marca deleted_at (BR-084); pagos históricos conservan referencia.
func (r *FuenteRepo) SoftDelete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE fuentes SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("fuente %d no encontrada", id))
	}
	return nil
}