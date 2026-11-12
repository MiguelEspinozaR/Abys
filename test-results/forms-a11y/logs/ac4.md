# AC4 — casos

| caso | tema | resultado | checks | detalle de fallos |
|---|---|---|---|---|
| registrar-nav | light | PASS | 7 | — |
| registrar-limpio | light | PASS | 2 | — |
| registrar-tras-guardar | light | PASS | 3 | — |
| editar-close | dark | PASS | 5 | — |
| editar-escape | light | PASS | 2 | — |
| editar-nav | light | PASS | 2 | — |
| registrar-ocr-sucio | light | PASS | 3 | — |

## registrar-nav (light, mobile)

- [x] navegación con cambios muestra ConfirmarDescarte — ok
- [x] título ¿Descartar cambios? — ¿Descartar cambios?
- [x] foco inicial en "Seguir editando" — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] no se navegó (bloqueado) — http://localhost:5178/registrar
- [x] "Seguir editando" conserva los cambios — dialog closed=true, monto=100,00
- [x] "Descartar cambios" navega a /ingresos — http://localhost:5178/ingresos
- [x] descartar NO guarda el pago — POSTs=0
- captura: screenshots/ac4-confirm-registrar-m390-light.png

## registrar-limpio (light, mobile)

- [x] sin cambios no aparece ConfirmarDescarte — dialogs=0
- [x] navegación inmediata — http://localhost:5178/ingresos

## registrar-tras-guardar (light, mobile)

- [x] guardado exitoso navega a /ingresos — http://localhost:5178/ingresos
- [x] 1 POST /pagos — POSTs=1
- [x] sin confirmación de descarte tras guardar — ok
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"}]

## editar-close (dark, mobile)

- [x] cerrar con X y cambios muestra ConfirmarDescarte — ok
- [x] el diálogo de edición sigue abierto — ok
- [x] "Seguir editando" conserva los cambios — monto=300,00
- [x] "Descartar cambios" cierra el diálogo — ok
- [x] descartar NO guarda (0 PUT) — PUTs=0
- captura: screenshots/ac4-confirm-editar-m390-dark.png

## editar-escape (light, mobile)

- [x] Escape con cambios muestra ConfirmarDescarte — ok
- [x] Escape en la confirmación = seguir editando — confirm closed=true, edit open=true, monto=300,00

## editar-nav (light, mobile)

- [x] navegación SPA con diálogo abierto y sucio muestra confirmación — ok
- [x] descartar navega a /splits — http://localhost:5178/splits

## registrar-ocr-sucio (light, mobile)

- [x] OCR autocompleta el monto — monto=265,00
- [x] datos autocompletados por OCR también disparan la guardia — ok
- [x] seguir editando conserva el formulario — ok
