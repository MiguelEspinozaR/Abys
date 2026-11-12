# AC3 — casos

| caso | tema | resultado | checks | detalle de fallos |
|---|---|---|---|---|
| registrar-400 | light | PASS | 11 | — |
| registrar-409 | light | PASS | 9 | — |
| registrar-422 | light | PASS | 9 | — |
| registrar-500 | light | PASS | 9 | — |
| editar-400 | light | PASS | 8 | — |
| editar-409 | light | PASS | 8 | — |
| editar-422 | light | PASS | 8 | — |
| editar-500 | light | PASS | 8 | — |
| fuente-400 | light | PASS | 8 | — |
| fuente-409 | light | PASS | 8 | — |
| fuente-500 | light | PASS | 8 | — |
| cuenta-400 | light | PASS | 8 | — |
| cuenta-409 | light | PASS | 8 | — |
| cuenta-500 | light | PASS | 8 | — |
| tasa-400 | light | PASS | 8 | — |
| tasa-409 | light | PASS | 8 | — |
| tasa-500 | light | PASS | 8 | — |
| generar-split-400 | light | PASS | 7 | — |
| generar-split-409 | light | PASS | 7 | — |
| generar-split-500 | light | PASS | 7 | — |
| splits-tab-400 | light | PASS | 8 | — |
| splits-tab-409 | light | PASS | 8 | — |
| splits-tab-500 | light | PASS | 8 | — |

## registrar-400 (light, mobile)

- [x] form aria-busy=true durante el envío — aria-busy=true
- [x] submit deshabilitado durante el envío — ok
- [x] exactamente 1 POST /pagos (sin doble envío) — POSTs=1
- [x] error 400 global en el resumen (p[role=alert]) — El monto debe ser mayor a cero (mock harness)
- [x] sin diálogos de confirmación espurios — dialogs=0
- [x] los datos del formulario persisten — monto=265,00, fuente=Essencia
- [x] no se navegó fuera de /registrar — http://localhost:5178/registrar
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"}]

## registrar-409 (light, mobile)

- [x] exactamente 1 POST /pagos (sin doble envío) — POSTs=1
- [x] error 409 global en el resumen (p[role=alert]) — La fuente ya tiene un pago registrado hoy (mock harness)
- [x] sin diálogos de confirmación espurios — dialogs=0
- [x] los datos del formulario persisten — monto=265,00, fuente=Essencia
- [x] no se navegó fuera de /registrar — http://localhost:5178/registrar
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"}]

## registrar-422 (light, mobile)

- [x] exactamente 1 POST /pagos (sin doble envío) — POSTs=1
- [x] error 422 global en el resumen (p[role=alert]) — El monto no puede modificarse: el pago tiene split (mock harness)
- [x] sin diálogos de confirmación espurios — dialogs=0
- [x] los datos del formulario persisten — monto=265,00, fuente=Essencia
- [x] no se navegó fuera de /registrar — http://localhost:5178/registrar
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"}]

## registrar-500 (light, mobile)

- [x] exactamente 1 POST /pagos (sin doble envío) — POSTs=1
- [x] error 500 global en el resumen (p[role=alert]) — Error interno del servidor (mock harness)
- [x] sin diálogos de confirmación espurios — dialogs=0
- [x] los datos del formulario persisten — monto=265,00, fuente=Essencia
- [x] no se navegó fuera de /registrar — http://localhost:5178/registrar
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"}]

## editar-400 (light, mobile)

- [x] 1 PUT /pagos/:id — PUTs=1
- [x] error 400 global en el resumen del diálogo — Monto fuera de rango (mock harness)
- [x] el diálogo permanece abierto tras el error — ok
- [x] los datos editados persisten — monto=300,00
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/pagos/235"}]

## editar-409 (light, mobile)

- [x] 1 PUT /pagos/:id — PUTs=1
- [x] error 409 global en el resumen del diálogo — Conflicto de negocio al editar (mock harness)
- [x] el diálogo permanece abierto tras el error — ok
- [x] los datos editados persisten — monto=300,00
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/pagos/235"}]

## editar-422 (light, mobile)

- [x] 1 PUT /pagos/:id — PUTs=1
- [x] error 422 mapeado al campo monto (inline) — El monto no puede modificarse: el pago tiene split (mock harness)
- [x] el diálogo permanece abierto tras el error — ok
- [x] los datos editados persisten — monto=300,00
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/pagos/235"}]
- captura: screenshots/ac3-editar-422-m390-light.png

## editar-500 (light, mobile)

- [x] 1 PUT /pagos/:id — PUTs=1
- [x] error 500 global en el resumen del diálogo — Error interno del servidor (mock harness)
- [x] el diálogo permanece abierto tras el error — ok
- [x] los datos editados persisten — monto=300,00
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/pagos/235"}]

## fuente-400 (light, mobile)

- [x] 1 POST /fuentes — POSTs=1
- [x] error 400 global en el resumen del diálogo — El alias ya existe (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] el alias persiste — alias=QA Fuente
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/fuentes"}]

## fuente-409 (light, mobile)

- [x] 1 POST /fuentes — POSTs=1
- [x] error 409 global en el resumen del diálogo — Conflicto al crear la fuente (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] el alias persiste — alias=QA Fuente
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/fuentes"}]

## fuente-500 (light, mobile)

- [x] 1 POST /fuentes — POSTs=1
- [x] error 500 global en el resumen del diálogo — Error interno del servidor (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] el alias persiste — alias=QA Fuente
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/fuentes"}]

## cuenta-400 (light, mobile)

- [x] 1 POST /cuentas — POSTs=1
- [x] error 400 mapeado al campo alias (inline) — El alias ya existe (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] el alias persiste — alias=QA Cuenta
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/cuentas"}]

## cuenta-409 (light, mobile)

- [x] 1 POST /cuentas — POSTs=1
- [x] error 409 global en el resumen del diálogo — Conflicto al crear la cuenta (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] el alias persiste — alias=QA Cuenta
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/cuentas"}]

## cuenta-500 (light, mobile)

- [x] 1 POST /cuentas — POSTs=1
- [x] error 500 global en el resumen del diálogo — Error interno del servidor (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] el alias persiste — alias=QA Cuenta
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/cuentas"}]

## tasa-400 (light, mobile)

- [x] 1 PUT /cuentas/:id/tasa — PUTs=1
- [x] error 400 visible (campo o resumen) — inline=Tasa fuera de rango (mock harness) | global=null
- [x] el diálogo permanece abierto — ok
- [x] la tasa editada persiste — tasa=25
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/cuentas/2/tasa"}]

## tasa-409 (light, mobile)

- [x] 1 PUT /cuentas/:id/tasa — PUTs=1
- [x] error 409 visible (campo o resumen) — inline=La suma de tasas supera 100% (mock harness) | global=null
- [x] el diálogo permanece abierto — ok
- [x] la tasa editada persiste — tasa=25
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/cuentas/2/tasa"}]
- captura: screenshots/ac3-tasa-409-m390-light.png

## tasa-500 (light, mobile)

- [x] 1 PUT /cuentas/:id/tasa — PUTs=1
- [x] error 500 visible (campo o resumen) — inline= | global=Error interno del servidor (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] la tasa editada persiste — tasa=25
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/cuentas/2/tasa"}]

## generar-split-400 (light, mobile)

- [x] 1 POST /splits — POSTs=1
- [x] error 400 visible (campo o resumen) — inline= | global=Modo inválido (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/splits"}]

## generar-split-409 (light, mobile)

- [x] 1 POST /splits — POSTs=1
- [x] error 409 visible (campo o resumen) — inline= | global=El pago ya tiene un split (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/splits"}]

## generar-split-500 (light, mobile)

- [x] 1 POST /splits — POSTs=1
- [x] error 500 visible (campo o resumen) — inline= | global=Error interno del servidor (mock harness)
- [x] el diálogo permanece abierto — ok
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/splits"}]
- captura: screenshots/ac3-split-500-m390-light.png

## splits-tab-400 (light, mobile)

- [x] select deshabilitado mientras guarda — ok
- [x] 1 PUT /settings/split — PUTs=1
- [x] el valor revierte al valor válido tras el error — antes=enteros (truncado a 1 Bs) | después=enteros (truncado a 1 Bs)
- [x] error inline visible con aria-live=polite — {"text":"Modo inválido (mock harness)","srOnly":false}
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/settings/split"}]

## splits-tab-409 (light, mobile)

- [x] select deshabilitado mientras guarda — ok
- [x] 1 PUT /settings/split — PUTs=1
- [x] el valor revierte al valor válido tras el error — antes=enteros (truncado a 1 Bs) | después=enteros (truncado a 1 Bs)
- [x] error inline visible con aria-live=polite — {"text":"Conflicto al guardar el modo (mock harness)","srOnly":false}
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/settings/split"}]
- captura: screenshots/ac3-splits-tab-409-m390-light.png

## splits-tab-500 (light, mobile)

- [x] select deshabilitado mientras guarda — ok
- [x] 1 PUT /settings/split — PUTs=1
- [x] el valor revierte al valor válido tras el error — antes=enteros (truncado a 1 Bs) | después=enteros (truncado a 1 Bs)
- [x] error inline visible con aria-live=polite — {"text":"Error interno del servidor (mock harness)","srOnly":false}
- [x] 0 toasts de error (sonner) — ok
- [x] 0 unhandledrejection — ok
- [x] 0 errores de consola — []
- [x] 0 escrituras no mockeadas — []
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"PUT","path":"/api/v1/settings/split"}]
