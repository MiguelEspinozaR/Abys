package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DashboardRepo agrega métricas para las 4 vistas del dashboard.
type DashboardRepo struct {
	pool *pgxpool.Pool
}

func NewDashboardRepo(pool *pgxpool.Pool) *DashboardRepo { return &DashboardRepo{pool: pool} }

// Summary es el resumen de un mes (F-001, BR-084: solo pagos activos).
type Summary struct {
	TotalCentavos    int64 `json:"total_centavos"`
	CantidadPagos    int64 `json:"cantidad_pagos"`
	DiasTrabajados   int64 `json:"dias_trabajados"`
}

func (r *DashboardRepo) Summary(ctx context.Context, mes, anio int) (*Summary, error) {
	var s Summary
	// Total y cantidad de pagos del mes (fecha_pago en el mes).
	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(monto_enteros),0), count(*)
		FROM pagos
		WHERE deleted_at IS NULL
		  AND EXTRACT(YEAR FROM fecha_pago) = $1
		  AND EXTRACT(MONTH FROM fecha_pago) = $2`,
		anio, mes).Scan(&s.TotalCentavos, &s.CantidadPagos); err != nil {
		return nil, err
	}
	// Días trabajados del mes (fecha del día en el mes, pago activo).
	if err := r.pool.QueryRow(ctx, `
		SELECT count(DISTINCT d.fecha)
		FROM dias_trabajados d
		JOIN pagos p ON p.id = d.pago_id AND p.deleted_at IS NULL
		WHERE EXTRACT(YEAR FROM d.fecha) = $1
		  AND EXTRACT(MONTH FROM d.fecha) = $2`,
		anio, mes).Scan(&s.DiasTrabajados); err != nil {
		return nil, err
	}
	return &s, nil
}

// DiaIngreso es el total por fecha para la vista semanal/diaria.
type DiaIngreso struct {
	Fecha         string `json:"fecha"`
	TotalCentavos int64  `json:"total_centavos"`
	CantidadPagos int64  `json:"cantidad_pagos"`
}

// Semana devuelve los ingresos de la semana que contiene fecha (lunes a domingo).
func (r *DashboardRepo) Semana(ctx context.Context, lunes, domingo string) ([]DiaIngreso, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT fecha_pago::text, SUM(monto_enteros), count(*)
		FROM pagos
		WHERE deleted_at IS NULL AND fecha_pago BETWEEN $1 AND $2
		GROUP BY fecha_pago ORDER BY fecha_pago`, lunes, domingo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []DiaIngreso{}
	for rows.Next() {
		var d DiaIngreso
		if err := rows.Scan(&d.Fecha, &d.TotalCentavos, &d.CantidadPagos); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// MesPorSemana agrupa el mes en semanas de 7 días desde el día 1.
type SemanaIngreso struct {
	Semana        int    `json:"semana"`
	Inicio        string `json:"inicio"`
	Fin           string `json:"fin"`
	TotalCentavos int64  `json:"total_centavos"`
	CantidadPagos int64  `json:"cantidad_pagos"`
}

func (r *DashboardRepo) MesPorSemana(ctx context.Context, inicioMes, finMes string) ([]SemanaIngreso, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT to_char(fecha_pago, 'YYYY-MM-DD'),
		       (EXTRACT(DAY FROM fecha_pago)::int - 1) / 7 + 1,
		       SUM(monto_enteros), count(*)
		FROM pagos
		WHERE deleted_at IS NULL AND fecha_pago BETWEEN $1 AND $2
		GROUP BY fecha_pago ORDER BY fecha_pago`, inicioMes, finMes)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	semanas := map[int]*SemanaIngreso{}
	orden := []int{}
	for rows.Next() {
		var fecha string
		var semana int
		var s SemanaIngreso
		if err := rows.Scan(&fecha, &semana, &s.TotalCentavos, &s.CantidadPagos); err != nil {
			return nil, err
		}
		if _, ok := semanas[semana]; !ok {
			semana := semana
			semanas[semana] = &SemanaIngreso{Semana: semana}
			orden = append(orden, semana)
		}
		// acumular
		semanas[semana].TotalCentavos += s.TotalCentavos
		semanas[semana].CantidadPagos += s.CantidadPagos
	}
	out := make([]SemanaIngreso, 0, len(orden))
	for _, s := range orden {
		out = append(out, *semanas[s])
	}
	return out, rows.Err()
}

// MesIngreso es el total por mes del año.
type MesIngreso struct {
	Mes           int    `json:"mes"`
	TotalCentavos int64  `json:"total_centavos"`
	CantidadPagos int64  `json:"cantidad_pagos"`
}

func (r *DashboardRepo) Anio(ctx context.Context, anio int) ([]MesIngreso, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT EXTRACT(MONTH FROM fecha_pago)::int, SUM(monto_enteros), count(*)
		FROM pagos
		WHERE deleted_at IS NULL AND EXTRACT(YEAR FROM fecha_pago) = $1
		GROUP BY 1 ORDER BY 1`, anio)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MesIngreso{}
	for rows.Next() {
		var m MesIngreso
		if err := rows.Scan(&m.Mes, &m.TotalCentavos, &m.CantidadPagos); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// PuntoHistorial es un total mensual para la vista histórica.
type PuntoHistorial struct {
	Anio          int    `json:"anio"`
	Mes           int    `json:"mes"`
	TotalCentavos int64  `json:"total_centavos"`
	CantidadPagos int64  `json:"cantidad_pagos"`
}

func (r *DashboardRepo) Historial(ctx context.Context) ([]PuntoHistorial, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT EXTRACT(YEAR FROM fecha_pago)::int, EXTRACT(MONTH FROM fecha_pago)::int,
		       SUM(monto_enteros), count(*)
		FROM pagos
		WHERE deleted_at IS NULL
		GROUP BY 1, 2 ORDER BY 1, 2`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []PuntoHistorial{}
	for rows.Next() {
		var p PuntoHistorial
		if err := rows.Scan(&p.Anio, &p.Mes, &p.TotalCentavos, &p.CantidadPagos); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}