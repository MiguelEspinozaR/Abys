-- 000006_add_monto_dias_trabajados.up.sql
-- Monto por día trabajado (centavos) y backfill equitativo desde pagos.monto_enteros.
-- Regla: base = total / n centavos para todos los días; el sobrante <total mod n>
-- se asigna al último día ordenado por fecha, luego id. Pagos sin días reciben un
-- día sintético en fecha_pago con el monto completo. Σ días = pago.monto_enteros.
-- No se reescribe pagos.monto_enteros (R5.4).

-- 1. Columna + CHECK (mismo criterio que pagos.monto_enteros en 000001).
ALTER TABLE dias_trabajados
    ADD COLUMN IF NOT EXISTS monto_enteros BIGINT NOT NULL DEFAULT 0;

ALTER TABLE dias_trabajados
    DROP CONSTRAINT IF EXISTS ck_dias_monto_no_neg;

ALTER TABLE dias_trabajados
    ADD CONSTRAINT ck_dias_monto_no_neg CHECK (monto_enteros >= 0);

-- 2. Día sintético para todo pago sin días (activos y soft-deleted).
INSERT INTO dias_trabajados (pago_id, fecha, monto_enteros)
SELECT p.id, p.fecha_pago, p.monto_enteros
FROM pagos p
WHERE NOT EXISTS (
    SELECT 1 FROM dias_trabajados d WHERE d.pago_id = p.id
);

-- 3. Reparto equitativo en centavos exactos (residuo al último día).
WITH ordenados AS (
    SELECT d.id,
           p.monto_enteros AS total,
           count(*) OVER (PARTITION BY d.pago_id) AS n,
           row_number() OVER (PARTITION BY d.pago_id ORDER BY d.fecha, d.id) AS rn
    FROM dias_trabajados d
    JOIN pagos p ON p.id = d.pago_id
)
UPDATE dias_trabajados d
SET monto_enteros = CASE
        WHEN o.rn = o.n THEN o.total - (o.total / o.n) * (o.n - 1)
        ELSE o.total / o.n
    END
FROM ordenados o
WHERE d.id = o.id;
