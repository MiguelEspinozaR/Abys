package service

import (
	"context"
	"time"

	"abys/internal/apperr"
	"abys/internal/repository"
)

const fechaLayout = "2006-01-02"

// dashboardReader define las agregaciones que consume el servicio. Permite
// testear el formateo de períodos sin base de datos.
type dashboardReader interface {
	Resumen(ctx context.Context, desde, hasta string) (repository.ResumenTotales, error)
	SemanaPorFuente(ctx context.Context, inicio, fin string) ([]repository.DiaFuenteTotal, error)
	BloquesMes(ctx context.Context, inicio, fin string) ([]repository.BloqueTotal, error)
	AnioTotales(ctx context.Context, inicio, fin string) ([]repository.MesTotal, error)
	HistorialMeses(ctx context.Context) ([]repository.PuntoHistorial, error)
	Distribucion(ctx context.Context, inicio, fin string) ([]repository.FuenteTotal, error)
}

// DashboardService da forma a las vistas del dashboard (montos en centavos,
// agrupados por dias_trabajados.fecha).
type DashboardService struct {
	repo dashboardReader
}

func NewDashboardService(repo dashboardReader) *DashboardService {
	return &DashboardService{repo: repo}
}

// SummaryResultado son los totales de 30 días y el histórico completo.
type SummaryResultado struct {
	Total30dCentavos       int64 `json:"total_30d_centavos"`
	TotalHistoricoCentavos int64 `json:"total_historico_centavos"`
}

// Summary calcula Σ días de los últimos 30 días calendario (La Paz) y el total
// histórico.
func (s *DashboardService) Summary(ctx context.Context) (*SummaryResultado, error) {
	desde, hasta := rangoUltimos30(time.Now())
	totales, err := s.repo.Resumen(ctx, desde, hasta)
	if err != nil {
		return nil, err
	}
	return &SummaryResultado{
		Total30dCentavos:       totales.Total30dCentavos,
		TotalHistoricoCentavos: totales.TotalHistoricoCentavos,
	}, nil
}

// DiaConFuentes es el total de un día con su desglose por fuente.
type DiaConFuentes struct {
	Fecha         string                   `json:"fecha"`
	TotalCentavos int64                    `json:"total_centavos"`
	PorFuente     []repository.FuenteTotal `json:"por_fuente"`
}

// WeeklyResultado es la vista semanal (lunes a domingo, 7 días).
type WeeklyResultado struct {
	SemanaInicio string          `json:"semana_inicio"`
	SemanaFin    string          `json:"semana_fin"`
	Dias         []DiaConFuentes `json:"dias"`
}

// Weekly devuelve la semana ISO que contiene fecha, con 7 días rellenados.
func (s *DashboardService) Weekly(ctx context.Context, fecha string) (*WeeklyResultado, error) {
	lunes, domingo, err := rangoSemana(fecha)
	if err != nil {
		return nil, err
	}
	filas, err := s.repo.SemanaPorFuente(ctx, lunes.Format(fechaLayout), domingo.Format(fechaLayout))
	if err != nil {
		return nil, err
	}
	porFecha := map[string][]repository.FuenteTotal{}
	for _, f := range filas {
		porFecha[f.Fecha] = append(porFecha[f.Fecha], repository.FuenteTotal{
			FuenteID: f.FuenteID, Alias: f.Alias, Color: f.Color, TotalCentavos: f.TotalCentavos,
		})
	}
	dias := make([]DiaConFuentes, 0, 7)
	for i := 0; i < 7; i++ {
		f := lunes.AddDate(0, 0, i).Format(fechaLayout)
		fuentes := porFecha[f]
		if fuentes == nil {
			fuentes = []repository.FuenteTotal{}
		}
		var total int64
		for _, ff := range fuentes {
			total += ff.TotalCentavos
		}
		dias = append(dias, DiaConFuentes{Fecha: f, TotalCentavos: total, PorFuente: fuentes})
	}
	return &WeeklyResultado{
		SemanaInicio: lunes.Format(fechaLayout),
		SemanaFin:    domingo.Format(fechaLayout),
		Dias:         dias,
	}, nil
}

// BloqueResultado es un bloque de días del mes (1–7, 8–14, ...).
type BloqueResultado struct {
	Bloque        int    `json:"bloque"`
	Inicio        string `json:"inicio"`
	Fin           string `json:"fin"`
	TotalCentavos int64  `json:"total_centavos"`
}

// MonthlyResultado es la vista mensual por bloques del mes.
type MonthlyResultado struct {
	Mes     int               `json:"mes"`
	Anio    int               `json:"anio"`
	Bloques []BloqueResultado `json:"bloques"`
}

// Monthly devuelve los bloques 1–7, 8–14, 15–21, 22–28 y 29–fin del mes.
func (s *DashboardService) Monthly(ctx context.Context, mes, anio int) (*MonthlyResultado, error) {
	loc := LaPaz()
	inicioMes := time.Date(anio, time.Month(mes), 1, 0, 0, 0, 0, loc)
	finMes := inicioMes.AddDate(0, 1, -1)

	filas, err := s.repo.BloquesMes(ctx, inicioMes.Format(fechaLayout), finMes.Format(fechaLayout))
	if err != nil {
		return nil, err
	}
	porBloque := map[int]int64{}
	for _, b := range filas {
		porBloque[b.Bloque] = b.TotalCentavos
	}
	rangos := bloquesDelMes(anio, mes)
	bloques := make([]BloqueResultado, 0, len(rangos))
	for _, r := range rangos {
		bloques = append(bloques, BloqueResultado{
			Bloque:        r.Bloque,
			Inicio:        r.Inicio.Format(fechaLayout),
			Fin:           r.Fin.Format(fechaLayout),
			TotalCentavos: porBloque[r.Bloque],
		})
	}
	return &MonthlyResultado{Mes: mes, Anio: anio, Bloques: bloques}, nil
}

// MesResultado es el total de un mes del año.
type MesResultado struct {
	Mes           int   `json:"mes"`
	TotalCentavos int64 `json:"total_centavos"`
}

// YearlyResultado es la vista anual por mes (12 meses).
type YearlyResultado struct {
	Anio  int            `json:"anio"`
	Meses []MesResultado `json:"meses"`
}

// Yearly devuelve los 12 meses del año, con 0 en los vacíos.
func (s *DashboardService) Yearly(ctx context.Context, anio int) (*YearlyResultado, error) {
	loc := LaPaz()
	inicio := time.Date(anio, time.January, 1, 0, 0, 0, 0, loc)
	fin := time.Date(anio, time.December, 31, 0, 0, 0, 0, loc)

	filas, err := s.repo.AnioTotales(ctx, inicio.Format(fechaLayout), fin.Format(fechaLayout))
	if err != nil {
		return nil, err
	}
	porMes := map[int]int64{}
	for _, m := range filas {
		porMes[m.Mes] = m.TotalCentavos
	}
	meses := make([]MesResultado, 0, 12)
	for i := 1; i <= 12; i++ {
		meses = append(meses, MesResultado{Mes: i, TotalCentavos: porMes[i]})
	}
	return &YearlyResultado{Anio: anio, Meses: meses}, nil
}

// HistoryResultado es el histórico mensual completo.
type HistoryResultado struct {
	PorMes []repository.PuntoHistorial `json:"por_mes"`
}

// History devuelve los totales mensuales de todo el histórico.
func (s *DashboardService) History(ctx context.Context) (*HistoryResultado, error) {
	puntos, err := s.repo.HistorialMeses(ctx)
	if err != nil {
		return nil, err
	}
	if puntos == nil {
		puntos = []repository.PuntoHistorial{}
	}
	return &HistoryResultado{PorMes: puntos}, nil
}

// DistributionMonthlyResultado es la distribución del mes por fuente.
type DistributionMonthlyResultado struct {
	Mes           int                      `json:"mes"`
	Anio          int                      `json:"anio"`
	TotalCentavos int64                    `json:"total_centavos"`
	PorFuente     []repository.FuenteTotal `json:"por_fuente"`
}

// DistributionMonthly devuelve la distribución por fuente del mes.
func (s *DashboardService) DistributionMonthly(ctx context.Context, mes, anio int) (*DistributionMonthlyResultado, error) {
	loc := LaPaz()
	inicio := time.Date(anio, time.Month(mes), 1, 0, 0, 0, 0, loc)
	fin := inicio.AddDate(0, 1, -1)
	fuentes, err := s.repo.Distribucion(ctx, inicio.Format(fechaLayout), fin.Format(fechaLayout))
	if err != nil {
		return nil, err
	}
	return &DistributionMonthlyResultado{
		Mes: mes, Anio: anio, TotalCentavos: sumarFuentes(fuentes), PorFuente: fuentesNoNulas(fuentes),
	}, nil
}

// DistributionYearlyResultado es la distribución del año por fuente.
type DistributionYearlyResultado struct {
	Anio          int                      `json:"anio"`
	TotalCentavos int64                    `json:"total_centavos"`
	PorFuente     []repository.FuenteTotal `json:"por_fuente"`
}

// DistributionYearly devuelve la distribución por fuente del año.
func (s *DashboardService) DistributionYearly(ctx context.Context, anio int) (*DistributionYearlyResultado, error) {
	loc := LaPaz()
	inicio := time.Date(anio, time.January, 1, 0, 0, 0, 0, loc)
	fin := time.Date(anio, time.December, 31, 0, 0, 0, 0, loc)
	fuentes, err := s.repo.Distribucion(ctx, inicio.Format(fechaLayout), fin.Format(fechaLayout))
	if err != nil {
		return nil, err
	}
	return &DistributionYearlyResultado{
		Anio: anio, TotalCentavos: sumarFuentes(fuentes), PorFuente: fuentesNoNulas(fuentes),
	}, nil
}

// rangoSemana devuelve lunes y domingo (ISO) de la semana que contiene fecha.
func rangoSemana(fecha string) (time.Time, time.Time, error) {
	loc := LaPaz()
	d, err := time.ParseInLocation(fechaLayout, fecha, loc)
	if err != nil || d.Format(fechaLayout) != fecha {
		return time.Time{}, time.Time{}, apperr.NewValidation("fecha inválida: " + fecha)
	}
	offset := (int(d.Weekday()) + 6) % 7 // Dom=0 → 6
	lunes := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, loc).AddDate(0, 0, -offset)
	return lunes, lunes.AddDate(0, 0, 6), nil
}

// rangoUltimos30 devuelve el rango [hoy-29d, hoy] en America/La_Paz.
func rangoUltimos30(hoy time.Time) (string, string) {
	loc := LaPaz()
	h := hoy.In(loc)
	hoyFecha := time.Date(h.Year(), h.Month(), h.Day(), 0, 0, 0, 0, loc)
	return hoyFecha.AddDate(0, 0, -29).Format(fechaLayout), hoyFecha.Format(fechaLayout)
}

type rangoBloque struct {
	Bloque int
	Inicio time.Time
	Fin    time.Time
}

// bloquesDelMes calcula los bloques del mes: 1–7, 8–14, 15–21, 22–28 y
// 29–fin (este último solo si el mes tiene día 29 o más).
func bloquesDelMes(anio, mes int) []rangoBloque {
	loc := LaPaz()
	inicioMes := time.Date(anio, time.Month(mes), 1, 0, 0, 0, 0, loc)
	finMes := inicioMes.AddDate(0, 1, -1)
	out := make([]rangoBloque, 0, 5)
	for i := 0; i < 4; i++ {
		inicio := inicioMes.AddDate(0, 0, i*7)
		out = append(out, rangoBloque{
			Bloque: i + 1,
			Inicio: inicio,
			Fin:    inicio.AddDate(0, 0, 6),
		})
	}
	if finMes.Day() >= 29 {
		inicio := time.Date(anio, time.Month(mes), 29, 0, 0, 0, 0, loc)
		out = append(out, rangoBloque{Bloque: 5, Inicio: inicio, Fin: finMes})
	}
	return out
}

func sumarFuentes(fuentes []repository.FuenteTotal) int64 {
	var total int64
	for _, f := range fuentes {
		total += f.TotalCentavos
	}
	return total
}

func fuentesNoNulas(fuentes []repository.FuenteTotal) []repository.FuenteTotal {
	if fuentes == nil {
		return []repository.FuenteTotal{}
	}
	return fuentes
}
