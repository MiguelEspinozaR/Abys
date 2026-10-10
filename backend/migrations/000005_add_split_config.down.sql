-- 000005_add_split_config.down.sql
DROP TABLE IF EXISTS app_settings;

ALTER TABLE fuentes
    DROP COLUMN IF EXISTS split_auto_modo,
    DROP COLUMN IF EXISTS split_auto;
