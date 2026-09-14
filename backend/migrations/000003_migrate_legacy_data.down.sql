-- 000003_migrate_legacy_data.down.sql
-- Revierte SOLO los datos migrados (mantiene schema y seed).
-- Los pagos migrados conservan ids <= 202 (sin huecos colisionables).
DELETE FROM transacciones WHERE split_id IN (SELECT id FROM splits WHERE pago_id <= 202);
DELETE FROM splits WHERE pago_id <= 202;
DELETE FROM dias_trabajados WHERE pago_id <= 202;
DELETE FROM pagos WHERE id <= 202;
DELETE FROM historial_tasas WHERE cuenta_id IN (1, 2);
DELETE FROM cuentas WHERE id IN (1, 2);

