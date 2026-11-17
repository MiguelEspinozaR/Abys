package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DashboardRepo agrega métricas del dashboard a partir de días trabajados.
//
// Todas las consultas agrupan por dias_trabajados.fecha, unen pagos activos
// (p.deleted_at IS NULL) y fuentes incluyendo soft-deleted (sin filtro en
// f.deleted_at) para preservar alias/color históricos (R11.3/D15).
type DashboardRepo struct {
	pool *pgxpool.Pool
}

func NewDashboardRepo(pool *pgxpool.Pool) *DashboardRepo { return &DashboardRepo{pool: pool} }

const dashboardJoin = `
	FROM dias_trabajados d
	JOIN pagos p ON p.id = d.pago_id AND p.deleted_at IS NULL
	JOIN fuentes f ON f.id = p.fuente_id`

// ResumenTotales contiene los totales de 30 días y el histórico completo.
type ResumenTotales struct {
	Total30dCentavos       int64
	TotalHistoricoCentavos int64
}

// Resumen suma los días en [desde, hasta] y el histórico completo.
func (r *DashboardRepo) Resumen(ctx context.Context, desde, hasta string) (ResumenTotales, error) {
	var out ResumenTotales
	err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN d.fecha BETWEEN $1 AND $2 THEN d.monto_enteros ELSE 0 END), 0),
			COALESCE(SUM(d.monto_enteros), 0)`+dashboardJoin,
		desde, hasta).Scan(&out.Total30dCentavos, &out.TotalHistoricoCentavos)
	return out, err
}

// DiaFuenteTotal es el total de un día desglosado por fuente.
type DiaFuenteTotal struct {
	Fecha         string
	FuenteID      int64
	Alias         string
	Color         string
	TotalCentavos int64
}

// SemanaPorFuente devuelve los totales por fecha y fuente en [inicio, fin].
func (r *DashboardRepo) SemanaPorFuente(ctx context.Context, inicio, fin string) ([]DiaFuenteTotal, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT d.fecha::text, f.id, f.alias, f.color, SUM(d.monto_enteros)`+dashboardJoin+`
		WHERE d.fecha BETWEEN $1 AND $2
		GROUP BY d.fecha, f.id, f.alias, f.color
		ORDER BY d.fecha, SUM(d.monto_enteros) DESC, f.id`, inicio, fin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []DiaFuenteTotal{}
	for rows.Next() {
		var d DiaFuenteTotal
		if err := rows.Scan(&d.Fecha, &d.FuenteID, &d.Alias, &d.Color, &d.TotalCentavos); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// BloqueTotal es el total de un bloque de días del mes (1–7, 8–14, ...).
type BloqueTotal struct {
	Bloque        int
	TotalCentavos int64
}

// BloquesMes agrupa los días de [inicio, fin] en bloques de 7 días.
func (r *DashboardRepo) BloquesMes(ctx context.Context, inicio, fin string) ([]BloqueTotal, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT ((EXTRACT(DAY FROM d.fecha)::int - 1) / 7 + 1) AS bloque,
		       SUM(d.monto_enteros)`+dashboardJoin+`
		WHERE d.fecha BETWEEN $1 AND $2
		GROUP BY 1 ORDER BY 1`, inicio, fin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []BloqueTotal{}
	for rows.Next() {
		var b BloqueTotal
		if err := rows.Scan(&b.Bloque, &b.TotalCentavos); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// MesTotal es el total de un mes del año.
type MesTotal struct {
	Mes           int
	TotalCentavos int64
}

// AnioTotales agrupa por mes los días de [inicio, fin] (rango de un año).
func (r *DashboardRepo) AnioTotales(ctx context.Context, inicio, fin string) ([]MesTotal, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT EXTRACT(MONTH FROM d.fecha)::int, SUM(d.monto_enteros)`+dashboardJoin+`
		WHERE d.fecha BETWEEN $1 AND $2
		GROUP BY 1 ORDER BY 1`, inicio, fin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MesTotal{}
	for rows.Next() {
		var m MesTotal
		if err := rows.Scan(&m.Mes, &m.TotalCentavos); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// PuntoHistorial es un total mensual para la vista histórica (sin tendencia).
type PuntoHistorial struct {
	Anio          int   `json:"anio"`
	Mes           int   `json:"mes"`
	TotalCentavos int64 `json:"total_centavos"`
}

// HistorialMeses devuelve los totales mensuales de todo el histórico.
func (r *DashboardRepo) HistorialMeses(ctx context.Context) ([]PuntoHistorial, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT EXTRACT(YEAR FROM d.fecha)::int, EXTRACT(MONTH FROM d.fecha)::int,
		       SUM(d.monto_enteros)`+dashboardJoin+`
		GROUP BY 1, 2 ORDER BY 1, 2`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PuntoHistorial{}
	for rows.Next() {
		var p PuntoHistorial
		if err := rows.Scan(&p.Anio, &p.Mes, &p.TotalCentavos); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// FuenteTotal es el total de una fuente en un período.
type FuenteTotal struct {
	FuenteID      int64  `json:"fuente_id"`
	Alias         string `json:"alias"`
	Color         string `json:"color"`
	TotalCentavos int64  `json:"total_centavos"`
}

// Distribucion agrupa los días de [inicio, fin] por fuente (incluye fuentes
// soft-deleted). Orden: total desc, fuente_id.
func (r *DashboardRepo) Distribucion(ctx context.Context, inicio, fin string) ([]FuenteTotal, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT f.id, f.alias, f.color, SUM(d.monto_enteros)`+dashboardJoin+`
		WHERE d.fecha BETWEEN $1 AND $2
		GROUP BY f.id, f.alias, f.color
		ORDER BY SUM(d.monto_enteros) DESC, f.id`, inicio, fin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []FuenteTotal{}
	for rows.Next() {
		var f FuenteTotal
		if err := rows.Scan(&f.FuenteID, &f.Alias, &f.Color, &f.TotalCentavos); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}
