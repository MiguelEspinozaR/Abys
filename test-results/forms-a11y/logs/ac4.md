# AC4 — casos

| caso | tema | resultado | checks | detalle de fallos |
|---|---|---|---|---|
| registrar-nav | light | PASS | 10 | — |
| registrar-limpio | light | PASS | 2 | — |
| registrar-tras-guardar | light | PASS | 3 | — |
| editar-close | dark | PASS | 6 | — |
| editar-escape | light | PASS | 3 | — |
| editar-backdrop | light | PASS | 12 | — |
| editar-nav | light | PASS | 3 | — |
| registrar-ocr-sucio | light | PASS | 4 | — |
| fuente-nav | light | PASS | 9 | — |
| fuente-close | dark | PASS | 16 | — |
| cuenta-nav | light | PASS | 9 | — |
| cuenta-close | dark | PASS | 16 | — |
| tasa-nav | light | PASS | 9 | — |
| tasa-close | dark | PASS | 16 | — |

## registrar-nav (light, desktop)

- [x] enlace "Ingresos" visible para clic real — links visibles=1
- [x] clic real con cambios muestra ConfirmarDescarte — ok
- [x] título ¿Descartar cambios? — ¿Descartar cambios?
- [x] foco inicial en "Seguir editando" — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] no se navegó (bloqueado) — http://localhost:5178/registrar
- [x] "Seguir editando" conserva los cambios — dialog closed=true, monto=100,00
- [x] R4.5: foco tras "Seguir editando" no cae en BODY — {"tag":"A","id":"","text":"Ingresos","isBody":false,"insideForm":false,"inDialog":null}
- [x] OBS-2: foco restaurado en el enlace disparador (ACEPTADO, fuera del form) — {"tag":"A","id":"","text":"Ingresos","isBody":false,"insideForm":false,"inDialog":null}
- [x] "Descartar cambios" navega a /ingresos — http://localhost:5178/ingresos
- [x] descartar NO guarda el pago — POSTs=0
- captura: screenshots/ac4-confirm-registrar-desktop-light.png

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
- [x] R4.5: foco tras "Seguir editando" en el diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] "Descartar cambios" cierra el diálogo — ok
- [x] descartar NO guarda (0 PUT) — PUTs=0
- captura: screenshots/ac4-confirm-editar-m390-dark.png

## editar-escape (light, mobile)

- [x] Escape con cambios muestra ConfirmarDescarte — ok
- [x] Escape en la confirmación = seguir editando — confirm closed=true, edit open=true, monto=300,00
- [x] R4.5: foco tras Escape seguro en el diálogo (no BODY) — {"tag":"INPUT","id":"edit-monto","text":"","isBody":false,"insideForm":true,"inDialog":"dialog-content"}

## editar-backdrop (light, mobile)

- [x] diálogo Editar no cubre el punto de overlay (8,80) — {"x":16,"y":42.203125,"width":358,"height":759.59375}
- [x] clic real en overlay con cambios muestra ConfirmarDescarte — ok
- [x] título ¿Descartar cambios? — ¿Descartar cambios?
- [x] foco inicial en "Seguir editando" — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] el diálogo de edición sigue abierto — ok
- [x] no se navegó (bloqueado) — http://localhost:5178/ingresos
- [x] "Seguir editando" conserva los cambios — monto=350,00
- [x] R4.5: foco tras overlay en el form (no BODY) — {"tag":"INPUT","id":"edit-monto","text":"","isBody":false,"insideForm":true,"inDialog":"dialog-content"}
- [x] "Descartar cambios" cierra el diálogo — ok
- [x] descartar no navega — http://localhost:5178/ingresos
- [x] descartar NO guarda (0 PUT) — PUTs=0
- [x] reapertura limpia cierra con X sin confirmación — dialogs=0, alerts=0
- captura: screenshots/ac4-confirm-editar-backdrop-m390-light.png

## editar-nav (light, mobile)

- [x] navegación SPA con diálogo abierto y sucio muestra confirmación — ok
- [x] R4.5: foco tras "Seguir editando" (nav) en el diálogo (no BODY) — {"tag":"INPUT","id":"edit-monto","text":"","isBody":false,"insideForm":true,"inDialog":"dialog-content"} url=http://localhost:5178/ingresos
- [x] descartar navega a /splits — http://localhost:5178/splits

## registrar-ocr-sucio (light, mobile)

- [x] OCR autocompleta el monto — monto=265,00
- [x] datos autocompletados por OCR también disparan la guardia — ok
- [x] seguir editando conserva el formulario — ok
- [x] R4.5: foco tras "Seguir editando" (OCR) en el form (no BODY) — {"tag":"INPUT","id":"monto","text":"","isBody":false,"insideForm":true,"inDialog":null}

## fuente-nav (light, mobile)

- [x] navegación SPA con Fuente dirty muestra ConfirmarDescarte — screenshots/ac4-confirm-fuente-nav-m390-light.png
- [x] título ¿Descartar cambios? — ¿Descartar cambios?
- [x] foco inicial en "Seguir editando" — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] no se navegó (bloqueado) — http://localhost:5178/configuracion
- [x] "Seguir editando" conserva el formulario y no navega — {"valor":"Fuente harness","url":"http://localhost:5178/configuracion","dialogoAbierto":true}
- [x] R4.5: foco tras "Seguir editando" en el form/diálogo (no BODY) — {"tag":"INPUT","id":"fuente-alias","text":"","isBody":false,"insideForm":true,"inDialog":"dialog-content"}
- [x] "Descartar cambios" navega a /ingresos — http://localhost:5178/ingresos
- [x] descartar no deja diálogos abiertos — ok
- [x] 0 escrituras de API — {"writes":0,"unexpected":[]}

## fuente-close (dark, mobile)

- [x] cierre por X muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (X) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (X) conserva el formulario — {"valor":"Fuente harness"}
- [x] R4.5: foco tras X + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] cierre por Escape muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (Escape) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (Escape) conserva el formulario — {"valor":"Fuente harness"}
- [x] R4.5: foco tras Escape + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] cierre por backdrop muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (backdrop) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (backdrop) conserva el formulario — {"valor":"Fuente harness"}
- [x] R4.5: foco tras backdrop + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] "Descartar cambios" cierra el diálogo sin navegar — http://localhost:5178/configuracion
- [x] 0 escrituras de API — {"writes":0,"unexpected":[]}
- [x] cierre sin dirty cierra directo sin confirmación — {"alertas":0,"dialogos":0}
- [x] cierre sin dirty sin escrituras de API — {"writes":0}

## cuenta-nav (light, mobile)

- [x] navegación SPA con Cuenta dirty muestra ConfirmarDescarte — screenshots/ac4-confirm-cuenta-nav-m390-light.png
- [x] título ¿Descartar cambios? — ¿Descartar cambios?
- [x] foco inicial en "Seguir editando" — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] no se navegó (bloqueado) — http://localhost:5178/configuracion
- [x] "Seguir editando" conserva el formulario y no navega — {"valor":"Cuenta harness","url":"http://localhost:5178/configuracion","dialogoAbierto":true}
- [x] R4.5: foco tras "Seguir editando" en el form/diálogo (no BODY) — {"tag":"INPUT","id":"cuenta-alias","text":"","isBody":false,"insideForm":true,"inDialog":"dialog-content"}
- [x] "Descartar cambios" navega a /ingresos — http://localhost:5178/ingresos
- [x] descartar no deja diálogos abiertos — ok
- [x] 0 escrituras de API — {"writes":0,"unexpected":[]}

## cuenta-close (dark, mobile)

- [x] cierre por X muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (X) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (X) conserva el formulario — {"valor":"Cuenta harness"}
- [x] R4.5: foco tras X + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] cierre por Escape muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (Escape) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (Escape) conserva el formulario — {"valor":"Cuenta harness"}
- [x] R4.5: foco tras Escape + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] cierre por backdrop muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (backdrop) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (backdrop) conserva el formulario — {"valor":"Cuenta harness"}
- [x] R4.5: foco tras backdrop + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] "Descartar cambios" cierra el diálogo sin navegar — http://localhost:5178/configuracion
- [x] 0 escrituras de API — {"writes":0,"unexpected":[]}
- [x] cierre sin dirty cierra directo sin confirmación — {"alertas":0,"dialogos":0}
- [x] cierre sin dirty sin escrituras de API — {"writes":0}

## tasa-nav (light, mobile)

- [x] navegación SPA con Tasa dirty muestra ConfirmarDescarte — screenshots/ac4-confirm-tasa-nav-m390-light.png
- [x] título ¿Descartar cambios? — ¿Descartar cambios?
- [x] foco inicial en "Seguir editando" — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] no se navegó (bloqueado) — http://localhost:5178/configuracion
- [x] "Seguir editando" conserva el formulario y no navega — {"valor":"9,99","url":"http://localhost:5178/configuracion","dialogoAbierto":true}
- [x] R4.5: foco tras "Seguir editando" en el form/diálogo (no BODY) — {"tag":"INPUT","id":"tasa-2","text":"","isBody":false,"insideForm":true,"inDialog":"dialog-content"}
- [x] "Descartar cambios" navega a /ingresos — http://localhost:5178/ingresos
- [x] descartar no deja diálogos abiertos — ok
- [x] 0 escrituras de API — {"writes":0,"unexpected":[]}

## tasa-close (dark, mobile)

- [x] cierre por X muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (X) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (X) conserva el formulario — {"valor":"9,99"}
- [x] R4.5: foco tras X + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] cierre por Escape muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (Escape) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (Escape) conserva el formulario — {"valor":"9,99"}
- [x] R4.5: foco tras Escape + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] cierre por backdrop muestra ConfirmarDescarte — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] foco inicial en "Seguir editando" (backdrop) — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}
- [x] "Seguir editando" (backdrop) conserva el formulario — {"valor":"9,99"}
- [x] R4.5: foco tras backdrop + "Seguir editando" en el form/diálogo (no BODY) — {"tag":"BUTTON","id":"","text":"Close","isBody":false,"insideForm":false,"inDialog":"dialog-content"}
- [x] "Descartar cambios" cierra el diálogo sin navegar — http://localhost:5178/configuracion
- [x] 0 escrituras de API — {"writes":0,"unexpected":[]}
- [x] cierre sin dirty cierra directo sin confirmación — {"alertas":0,"dialogos":0}
- [x] cierre sin dirty sin escrituras de API — {"writes":0}
