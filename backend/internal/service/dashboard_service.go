package service

import (
	"context"
	"time"

	"abys/internal/apperr"
	"abys/internal/repository"
)

// DashboardService da forma a las 4 vistas del dashboard.
type DashboardService struct {
	repo *repository.DashboardRepo
}

func NewDashboardService(repo *repository.DashboardRepo) *DashboardService {
	return &DashboardService{repo: repo}
}

// SummaryResultado agrega la vista summary de un mes.
type SummaryResultado struct {
	Mes            int   `json:"mes"`
	Anio           int   `json:"anio"`
	TotalCentavos  int64 `json:"total_centavos"`
	CantidadPagos  int64 `json:"cantidad_pagos"`
	DiasTrabajados int64 `json:"dias_trabajados"`
}

func (s *DashboardService) Summary(ctx context.Context, mes, anio int) (*SummaryResultado, error) {
	sum, err := s.repo.Summary(ctx, mes, anio)
	if err != nil {
		return nil, err
	}
	return &SummaryResultado{
		Mes: mes, Anio: anio,
		TotalCentavos: sum.TotalCentavos, CantidadPagos: sum.CantidadPagos,
		DiasTrabajados: sum.DiasTrabajados,
	}, nil
}

// WeeklyResultado agrega la vista semanal (7 días, lunes a domingo).
type WeeklyResultado struct {
	SemanaInicio string                 `json:"semana_inicio"`
	SemanaFin    string                 `json:"semana_fin"`
	Dias         []repository.DiaIngreso `json:"dias"`
}

func (s *DashboardService) Weekly(ctx context.Context, fecha string) (*WeeklyResultado, error) {
	d, err := time.Parse("2006-01-02", fecha)
	if err != nil {
		return nil, apperr.NewValidation("fecha inválida: " + fecha)
	}
	loc := LaPaz()
	offset := (int(d.Weekday()) + 6) % 7 // días desde el lunes (Dom=0 → 6)
	lunes := d.AddDate(0, 0, -offset)
	lunes = time.Date(lunes.Year(), lunes.Month(), lunes.Day(), 0, 0, 0, 0, loc)
	domingo := lunes.AddDate(0, 0, 6)

	dias, err := s.repo.Semana(ctx, lunes.Format("2006-01-02"), domingo.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	// Rellenar los 7 días con ceros.
	porFecha := map[string]repository.DiaIngreso{}
	for _, x := range dias {
		porFecha[x.Fecha] = x
	}
	completos := make([]repository.DiaIngreso, 0, 7)
	for i := 0; i < 7; i++ {
		f := lunes.AddDate(0, 0, i).Format("2006-01-02")
		if x, ok := porFecha[f]; ok {
			completos = append(completos, x)
		} else {
			completos = append(completos, repository.DiaIngreso{Fecha: f})
		}
	}
	return &WeeklyResultado{
		SemanaInicio: lunes.Format("2006-01-02"),
		SemanaFin:    domingo.Format("2006-01-02"),
		Dias:         completos,
	}, nil
}

// MonthlyResultado agrega la vista mensual por semanas.
type MonthlyResultado struct {
	Mes     int                           `json:"mes"`
	Anio    int                           `json:"anio"`
	Semanas []repository.SemanaIngreso    `json:"semanas"`
}

func (s *DashboardService) Monthly(ctx context.Context, mes, anio int) (*MonthlyResultado, error) {
	loc := LaPaz()
	inicio := time.Date(anio, time.Month(mes), 1, 0, 0, 0, 0, loc)
	fin := inicio.AddDate(0, 1, -1)

	semanas, err := s.repo.MesPorSemana(ctx, inicio.Format("2006-01-02"), fin.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	// Completar el rango esperado de semanas con inicios/fines.
	diasDelMes := fin.Day()
	numSemanas := (diasDelMes-1)/7 + 1
	porNum := map[int]repository.SemanaIngreso{}
	for _, w := range semanas {
		porNum[w.Semana] = w
	}
	out := make([]repository.SemanaIngreso, 0, numSemanas)
	for i := 1; i <= numSemanas; i++ {
		if w, ok := porNum[i]; ok {
			w.Inicio = inicio.AddDate(0, 0, (i-1)*7).Format("2006-01-02")
			finSem := inicio.AddDate(0, 0, i*7-1)
			if finSem.After(fin) {
				finSem = fin
			}
			w.Fin = finSem.Format("2006-01-02")
			out = append(out, w)
		} else {
			finSem := inicio.AddDate(0, 0, i*7-1)
			if finSem.After(fin) {
				finSem = fin
			}
			out = append(out, repository.SemanaIngreso{
				Semana: i,
				Inicio: inicio.AddDate(0, 0, (i-1)*7).Format("2006-01-02"),
				Fin:    finSem.Format("2006-01-02"),
			})
		}
	}
	return &MonthlyResultado{Mes: mes, Anio: anio, Semanas: out}, nil
}

// YearlyResultado agrega la vista anual por mes.
type YearlyResultado struct {
	Anio int                    `json:"anio"`
	Meses []repository.MesIngreso `json:"meses"`
}

func (s *DashboardService) Yearly(ctx context.Context, anio int) (*YearlyResultado, error) {
	meses, err := s.repo.Anio(ctx, anio)
	if err != nil {
		return nil, err
	}
	porMes := map[int]repository.MesIngreso{}
	for _, m := range meses {
		porMes[m.Mes] = m
	}
	out := make([]repository.MesIngreso, 0, 12)
	for i := 1; i <= 12; i++ {
		if m, ok := porMes[i]; ok {
			out = append(out, m)
		} else {
			out = append(out, repository.MesIngreso{Mes: i})
		}
	}
	return &YearlyResultado{Anio: anio, Meses: out}, nil
}

// HistoryResultado agrega la tendencia histórica con regresión lineal simple.
type HistoryResultado struct {
	PorMes  []repository.PuntoHistorial `json:"por_mes"`
	Tendencia TendenciaResultado        `json:"tendencia"`
}

type TendenciaResultado struct {
	Pendiente      float64 `json:"pendiente"`
	Interseccion   float64 `json:"interseccion"`
	ProxMesEst     float64 `json:"prox_mes_est"`
	Creciendo      bool    `json:"creciendo"`
}

func (s *DashboardService) History(ctx context.Context) (*HistoryResultado, error) {
	puntos, err := s.repo.Historial(ctx)
	if err != nil {
		return nil, err
	}
	tend := TendenciaResultado{}
	n := len(puntos)
	if n >= 2 {
		// regresión: x = índice secuencial (0..n-1), y = total_centavos
		var sumX, sumY, sumXY, sumXX float64
		for i, p := range puntos {
			x := float64(i)
			y := float64(p.TotalCentavos)
			sumX += x
			sumY += y
			sumXY += x * y
			sumXX += x * x
		}
		den := float64(n)*sumXX - sumX*sumX
		if den != 0 {
			tend.Pendiente = (float64(n)*sumXY - sumX*sumY) / den
			tend.Interseccion = (sumY - tend.Pendiente*sumX) / float64(n)
		}
		tend.ProxMesEst = tend.Pendiente*float64(n) + tend.Interseccion
		tend.Creciendo = tend.Pendiente > 0
	}
	return &HistoryResultado{PorMes: puntos, Tendencia: tend}, nil
}