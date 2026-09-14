package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"abys/internal/apperr"
	"abys/internal/model"
	"abys/internal/splitcalc"
)

// SplitRepo persiste splits y transacciones (BR-030..BR-036).
type SplitRepo struct {
	pool *pgxpool.Pool
}

func NewSplitRepo(pool *pgxpool.Pool) *SplitRepo { return &SplitRepo{pool: pool} }

// BeginTx inicia una transacción para operaciones multi-split (BR-012).
func (r *SplitRepo) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return r.pool.Begin(ctx)
}

const colSplits = `id, pago_id, modo_calculo, created_at, updated_at`

func scanSplit(row pgx.Row) (*model.Split, error) {
	var s model.Split
	err := row.Scan(&s.ID, &s.PagoID, &s.ModoCalculo, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

const colTransacciones = `id, split_id, cuenta_id, monto_enteros, tasa_bps, alias_snapshot,
	realizado, fecha_realizacion, created_at, updated_at`

func scanTransaccion(row pgx.Row) (*model.Transaccion, error) {
	var t model.Transaccion
	err := row.Scan(&t.ID, &t.SplitID, &t.CuentaID, &t.MontoEnteros, &t.TasaBps,
		&t.AliasSnapshot, &t.Realizado, &t.FechaRealizacion, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// CrearAtomico inserta split + transacciones en una transacción (BR-031).
// La suma de transacciones ya fue validada por el servicio (BR-081).
func (r *SplitRepo) CrearAtomico(ctx context.Context, pagoID int64, modo string, txs []splitcalc.TransaccionCalculada) (int64, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var splitID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO splits (pago_id, modo_calculo) VALUES ($1, $2) RETURNING id`,
		pagoID, modo).Scan(&splitID)
	if err != nil {
		return 0, mapSplitErr(err, pagoID)
	}
	for _, t := range txs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO transacciones (split_id, cuenta_id, monto_enteros, tasa_bps, alias_snapshot)
			VALUES ($1, $2, $3, $4, $5)`,
			splitID, t.CuentaID, t.Monto, t.TasaBps, t.Alias); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return splitID, nil
}

// GetPorID devuelve split con sus transacciones.
func (r *SplitRepo) GetPorID(ctx context.Context, id int64) (*model.Split, []model.Transaccion, error) {
	s, err := scanSplit(r.pool.QueryRow(ctx,
		`SELECT `+colSplits+` FROM splits WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, apperr.NewNotFound(fmt.Sprintf("split %d no encontrado", id))
	}
	if err != nil {
		return nil, nil, err
	}
	txs, err := r.TransaccionesPorSplit(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	return s, txs, nil
}

// GetPorPagoID devuelve el split de un pago (0..1, BR-030).
func (r *SplitRepo) GetPorPagoID(ctx context.Context, pagoID int64) (*model.Split, []model.Transaccion, error) {
	s, err := scanSplit(r.pool.QueryRow(ctx,
		`SELECT `+colSplits+` FROM splits WHERE pago_id = $1`, pagoID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	txs, err := r.TransaccionesPorSplit(ctx, s.ID)
	if err != nil {
		return nil, nil, err
	}
	return s, txs, nil
}

// Listar devuelve todos los splits con sus transacciones.
func (r *SplitRepo) Listar(ctx context.Context) ([]model.Split, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+colSplits+` FROM splits ORDER BY created_at DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.Split{}
	for rows.Next() {
		s, err := scanSplit(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *s)
	}
	return out, rows.Err()
}

// TransaccionesPorSplit lista las transacciones de un split.
func (r *SplitRepo) TransaccionesPorSplit(ctx context.Context, splitID int64) ([]model.Transaccion, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+colTransacciones+` FROM transacciones WHERE split_id = $1
		 ORDER BY CASE WHEN alias_snapshot = 'General' THEN 1 ELSE 0 END, id`, splitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.Transaccion{}
	for rows.Next() {
		t, err := scanTransaccion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

// ListarTransacciones lista transacciones con filtros opcionales.
func (r *SplitRepo) ListarTransacciones(ctx context.Context, splitID, cuentaID *int64, realizado *bool) ([]model.Transaccion, error) {
	q := `SELECT ` + colTransacciones + ` FROM transacciones WHERE TRUE`
	args := []any{}
	n := 1
	add := func(v any) string {
		args = append(args, v)
		n++
		return fmt.Sprintf("$%d", n-1)
	}
	if splitID != nil {
		q += " AND split_id = " + add(*splitID)
	}
	if cuentaID != nil {
		q += " AND cuenta_id = " + add(*cuentaID)
	}
	if realizado != nil {
		q += " AND realizado = " + add(*realizado)
	}
	q += " ORDER BY id"
	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.Transaccion{}
	for rows.Next() {
		t, err := scanTransaccion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

// MarcarRealizada congela la transacción (BR-072): solo setea realizado + fecha.
func (r *SplitRepo) MarcarRealizada(ctx context.Context, txID int64) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE transacciones SET realizado = TRUE, fecha_realizacion = NOW(), updated_at = NOW()
		WHERE id = $1 AND NOT realizado`, txID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		// Ya estaba realizada → idempotente.
		var existe bool
		if err := r.pool.QueryRow(ctx,
			`SELECT EXISTS (SELECT 1 FROM transacciones WHERE id = $1 AND realizado)`, txID).Scan(&existe); err != nil {
			return err
		}
		if existe {
			return nil
		}
		return apperr.NewNotFound(fmt.Sprintf("transacción %d no encontrada", txID))
	}
	return nil
}

// DeleteEliminaPendientes elimina el split; el servicio valida que no haya
// realizadas antes (BR-036). El cascade borra las transacciones.
func (r *SplitRepo) Delete(ctx context.Context, splitID int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM splits WHERE id = $1`, splitID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("split %d no encontrado", splitID))
	}
	return nil
}

// ActualizarPendientes aplica montos/tasas nuevos a transacciones pendientes
// dentro de una transacción (BR-060/061). Solo toca filas pendientes.
func (r *SplitRepo) ActualizarPendientes(ctx context.Context, splitID int64, porID map[int64]splitcalc.TransaccionCalculada) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := r.ActualizarPendientesTx(ctx, tx, splitID, porID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// ActualizarPendientesTx aplica montos/tasas nuevos a transacciones pendientes
// usando una transacción existente (para AplicarPendientes atómico multi-split, BR-012).
func (r *SplitRepo) ActualizarPendientesTx(ctx context.Context, tx pgx.Tx, splitID int64, porID map[int64]splitcalc.TransaccionCalculada) error {
	for txID, tc := range porID {
		tag, err := tx.Exec(ctx, `
			UPDATE transacciones SET monto_enteros = $1, tasa_bps = $2, updated_at = NOW()
			WHERE id = $3 AND split_id = $4 AND NOT realizado`,
			tc.Monto, tc.TasaBps, txID, splitID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return apperr.NewImmutable("no se puede modificar una transacción realizada")
		}
	}
	tag, err := tx.Exec(ctx, `UPDATE splits SET updated_at = NOW() WHERE id = $1`, splitID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound("split no encontrado")
	}
	return nil
}

// SplitsConPendientes devuelve splits que tienen al menos una transacción
// pendiente (para aplicar tasas vigentes, BR-051).
type SplitConPendientes struct {
	Split  model.Split
	Pago   model.Pago
	Txs    []model.Transaccion
}

func (r *SplitRepo) SplitsConPendientes(ctx context.Context) ([]SplitConPendientes, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT s.id, s.pago_id, s.modo_calculo, s.created_at, s.updated_at,
		       p.id, p.fuente_id, p.fecha_pago::text, p.monto_enteros, p.metodo_pago,
		       p.notas, p.imagen_ruta, p.created_at, p.updated_at, p.deleted_at
		FROM splits s
		JOIN pagos p ON p.id = s.pago_id
		JOIN transacciones t ON t.split_id = s.id AND NOT t.realizado
		WHERE p.deleted_at IS NULL
		ORDER BY s.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SplitConPendientes{}
	for rows.Next() {
		var sp SplitConPendientes
		err := rows.Scan(&sp.Split.ID, &sp.Split.PagoID, &sp.Split.ModoCalculo, &sp.Split.CreatedAt, &sp.Split.UpdatedAt,
			&sp.Pago.ID, &sp.Pago.FuenteID, &sp.Pago.FechaPago, &sp.Pago.MontoEnteros, &sp.Pago.MetodoPago,
			&sp.Pago.Notas, &sp.Pago.ImagenRuta, &sp.Pago.CreatedAt, &sp.Pago.UpdatedAt, &sp.Pago.DeletedAt)
		if err != nil {
			return nil, err
		}
		out = append(out, sp)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range out {
		txs, err := r.TransaccionesPorSplit(ctx, out[i].Split.ID)
		if err != nil {
			return nil, err
		}
		out[i].Txs = txs
	}
	return out, nil
}

func mapSplitErr(err error, pagoID int64) error {
	if pgErr, ok := err.(interface{ SQLState() string }); ok {
		switch pgErr.SQLState() {
		case "23505":
			return apperr.NewConflict(fmt.Sprintf("el pago %d ya tiene un split (0..1 por pago)", pagoID))
		case "23503":
			return apperr.NewValidation("pago inexistente al crear el split")
		}
	}
	return err
}