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

// CuentaRepo persiste cuentas, historial de tasas y QR.
type CuentaRepo struct {
	pool *pgxpool.Pool
}

func NewCuentaRepo(pool *pgxpool.Pool) *CuentaRepo { return &CuentaRepo{pool: pool} }

const colCuentas = `id, alias, numero, banco, qr_ruta, es_general, created_at, updated_at, deleted_at`

func scanCuenta(row pgx.Row) (*model.Cuenta, error) {
	var c model.Cuenta
	err := row.Scan(&c.ID, &c.Alias, &c.Numero, &c.Banco, &c.QRRuta, &c.EsGeneral,
		&c.CreatedAt, &c.UpdatedAt, &c.DeletedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// Crear inserta una cuenta activa (nunca General por defecto).
func (r *CuentaRepo) Crear(ctx context.Context, c model.Cuenta) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO cuentas (alias, numero, banco, qr_ruta, es_general)
		VALUES ($1, $2, $3, $4, FALSE) RETURNING id`,
		c.Alias, c.Numero, c.Banco, c.QRRuta).Scan(&id)
	if err != nil {
		return 0, apperr.NewValidation("no se pudo crear la cuenta: " + err.Error())
	}
	return id, nil
}

// GetPorID devuelve una cuenta activa o nil.
func (r *CuentaRepo) GetPorID(ctx context.Context, id int64) (*model.Cuenta, error) {
	c, err := scanCuenta(r.pool.QueryRow(ctx,
		`SELECT `+colCuentas+` FROM cuentas WHERE id = $1 AND deleted_at IS NULL`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

// GetGeneral devuelve la cuenta General activa.
func (r *CuentaRepo) GetGeneral(ctx context.Context) (*model.Cuenta, error) {
	c, err := scanCuenta(r.pool.QueryRow(ctx,
		`SELECT `+colCuentas+` FROM cuentas WHERE es_general AND deleted_at IS NULL ORDER BY id LIMIT 1`))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return c, err
}

// Listar devuelve cuentas activas con su tasa vigente (BR-084).
func (r *CuentaRepo) Listar(ctx context.Context) ([]model.Cuenta, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+colCuentas+` FROM cuentas WHERE deleted_at IS NULL ORDER BY es_general DESC, alias`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.Cuenta{}
	for rows.Next() {
		c, err := scanCuenta(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// Actualizar modifica alias/numero/banco de una cuenta activa.
func (r *CuentaRepo) Actualizar(ctx context.Context, c model.Cuenta) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE cuentas SET alias=$1, numero=$2, banco=$3, updated_at=NOW()
		 WHERE id=$4 AND deleted_at IS NULL`,
		c.Alias, c.Numero, c.Banco, c.ID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("cuenta %d no encontrada", c.ID))
	}
	return nil
}

// SoftDelete marca deleted_at; General y cuentas con escrita transacciones
// realizadas se rechazan a nivel servicio. Snapshots históricos se conservan (BR-043).
func (r *CuentaRepo) SoftDelete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE cuentas SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("cuenta %d no encontrada", id))
	}
	return nil
}

// SetQR / ClearQR gestionan la ruta del QR.
func (r *CuentaRepo) SetQR(ctx context.Context, id int64, ruta string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE cuentas SET qr_ruta=$1, updated_at=NOW() WHERE id=$2 AND deleted_at IS NULL`, ruta, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("cuenta %d no encontrada", id))
	}
	return nil
}

func (r *CuentaRepo) ClearQR(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE cuentas SET qr_ruta=NULL, updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("cuenta %d no encontrada", id))
	}
	return nil
}

// TasaVigente devuelve el último registro de historial de la cuenta.
func (r *CuentaRepo) TasaVigente(ctx context.Context, cuentaID int64) (int64, error) {
	var bps int64
	err := r.pool.QueryRow(ctx, `
		SELECT tasa_bps FROM historial_tasas
		WHERE cuenta_id = $1
		ORDER BY aplicada_desde DESC, id DESC
		LIMIT 1`, cuentaID).Scan(&bps)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return bps, err
}

// HistorialTasas lista el historial de una cuenta (BR-050).
func (r *CuentaRepo) HistorialTasas(ctx context.Context, cuentaID int64) ([]model.HistorialTasa, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, cuenta_id, tasa_bps, aplicada_desde, created_at
		FROM historial_tasas WHERE cuenta_id = $1
		ORDER BY aplicada_desde DESC, id DESC`, cuentaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.HistorialTasa{}
	for rows.Next() {
		var h model.HistorialTasa
		if err := rows.Scan(&h.ID, &h.CuentaID, &h.TasaBps, &h.AplicadaDesde, &h.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

// InsertHistorial registra una nueva tasa (BR-050: vigente = última).
func (r *CuentaRepo) InsertHistorial(ctx context.Context, cuentaID, tasaBps int64, aplicadaDesde string) error {
	if aplicadaDesde == "" {
		_, err := r.pool.Exec(ctx,
			`INSERT INTO historial_tasas (cuenta_id, tasa_bps) VALUES ($1, $2)`, cuentaID, tasaBps)
		return err
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO historial_tasas (cuenta_id, tasa_bps, aplicada_desde) VALUES ($1, $2, $3)`,
		cuentaID, tasaBps, aplicadaDesde)
	return err
}

// TasasVigentesActivas devuelve las cuentas activas ≠ General con su tasa vigente.
func (r *CuentaRepo) TasasVigentesActivas(ctx context.Context) (map[int64]int64, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT ON (c.id) c.id, h.tasa_bps
		FROM cuentas c
		JOIN historial_tasas h ON h.cuenta_id = c.id
		WHERE c.deleted_at IS NULL AND NOT c.es_general
		ORDER BY c.id, h.aplicada_desde DESC, h.id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64]int64{}
	for rows.Next() {
		var id, bps int64
		if err := rows.Scan(&id, &bps); err != nil {
			return nil, err
		}
		out[id] = bps
	}
	return out, rows.Err()
}