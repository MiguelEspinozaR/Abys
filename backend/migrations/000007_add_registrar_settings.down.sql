-- 000007_add_registrar_settings.down.sql
DELETE FROM app_settings
WHERE clave IN ('registrar_metodo_default', 'registrar_modo_default');
