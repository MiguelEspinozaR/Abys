# Reglas de negocio

Fuente única de las reglas de la aplicación, documentadas en lenguaje natural.

## Pagos

1. Un pago debe tener al menos un día trabajado.
2. Se pueden agregar/eliminar días trabajados manteniendo al menos uno.
3. Una misma fecha de trabajo puede pertenecer a varios pagos.
4. Un pago puede existir sin split, pero no puede tener más de un split.
5. Un pago con transacciones realizadas no puede eliminarse.
6. El monto del pago no puede ser negativo; la fecha debe ser válida; no se permiten fechas de trabajo duplicadas dentro del mismo pago.
7. Métodos de pago fijos: `efectivo`, `qr`, `transacción`.

## Días trabajados

8. Cada día trabajado pertenece a un solo pago; fecha única por pago; la misma fecha puede repetirse en pagos distintos.

## Fuentes

9. La fuente es una entidad independiente (alias, color, logo) reutilizable en varios pagos.

## Splits

10. Una transacción nunca es negativa; los residuos van a la cuenta General.
11. Los splits se crean con las tasas vigentes en ese momento (snapshot); cambios posteriores de tasa no modifican splits existentes (salvo recálculo explícito).
12. Modos de cálculo:
    - **Redondeado:** `tasa × pago / 100` redondeado al centavo más cercano (126,6 → 127).
    - **Enteros:** idem pero truncado hacia abajo (126,6 → 126).
    - **Preciso:** monto con hasta 2 decimales exactos (126,60).
    - Si un cálculo genera fracción de centavo, se trunca con `floor()` y el residuo se asigna a General. En cualquier modo, la suma de transacciones debe ser exactamente el monto del pago.
13. Una transacción de 0 Bs en una cuenta distinta de General genera advertencia visual.
14. Eliminar un split elimina atómicamente sus transacciones **pendientes**; si hay transacciones **realizadas**, la eliminación se rechaza y el pago queda sin split.

## Cuentas

15. La cuenta General es permanente: tasa = 100% − suma(otras), dentro de [0%, 100%); recibe residuos y absorbe diferencias al recalcular.
16. La suma de tasas de cuentas distintas de General no puede superar 100%.
17. `número`, `banco` y `qr` son datos referenciales.
18. Eliminar una cuenta no elimina ni modifica transacciones históricas (por los snapshots).

## Historial de tasas

19. Cada modificación de tasa registra una entrada nueva; la vigente es la última registrada.
20. Cambiar una tasa no altera splits existentes salvo que se marque "aplicar a transacciones pendientes".

## Recálculo con transacciones realizadas

21. Las transacciones realizadas son inmutables (monto y datos congelados); solo se recalculan las pendientes.
22. Al recalcular: se congela lo realizado, se redistribuye el remanente entre las pendientes con las tasas vigentes y el modo del split, General absorbe la diferencia, y la suma debe ser exactamente el monto del pago. Si el remanente no alcanza para cubrir las pendientes no-General según sus tasas, la operación se rechaza.

## Transacciones

23. Estados: `pendiente` / `realizada`.
24. Pendiente: modificable, recalculable, tasa actualizable.
25. Realizada: inmutable, no eliminable, registra fecha de realización y snapshot del alias de la cuenta (el historial muestra el alias aunque la cuenta cambie o se elimine).

## Generales

26. Montos como BIGINT centavos; conversión solo al visualizar.
27. Integridad monetaria: suma de transacciones = monto del pago; nunca mayor; nunca una transacción individual negativa.
28. Auditoría, timestamps y soft delete en base de datos, sin comprometer datos históricos: lo eliminado no aparece en listados activos ni en dashboard, pero se conserva en el histórico.
29. La base de datos es la fuente de verdad; el frontend no duplica datos del servidor.
30. Seguridad v1: la aplicación se ejecuta **sin login** en la versión estable inicial (riesgo documentado); el login se implementará en una versión posterior.