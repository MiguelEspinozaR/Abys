-- 000001_create_schema.up.sql
-- Schema Abys (backend SPEC): fuentes, pagos, dias_trabajados, cuentas,
-- historial_tasas, splits, transacciones.

-- Fuentes de ingreso
CREATE TABLE fuentes (
    id BIGSERIAL PRIMARY KEY,
    alias VARCHAR(100) NOT NULL,
    color VARCHAR(9) NOT NULL DEFAULT '#3b82f6',
    logo_ruta VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Pagos (ingresos)
CREATE TABLE pagos (
    id BIGSERIAL PRIMARY KEY,
    fuente_id BIGINT NOT NULL REFERENCES fuentes(id),
    fecha_pago DATE NOT NULL,
    monto_enteros BIGINT NOT NULL CHECK (monto_enteros >= 0),
    metodo_pago VARCHAR(20) NOT NULL CHECK (metodo_pago IN ('efectivo','qr','transaccion')),
    notas TEXT,
    imagen_ruta VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX idx_pagos_fuente ON pagos(fuente_id);

-- Días trabajados por pago
CREATE TABLE dias_trabajados (
    id BIGSERIAL PRIMARY KEY,
    pago_id BIGINT NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    UNIQUE (pago_id, fecha)
);
CREATE INDEX idx_dias_fecha ON dias_trabajados(fecha);

-- Cuentas de distribución
CREATE TABLE cuentas (
    id BIGSERIAL PRIMARY KEY,
    alias VARCHAR(100) NOT NULL,
    numero VARCHAR(50),
    banco VARCHAR(100),
    qr_ruta VARCHAR(500),
    es_general BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Historial de tasas (tasa en basis points: 20% = 2000)
CREATE TABLE historial_tasas (
    id BIGSERIAL PRIMARY KEY,
    cuenta_id BIGINT NOT NULL REFERENCES cuentas(id),
    tasa_bps BIGINT NOT NULL CHECK (tasa_bps >= 0),
    aplicada_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_historial_cuenta ON historial_tasas(cuenta_id, aplicada_desde DESC);

-- Splits (0..1 por pago)
CREATE TABLE splits (
    id BIGSERIAL PRIMARY KEY,
    pago_id BIGINT NOT NULL UNIQUE REFERENCES pagos(id) ON DELETE RESTRICT,
    modo_calculo VARCHAR(20) NOT NULL DEFAULT 'preciso'
        CHECK (modo_calculo IN ('redondeado','enteros','preciso')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transacciones (snapshots de alias y tasa)
CREATE TABLE transacciones (
    id BIGSERIAL PRIMARY KEY,
    split_id BIGINT NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
    cuenta_id BIGINT REFERENCES cuentas(id),
    monto_enteros BIGINT NOT NULL CHECK (monto_enteros >= 0),
    tasa_bps BIGINT NOT NULL CHECK (tasa_bps >= 0),
    alias_snapshot VARCHAR(100) NOT NULL,
    realizado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_realizacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transacciones_split ON transacciones(split_id);
CREATE INDEX idx_transacciones_cuenta ON transacciones(cuenta_id);