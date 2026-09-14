-- 000002_seed.down.sql
DELETE FROM historial_tasas WHERE cuenta_id = 3;
DELETE FROM cuentas WHERE id = 3;
DELETE FROM fuentes WHERE id IN (1, 2, 3);