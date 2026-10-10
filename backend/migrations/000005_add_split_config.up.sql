-- 000005_add_split_config.up.sql
-- Configuración de split por fuente (auto-split) y modo por defecto global.

ALTER TABLE fuentes
    ADD COLUMN IF NOT EXISTS split_auto BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS split_auto_modo VARCHAR(20)
        CHECK (split_auto_modo IN ('redondeado','enteros','preciso'));

CREATE TABLE IF NOT EXISTS app_settings (
    clave VARCHAR(50) PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (clave, valor)
VALUES ('split_modo_default', 'preciso')
ON CONFLICT (clave) DO NOTHING;
