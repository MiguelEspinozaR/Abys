-- 000006_add_monto_dias_trabajados.down.sql
-- Revierte la columna de monto por día. Los montos por día se pierden (R5.3).
ALTER TABLE dias_trabajados
    DROP CONSTRAINT IF EXISTS ck_dias_monto_no_neg;

ALTER TABLE dias_trabajados
    DROP COLUMN IF EXISTS monto_enteros;
