package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// HealthRepo provee métricas de salud de la DB (F-006). NO ejecuta SQL arbitrario.
type HealthRepo struct {
	pool *pgxpool.Pool
}

func NewHealthRepo(pool *pgxpool.Pool) *HealthRepo { return &HealthRepo{pool: pool} }

// TablaInfo es un conteo de registros por tabla.
type TablaInfo struct {
	Nombre   string `json:"nombre"`
	Registros int64 `json:"registros"`
}

// HealthInfo agrega los datos del health checker.
type HealthInfo struct {
	Conexion  string      `json:"conexion"` // ok | error
	LatenciaMS float64    `json:"latencia_ms"`
	VersionPG string      `json:"version_pg"`
	TamanoDB  string      `json:"tamano_db"`
	Tablas    []TablaInfo `json:"tablas"`
}

// Check ejecuta un ping con latencia, versión, tamaño y conteo de tablas.
func (r *HealthRepo) Check(ctx context.Context) HealthInfo {
	info := HealthInfo{Conexion: "error", Tablas: []TablaInfo{}}
	start := time.Now()
	if err := r.pool.Ping(ctx); err != nil {
		return info
	}
	info.LatenciaMS = float64(time.Since(start).Microseconds()) / 1000.0
	info.Conexion = "ok"

	_ = r.pool.QueryRow(ctx, `SHOW server_version`).Scan(&info.VersionPG)
	_ = r.pool.QueryRow(ctx, `
		SELECT pg_size_pretty(pg_database_size(current_database()))`).Scan(&info.TamanoDB)

	tablas := []string{"fuentes", "pagos", "dias_trabajados", "cuentas", "historial_tasas", "splits", "transacciones"}
	for _, t := range tablas {
		var n int64
		if err := r.pool.QueryRow(ctx,
			`SELECT count(*) FROM `+t).Scan(&n); err == nil {
			info.Tablas = append(info.Tablas, TablaInfo{Nombre: t, Registros: n})
		}
	}
	return info
}