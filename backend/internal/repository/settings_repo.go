package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Claves conocidas de app_settings.
const (
	SettingSplitModoDefault = "split_modo_default"
)

// SettingsRepo persiste ajustes globales de la aplicación (clave/valor).
type SettingsRepo struct {
	pool *pgxpool.Pool
}

func NewSettingsRepo(pool *pgxpool.Pool) *SettingsRepo { return &SettingsRepo{pool: pool} }

// Get devuelve el valor de una clave; ok=false si no existe.
func (r *SettingsRepo) Get(ctx context.Context, clave string) (string, bool, error) {
	var valor string
	err := r.pool.QueryRow(ctx,
		`SELECT valor FROM app_settings WHERE clave = $1`, clave).Scan(&valor)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return valor, true, nil
}

// Set inserta o actualiza el valor de una clave.
func (r *SettingsRepo) Set(ctx context.Context, clave, valor string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO app_settings (clave, valor) VALUES ($1, $2)
		ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()`,
		clave, valor)
	return err
}
