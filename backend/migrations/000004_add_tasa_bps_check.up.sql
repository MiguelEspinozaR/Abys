-- 000004_add_tasa_bps_check.up.sql
-- Agregar CHECK constraint: tasa_bps <= 10000 en historial_tasas (defensa en profundidad).

ALTER TABLE historial_tasas
    DROP CONSTRAINT IF EXISTS historial_tasas_tasa_bps_check,
    ADD CONSTRAINT historial_tasas_tasa_bps_check CHECK (tasa_bps >= 0 AND tasa_bps <= 10000);