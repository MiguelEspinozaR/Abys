package handler

import (
	"testing"

	"abys/internal/model"
)

func TestTotalesSplit(t *testing.T) {
	generalID := int64(3)
	otroID := int64(5)

	t.Run("solo General pendiente devuelve pendiente 0 y mantiene realizado", func(t *testing.T) {
		txs := []model.Transaccion{
			{CuentaID: &generalID, MontoEnteros: 1000, Realizado: false},
		}
		pendiente, realizado := totalesSplit(txs, &generalID)
		if pendiente != 0 {
			t.Fatalf("pendiente = %d, se esperaba 0", pendiente)
		}
		if realizado != 0 {
			t.Fatalf("realizado = %d, se esperaba 0", realizado)
		}
	})

	t.Run("General mas otra cuenta pendiente suma solo la otra", func(t *testing.T) {
		txs := []model.Transaccion{
			{CuentaID: &generalID, MontoEnteros: 1000, Realizado: false},
			{CuentaID: &otroID, MontoEnteros: 2500, Realizado: false},
		}
		pendiente, realizado := totalesSplit(txs, &generalID)
		if pendiente != 2500 {
			t.Fatalf("pendiente = %d, se esperaba 2500", pendiente)
		}
		if realizado != 0 {
			t.Fatalf("realizado = %d, se esperaba 0", realizado)
		}
	})

	t.Run("realizado intacto y General realizada no altera pendiente", func(t *testing.T) {
		txs := []model.Transaccion{
			{CuentaID: &generalID, MontoEnteros: 1000, Realizado: true},
			{CuentaID: &otroID, MontoEnteros: 2500, Realizado: true},
			{CuentaID: &otroID, MontoEnteros: 500, Realizado: false},
		}
		pendiente, realizado := totalesSplit(txs, &generalID)
		if pendiente != 500 {
			t.Fatalf("pendiente = %d, se esperaba 500", pendiente)
		}
		if realizado != 3500 {
			t.Fatalf("realizado = %d, se esperaba 3500", realizado)
		}
	})

	t.Run("idGeneral nil comportamiento legacy incluye General", func(t *testing.T) {
		txs := []model.Transaccion{
			{CuentaID: &generalID, MontoEnteros: 1000, Realizado: false},
			{CuentaID: &otroID, MontoEnteros: 2500, Realizado: false},
		}
		pendiente, realizado := totalesSplit(txs, nil)
		if pendiente != 3500 {
			t.Fatalf("pendiente = %d, se esperaba 3500", pendiente)
		}
		if realizado != 0 {
			t.Fatalf("realizado = %d, se esperaba 0", realizado)
		}
	})

	t.Run("CuentaID nil se conserva como pendiente", func(t *testing.T) {
		txs := []model.Transaccion{
			{CuentaID: nil, MontoEnteros: 700, Realizado: false},
			{CuentaID: &generalID, MontoEnteros: 300, Realizado: false},
		}
		pendiente, realizado := totalesSplit(txs, &generalID)
		if pendiente != 700 {
			t.Fatalf("pendiente = %d, se esperaba 700", pendiente)
		}
		if realizado != 0 {
			t.Fatalf("realizado = %d, se esperaba 0", realizado)
		}
	})
}
