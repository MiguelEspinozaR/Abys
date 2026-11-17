package service

import (
	"context"
	"testing"
	"time"

	"abys/internal/repository"
)

type fakeDashboardRepo struct {
	resumen      repository.ResumenTotales
	semana       []repository.DiaFuenteTotal
	bloques      []repository.BloqueTotal
	meses        []repository.MesTotal
	historial    []repository.PuntoHistorial
	distribucion []repository.FuenteTotal

	desde, hasta string
	inicio, fin  string
	ultimoAnio   int
}

func (f *fakeDashboardRepo) Resumen(_ context.Context, desde, hasta string) (repository.ResumenTotales, error) {
	f.desde, f.hasta = desde, hasta
	return f.resumen, nil
}

func (f *fakeDashboardRepo) SemanaPorFuente(_ context.Context, inicio, fin string) ([]repository.DiaFuenteTotal, error) {
	f.inicio, f.fin = inicio, fin
	return f.semana, nil
}

func (f *fakeDashboardRepo) BloquesMes(_ context.Context, inicio, fin string) ([]repository.BloqueTotal, error) {
	f.inicio, f.fin = inicio, fin
	return f.bloques, nil
}

func (f *fakeDashboardRepo) AnioTotales(_ context.Context, inicio, fin string) ([]repository.MesTotal, error) {
	f.inicio, f.fin = inicio, fin
	return f.meses, nil
}

func (f *fakeDashboardRepo) HistorialMeses(_ context.Context) ([]repository.PuntoHistorial, error) {
	return f.historial, nil
}

func (f *fakeDashboardRepo) Distribucion(_ context.Context, inicio, fin string) ([]repository.FuenteTotal, error) {
	f.inicio, f.fin = inicio, fin
	return f.distribucion, nil
}

func TestRangoUltimos30(t *testing.T) {
	loc := LaPaz()
	desde, hasta := rangoUltimos30(time.Date(2026, 11, 17, 10, 0, 0, 0, loc))
	if desde != "2026-10-19" || hasta != "2026-11-17" {
		t.Errorf("rango = %s..%s, se esperaba 2026-10-19..2026-11-17", desde, hasta)
	}
	// 02:00 UTC del 18 = 22:00 La Paz del 17 (UTC-4 sin DST).
	desde, hasta = rangoUltimos30(time.Date(2026, 11, 18, 2, 0, 0, 0, time.UTC))
	if desde != "2026-10-19" || hasta != "2026-11-17" {
		t.Errorf("rango UTC = %s..%s, se esperaba 2026-10-19..2026-11-17", desde, hasta)
	}
}

func TestRangoSemana(t *testing.T) {
	lunes, domingo, err := rangoSemana("2026-10-22")
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if lunes.Format(fechaLayout) != "2026-10-19" || domingo.Format(fechaLayout) != "2026-10-25" {
		t.Errorf("semana = %s..%s", lunes.Format(fechaLayout), domingo.Format(fechaLayout))
	}
	// Domingo pertenece a la semana que empieza el lunes anterior.
	lunes, _, err = rangoSemana("2026-10-25")
	if err != nil || lunes.Format(fechaLayout) != "2026-10-19" {
		t.Errorf("domingo: lunes = %s, err = %v", lunes.Format(fechaLayout), err)
	}
	if _, _, err := rangoSemana("2026-02-31"); err == nil {
		t.Error("fecha inválida debe fallar")
	}
}

func TestBloquesDelMes(t *testing.T) {
	casos := []struct {
		anio, mes int
		bloques   int
		ultimoFin string
	}{
		{2026, 1, 5, "2026-01-31"},
		{2026, 2, 4, "2026-02-28"},
		{2028, 2, 5, "2028-02-29"},
		{2026, 4, 5, "2026-04-30"},
	}
	for _, c := range casos {
		rangos := bloquesDelMes(c.anio, c.mes)
		if len(rangos) != c.bloques {
			t.Errorf("%d-%02d: %d bloques, se esperaban %d", c.anio, c.mes, len(rangos), c.bloques)
			continue
		}
		ultimo := rangos[len(rangos)-1]
		if ultimo.Fin.Format(fechaLayout) != c.ultimoFin {
			t.Errorf("%d-%02d: fin = %s, se esperaba %s", c.anio, c.mes,
				ultimo.Fin.Format(fechaLayout), c.ultimoFin)
		}
		if rangos[0].Inicio.Format(fechaLayout) != time.Date(c.anio, time.Month(c.mes), 1, 0, 0, 0, 0, LaPaz()).Format(fechaLayout) {
			t.Errorf("%d-%02d: inicio del bloque 1 incorrecto", c.anio, c.mes)
		}
	}
}

func TestWeeklyFormatea7DiasYPorFuente(t *testing.T) {
	fake := &fakeDashboardRepo{semana: []repository.DiaFuenteTotal{
		{Fecha: "2026-10-20", FuenteID: 1, Alias: "Athena", Color: "#111111", TotalCentavos: 10000},
		{Fecha: "2026-10-20", FuenteID: 2, Alias: "Essencia", Color: "#222222", TotalCentavos: 5000},
		{Fecha: "2026-10-22", FuenteID: 1, Alias: "Athena", Color: "#111111", TotalCentavos: 20000},
	}}
	svc := NewDashboardService(fake)
	res, err := svc.Weekly(context.Background(), "2026-10-22")
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if res.SemanaInicio != "2026-10-19" || res.SemanaFin != "2026-10-25" {
		t.Errorf("semana = %s..%s", res.SemanaInicio, res.SemanaFin)
	}
	if len(res.Dias) != 7 {
		t.Fatalf("días = %d, se esperaban 7", len(res.Dias))
	}
	porFecha := map[string]DiaConFuentes{}
	for _, d := range res.Dias {
		porFecha[d.Fecha] = d
	}
	if d := porFecha["2026-10-20"]; d.TotalCentavos != 15000 || len(d.PorFuente) != 2 {
		t.Errorf("2026-10-20 = %+v", d)
	}
	if d := porFecha["2026-10-22"]; d.TotalCentavos != 20000 || len(d.PorFuente) != 1 {
		t.Errorf("2026-10-22 = %+v", d)
	}
	if d := porFecha["2026-10-21"]; d.TotalCentavos != 0 || d.PorFuente == nil || len(d.PorFuente) != 0 {
		t.Errorf("día vacío debe tener total 0 y por_fuente vacío: %+v", d)
	}
}

func TestMonthlyRellenaBloques(t *testing.T) {
	fake := &fakeDashboardRepo{bloques: []repository.BloqueTotal{
		{Bloque: 1, TotalCentavos: 100},
		{Bloque: 3, TotalCentavos: 300},
	}}
	svc := NewDashboardService(fake)
	res, err := svc.Monthly(context.Background(), 1, 2026)
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if len(res.Bloques) != 5 {
		t.Fatalf("bloques = %d, se esperaban 5", len(res.Bloques))
	}
	esperado := map[int]int64{1: 100, 2: 0, 3: 300, 4: 0, 5: 0}
	for _, b := range res.Bloques {
		if b.TotalCentavos != esperado[b.Bloque] {
			t.Errorf("bloque %d = %d, se esperaba %d", b.Bloque, b.TotalCentavos, esperado[b.Bloque])
		}
	}
	if res.Bloques[0].Inicio != "2026-01-01" || res.Bloques[0].Fin != "2026-01-07" ||
		res.Bloques[4].Inicio != "2026-01-29" || res.Bloques[4].Fin != "2026-01-31" {
		t.Errorf("rangos inesperados: %+v", res.Bloques)
	}
}

func TestYearlyRellena12Meses(t *testing.T) {
	fake := &fakeDashboardRepo{meses: []repository.MesTotal{{Mes: 2, TotalCentavos: 5000}}}
	svc := NewDashboardService(fake)
	res, err := svc.Yearly(context.Background(), 2026)
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if len(res.Meses) != 12 {
		t.Fatalf("meses = %d, se esperaban 12", len(res.Meses))
	}
	for _, m := range res.Meses {
		esperado := int64(0)
		if m.Mes == 2 {
			esperado = 5000
		}
		if m.TotalCentavos != esperado {
			t.Errorf("mes %d = %d, se esperaba %d", m.Mes, m.TotalCentavos, esperado)
		}
	}
}

func TestHistorySinTendencia(t *testing.T) {
	fake := &fakeDashboardRepo{historial: []repository.PuntoHistorial{
		{Anio: 2026, Mes: 1, TotalCentavos: 1000},
		{Anio: 2026, Mes: 2, TotalCentavos: 2000},
	}}
	svc := NewDashboardService(fake)
	res, err := svc.History(context.Background())
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if len(res.PorMes) != 2 || res.PorMes[1].TotalCentavos != 2000 {
		t.Errorf("por_mes inesperado: %+v", res.PorMes)
	}
}

func TestDistribucionSumaYOrden(t *testing.T) {
	fuentes := []repository.FuenteTotal{
		{FuenteID: 2, Alias: "Essencia", Color: "#222222", TotalCentavos: 7000},
		{FuenteID: 1, Alias: "Athena", Color: "#111111", TotalCentavos: 3000},
	}
	fake := &fakeDashboardRepo{distribucion: fuentes}
	svc := NewDashboardService(fake)

	mes, err := svc.DistributionMonthly(context.Background(), 10, 2026)
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if mes.TotalCentavos != 10000 || len(mes.PorFuente) != 2 ||
		mes.PorFuente[0].FuenteID != 2 || mes.PorFuente[1].FuenteID != 1 {
		t.Errorf("distribución mensual inesperada: %+v", mes)
	}
	if fake.inicio != "2026-10-01" || fake.fin != "2026-10-31" {
		t.Errorf("rango mensual = %s..%s", fake.inicio, fake.fin)
	}

	anio, err := svc.DistributionYearly(context.Background(), 2026)
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if anio.TotalCentavos != 10000 || len(anio.PorFuente) != 2 {
		t.Errorf("distribución anual inesperada: %+v", anio)
	}
	if fake.inicio != "2026-01-01" || fake.fin != "2026-12-31" {
		t.Errorf("rango anual = %s..%s", fake.inicio, fake.fin)
	}

	// Sin datos: listas no nulas y total 0.
	vacio := NewDashboardService(&fakeDashboardRepo{})
	res, err := vacio.DistributionMonthly(context.Background(), 11, 2026)
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if res.TotalCentavos != 0 || res.PorFuente == nil || len(res.PorFuente) != 0 {
		t.Errorf("distribución vacía inesperada: %+v", res)
	}
}

func TestSummaryUsaRangoDe30Dias(t *testing.T) {
	fake := &fakeDashboardRepo{resumen: repository.ResumenTotales{
		Total30dCentavos: 100, TotalHistoricoCentavos: 900,
	}}
	svc := NewDashboardService(fake)
	res, err := svc.Summary(context.Background())
	if err != nil {
		t.Fatalf("error: %v", err)
	}
	if res.Total30dCentavos != 100 || res.TotalHistoricoCentavos != 900 {
		t.Errorf("resumen inesperado: %+v", res)
	}
	if fake.desde == "" || fake.hasta == "" {
		t.Error("el rango de 30 días no se propagó al repo")
	}
	desde, hasta := rangoUltimos30(time.Now())
	if fake.desde != desde || fake.hasta != hasta {
		t.Errorf("rango = %s..%s, se esperaba %s..%s", fake.desde, fake.hasta, desde, hasta)
	}
}
