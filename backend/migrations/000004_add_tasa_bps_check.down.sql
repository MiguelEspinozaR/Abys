-- 000004_add_tasa_bps_check.down.sql
-- Revertir CHECK constraint a solo >= 0.

ALTER TABLE historial_tasas
    DROP CONSTRAINT IF EXISTS historial_tasas_tasa_bps_check,
    ADD CONSTRAINT historial_tasas_tasa_bps_check CHECK (tasa_bps >= 0);