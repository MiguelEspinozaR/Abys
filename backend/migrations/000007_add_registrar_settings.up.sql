-- 000007_add_registrar_settings.up.sql
-- Defaults globales de registro: método de pago y modo de ingreso.

INSERT INTO app_settings (clave, valor) VALUES
    ('registrar_metodo_default', 'efectivo'),
    ('registrar_modo_default', 'detallado')
ON CONFLICT (clave) DO NOTHING;
