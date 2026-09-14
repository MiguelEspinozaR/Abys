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

// PagoRepo persiste pagos y sus días trabajados.
type PagoRepo struct {
	pool *pgxpool.Pool
}

func NewPagoRepo(pool *pgxpool.Pool) *PagoRepo { return &PagoRepo{pool: pool} }

// PagoDetallado es la vista de un pago para la API.
type PagoDetallado struct {
	model.Pago
	FuenteAlias    string               `json:"fuente_alias"`
	FuenteColor    string               `json:"fuente_color"`
	DiasTrabajados []model.DiaTrabajado `json:"dias_trabajados"`
	SplitID        *int64               `json:"split_id,omitempty"`
	SplitModo      *string              `json:"split_modo,omitempty"`
}

var colPagos = `p.id, p.fuente_id, p.fecha_pago::text, p.monto_enteros, p.metodo_pago,
	p.notas, p.imagen_ruta, p.created_at, p.updated_at, p.deleted_at`

func scanPago(row pgx.Row) (*model.Pago, error) {
	var p model.Pago
	err := row.Scan(&p.ID, &p.FuenteID, &p.FechaPago, &p.MontoEnteros, &p.MetodoPago,
		&p.Notas, &p.ImagenRuta, &p.CreatedAt, &p.UpdatedAt, &p.DeletedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func scanPagoDetallado(row pgx.Row) (*PagoDetallado, error) {
	var d PagoDetallado
	err := row.Scan(&d.ID, &d.FuenteID, &d.FechaPago, &d.MontoEnteros, &d.MetodoPago,
		&d.Notas, &d.ImagenRuta, &d.CreatedAt, &d.UpdatedAt, &d.DeletedAt,
		&d.FuenteAlias, &d.FuenteColor, &d.SplitID, &d.SplitModo)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// FiltroPagos parametriza el listado.
type FiltroPagos struct {
	FechaInicio *string
	FechaFin    *string
	FuenteID    *int64
	MetodoPago  *string
	Page        int
	PageSize    int
}

// Crear inserta un pago y sus días trabajados atómicamente.
// pagoID nil → deja que el DB asigne id.
func (r *PagoRepo) Crear(ctx context.Context, pagoID *int64, fuenteID int64, fechaPago string,
	monto int64, metodo string, notas *string, dias []string) (int64, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var id int64
	if pagoID != nil {
		err = tx.QueryRow(ctx, `
			INSERT INTO pagos (id, fuente_id, fecha_pago, monto_enteros, metodo_pago, notas)
			VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
			*pagoID, fuenteID, fechaPago, monto, metodo, notas).Scan(&id)
	} else {
		err = tx.QueryRow(ctx, `
			INSERT INTO pagos (fuente_id, fecha_pago, monto_enteros, metodo_pago, notas)
			VALUES ($1, $2, $3, $4, $5) RETURNING id`,
			fuenteID, fechaPago, monto, metodo, notas).Scan(&id)
	}
	if err != nil {
		return 0, mapPagoErr(err)
	}
	for _, f := range dias {
		if _, err := tx.Exec(ctx,
			`INSERT INTO dias_trabajados (pago_id, fecha) VALUES ($1, $2)`, id, f); err != nil {
			return 0, mapPagoErr(err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return id, nil
}

// ActualizarConDias actualiza campos y, si diasSet, reemplaza los días
// trabajados dentro de la misma transacción.
func (r *PagoRepo) ActualizarConDias(ctx context.Context, id, fuenteID int64, fechaPago string,
	monto int64, metodo string, notas *string, dias []string, diasSet bool) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE pagos SET fuente_id=$1, fecha_pago=$2, monto_enteros=$3, metodo_pago=$4,
		       notas=$5, updated_at=NOW()
		WHERE id=$6 AND deleted_at IS NULL`,
		fuenteID, fechaPago, monto, metodo, notas, id)
	if err != nil {
		return mapPagoErr(err)
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("pago %d no encontrado", id))
	}
	if diasSet {
		if _, err := tx.Exec(ctx, `DELETE FROM dias_trabajados WHERE pago_id = $1`, id); err != nil {
			return err
		}
		for _, f := range dias {
			if _, err := tx.Exec(ctx,
				`INSERT INTO dias_trabajados (pago_id, fecha) VALUES ($1, $2)`, id, f); err != nil {
				return mapPagoErr(err)
			}
		}
	}
	return tx.Commit(ctx)
}

// GetDetallado devuelve un pago activo con fuente, días y split.
func (r *PagoRepo) GetDetallado(ctx context.Context, id int64) (*PagoDetallado, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT `+colPagos+`,
		       f.alias, f.color,
		       s.id, s.modo_calculo
		FROM pagos p
		JOIN fuentes f ON f.id = p.fuente_id
		LEFT JOIN splits s ON s.pago_id = p.id
		WHERE p.id = $1 AND p.deleted_at IS NULL`, id)
	d, err := scanPagoDetallado(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, apperr.NewNotFound(fmt.Sprintf("pago %d no encontrado", id))
	}
	if err != nil {
		return nil, err
	}
	dias, err := r.diasDePago(ctx, id)
	if err != nil {
		return nil, err
	}
	d.DiasTrabajados = dias
	return d, nil
}

// GetPorID devuelve el pago activo (sin detalles) o nil si no existe.
func (r *PagoRepo) GetPorID(ctx context.Context, id int64) (*model.Pago, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+colPagos+` FROM pagos p WHERE p.id = $1 AND p.deleted_at IS NULL`, id)
	p, err := scanPago(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *PagoRepo) diasDePago(ctx context.Context, pagoID int64) ([]model.DiaTrabajado, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, pago_id, fecha::text FROM dias_trabajados WHERE pago_id = $1 ORDER BY fecha`, pagoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.DiaTrabajado{}
	for rows.Next() {
		var d model.DiaTrabajado
		if err := rows.Scan(&d.ID, &d.PagoID, &d.Fecha); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// Listar devuelve pagos activos con filtros y paginación.
func (r *PagoRepo) Listar(ctx context.Context, f FiltroPagos) ([]PagoDetallado, int64, error) {
	where := `p.deleted_at IS NULL`
	args := []any{}
	n := 1
	add := func(v any) string {
		args = append(args, v)
		n++
		return fmt.Sprintf("$%d", n-1)
	}
	if f.FechaInicio != nil {
		where += " AND p.fecha_pago >= " + add(*f.FechaInicio)
	}
	if f.FechaFin != nil {
		where += " AND p.fecha_pago <= " + add(*f.FechaFin)
	}
	if f.FuenteID != nil {
		where += " AND p.fuente_id = " + add(*f.FuenteID)
	}
	if f.MetodoPago != nil {
		where += " AND p.metodo_pago = " + add(*f.MetodoPago)
	}

	var total int64
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM pagos p WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	page, pageSize := f.Page, f.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	args = append(args, pageSize, (page-1)*pageSize)
	rows, err := r.pool.Query(ctx, `
		SELECT `+colPagos+`,
		       f.alias, f.color,
		       s.id, s.modo_calculo
		FROM pagos p
		JOIN fuentes f ON f.id = p.fuente_id
		LEFT JOIN splits s ON s.pago_id = p.id
		WHERE `+where+`
		ORDER BY p.fecha_pago DESC, p.id DESC
		LIMIT $`+fmt.Sprintf("%d", len(args)-1)+` OFFSET $`+fmt.Sprintf("%d", len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []PagoDetallado{}
	ids := []int64{}
	for rows.Next() {
		d, err := scanPagoDetallado(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *d)
		ids = append(ids, d.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	if len(out) == 0 {
		return out, total, nil
	}

	// Días de todos los pagos de la página (una sola consulta).
	dias, err := r.pool.Query(ctx,
		`SELECT id, pago_id, fecha::text FROM dias_trabajados WHERE pago_id = ANY($1) ORDER BY pago_id, fecha`,
		ids)
	if err != nil {
		return nil, 0, err
	}
	defer dias.Close()
	idx := map[int64]int{}
	for i := range out {
		idx[out[i].ID] = i
		out[i].DiasTrabajados = []model.DiaTrabajado{}
	}
	for dias.Next() {
		var d model.DiaTrabajado
		if err := dias.Scan(&d.ID, &d.PagoID, &d.Fecha); err != nil {
			return nil, 0, err
		}
		if i, ok := idx[d.PagoID]; ok {
			out[i].DiasTrabajados = append(out[i].DiasTrabajados, d)
		}
	}
	return out, total, dias.Err()
}

// SoftDelete marca deleted_at (BR-084). Valida BR-005 a nivel servicio.
func (r *PagoRepo) SoftDelete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE pagos SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("pago %d no encontrado", id))
	}
	return nil
}

// AddDia agrega un día trabajado (valida duplicado UNIQUE a nivel DB).
func (r *PagoRepo) AddDia(ctx context.Context, pagoID int64, fecha string) error {
	tag, err := r.pool.Exec(ctx,
		`INSERT INTO dias_trabajados (pago_id, fecha) VALUES ($1, $2)`, pagoID, fecha)
	if err != nil {
		return mapPagoErr(err)
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound("pago no encontrado")
	}
	return nil
}

// DeleteDia elimina un día; el servicio valida mantener ≥ 1 (BR-002).
func (r *PagoRepo) DeleteDia(ctx context.Context, pagoID, diaID int64) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM dias_trabajados WHERE id=$1 AND pago_id=$2`, diaID, pagoID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("día %d no encontrado en pago %d", diaID, pagoID))
	}
	return nil
}

// SetImagenRuta actualiza el comprobante del pago.
func (r *PagoRepo) SetImagenRuta(ctx context.Context, pagoID int64, ruta string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE pagos SET imagen_ruta=$1, updated_at=NOW() WHERE id=$2 AND deleted_at IS NULL`, ruta, pagoID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return apperr.NewNotFound(fmt.Sprintf("pago %d no encontrado", pagoID))
	}
	return nil
}

// HasTransaccionesRealizadas indica si el pago tiene realizadas (BR-005).
func (r *PagoRepo) HasTransaccionesRealizadas(ctx context.Context, pagoID int64) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM transacciones t JOIN splits s ON s.id = t.split_id
			WHERE s.pago_id = $1 AND t.realizado
		)`, pagoID).Scan(&ok)
	return ok, err
}

// HasSplit indica si el pago tiene split (0..1 por pago, BR-030/004).
func (r *PagoRepo) HasSplit(ctx context.Context, pagoID int64) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM splits WHERE pago_id = $1)`, pagoID).Scan(&ok)
	return ok, err
}

// CountDias cuenta los días trabajados de un pago.
func (r *PagoRepo) CountDias(ctx context.Context, pagoID int64) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM dias_trabajados WHERE pago_id = $1`, pagoID).Scan(&n)
	return n, err
}

// ExisteFuente verifica que la fuente referida exista y esté activa.
func (r *PagoRepo) ExisteFuente(ctx context.Context, fuenteID int64) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM fuentes WHERE id = $1 AND deleted_at IS NULL)`, fuenteID).Scan(&ok)
	return ok, err
}

func mapPagoErr(err error) error {
	if pgErr, ok := err.(interface{ SQLState() string }); ok {
		switch pgErr.SQLState() {
		case "23503":
			return apperr.NewValidation("referencia inválida (p. ej. fuente inexistente)")
		case "23505":
			return apperr.NewValidation("registro duplicado (fecha de trabajo repetida en el pago?)")
		case "23514":
			return apperr.NewValidation("valor fuera de rango permitido")
		}
	}
	return err
}