-- 000002_seed.up.sql
-- Seed base: fuentes iniciales (Athena, Essencia, Malnova) y Cuenta General.
-- Los IDs 1 y 2 de cuentas quedan reservados para las cuentas legadas
-- (Business, Box) que migra 000003. General recibe id 3.

INSERT INTO fuentes (id, alias, color) VALUES
    (1, 'Athena', '#ff47a1'),
    (2, 'Essencia', '#023749'),
    (3, 'Malnova', '#e4c852');

INSERT INTO cuentas (id, alias, es_general) VALUES
    (3, 'General', TRUE);

-- Tasa inicial 0 para General (derivada siempre como 100% − Σ otras).
INSERT INTO historial_tasas (cuenta_id, tasa_bps) VALUES (3, 0);

SELECT setval('fuentes_id_seq', 3, true);
SELECT setval('cuentas_id_seq', 3, true);