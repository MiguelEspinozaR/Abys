# AC2 — casos

| caso | tema | resultado | checks | detalle de fallos |
|---|---|---|---|---|
| registrar-invalido | light | PASS | 10 | — |
| registrar-invalido-dark | dark | PASS | 1 | — |
| editar-invalido | light | PASS | 5 | — |
| editar-metodo-invalido | light | PASS | 5 | — |
| editar-monto-split | light | PASS | 2 | — |
| fuente-invalido | light | PASS | 5 | — |
| cuenta-invalido | light | PASS | 2 | — |
| tasa-invalido | light | PASS | 3 | — |
| notas-maxlength | light | PASS | 4 | — |
| notas-ocr-mayor-500 | light | PASS | 8 | — |

## registrar-invalido (light, mobile)

- [x] error inline de días visible tras submit vacío — Selecciona al menos un día
- [x] #registrar-dias aria-invalid=true + aria-describedby → error — {"invalid":"true","desc":"registrar-dias-error"}
- [x] #monto aria-invalid + aria-describedby incluye monto-error — {"invalid":"true","desc":"monto-ayuda monto-separadores monto-error"}
- [x] #fuente aria-invalid + aria-describedby incluye fuente-error — {"invalid":"true","desc":"fuente-error"}
- [x] #metodo sin aria-invalid con método seleccionado (estado inválido no alcanzable: Efectivo por defecto) — {"invalid":null,"desc":null}
- [x] ErrorSummary role=alert con ítems por campo inválido — ["Selecciona al menos un día","Selecciona una fuente","Ingresa un monto válido, p. ej. 265,00"]
- [x] título del resumen — Revisa los siguientes campos:Selecciona al menos un díaSelec
- [x] el foco va al primer campo inválido (#registrar-dias) — {"id":"registrar-dias","tag":"FIELDSET","text":"Días trabajados y fecha de pago *TrabajoPagoQuitar«‹noviembr","inDialog":null}
- [x] corregir el monto limpia su error en vivo — aria-invalid=null, ítems=2
- [x] blur con monto inválido muestra el error — Ingresa un monto válido, p. ej. 265,00
- captura: screenshots/ac2-registrar-invalido-m390-light.png

## registrar-invalido-dark (dark, mobile)

- [x] errores visibles en tema oscuro — ok
- captura: screenshots/ac2-registrar-invalido-m390-dark.png

## editar-invalido (light, mobile)

- [x] error inline de monto visible en editar — Ingresa un monto válido, p. ej. 265,00
- [x] #edit-monto aria-invalid + aria-describedby — {"invalid":"true","desc":"edit-monto-error"}
- [x] ErrorSummary en el diálogo con ítems — ["Ingresa un monto válido, p. ej. 265,00"]
- [x] foco en el primer campo inválido (#edit-monto) — {"id":"edit-monto","tag":"INPUT","text":"","inDialog":"dialog-content"}
- [x] el diálogo permanece abierto — ok
- captura: screenshots/ac2-editar-invalido-m390-light.png

## editar-metodo-invalido (light, mobile)

- [x] #edit-metodo aria-invalid=true + aria-describedby → edit-metodo-error — {"invalid":"true","desc":"edit-metodo-error","err":"Selecciona un método de pago"}
- [x] error inline de método (Selecciona un método de pago) — Selecciona un método de pago
- [x] ErrorSummary incluye el error de método — ["Selecciona un método de pago"]
- [x] el diálogo permanece abierto (sin PUT) — ok
- [x] 0 escrituras (PUT /pagos nunca se ejecuta) — writes=0, unexpected=0
- captura: screenshots/ac2-editar-metodo-invalido-m390-light.png

## editar-monto-split (light, mobile)

- [x] #edit-monto deshabilitado cuando el pago tiene split — ok
- [x] aviso visible: monto no editable con split — Pago con splitEl monto no se puede modificar si el pago tiene split (lo rechaza la API). El resto de campos sí es editab

## fuente-invalido (light, mobile)

- [x] error inline de alias visible — El alias es obligatorio
- [x] #fuente-alias aria-invalid + aria-describedby — {"invalid":"true","desc":"fuente-alias-error"}
- [x] foco en #fuente-alias — {"id":"fuente-alias","tag":"INPUT","text":"","inDialog":"dialog-content"}
- [x] hex inválido muestra error de color — Ingresa un color hexadecimal válido, p. ej. #3b82f6
- [x] modo de split aparece al activar split automático — inicial=0, tras toggle visible=true
- captura: screenshots/ac2-fuente-invalido-m390-light.png

## cuenta-invalido (light, mobile)

- [x] error inline de alias visible en cuenta — El alias es obligatorio
- [x] foco en #cuenta-alias — {"id":"cuenta-alias","tag":"INPUT","text":"","inDialog":"dialog-content"}

## tasa-invalido (light, mobile)

- [x] error inline de tasa visible — Ingresa una tasa válida entre 0 y 100
- [x] input tasa aria-invalid + aria-describedby — {"invalid":"true","desc":"tasa-2-error"}
- [x] foco en el input de tasa — {"id":"tasa-2","tag":"INPUT","text":"","inDialog":"dialog-content"}

## notas-maxlength (light, mobile)

- [x] maxLength=500 en #notas — len=500, contador=500/500
- [x] contador muestra 500/500 — 500/500
- [x] teclado no supera 500 caracteres — len=500
- [x] 500 exactos no es error — aria-invalid=null

## notas-ocr-mayor-500 (light, mobile)

- [x] OCR deja notas >500 (sin pasar por maxLength) — len=596
- [x] contador refleja >500 — 596/500
- [x] #notas aria-invalid + aria-describedby incluye notas-error — {"invalid":"true","desc":"notas-contador notas-error"}
- [x] error inline de notas visible — Máximo 500 caracteres
- [x] guardado bloqueado mientras notas >500 — POSTs=0
- [x] corregir notas limpia el error — aria-invalid=null
- [x] tras corregir, el pago se guarda — POSTs=1
- [x] navegación a /ingresos tras guardar — http://localhost:5178/ingresos
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"},{"method":"POST","path":"/api/v1/pagos/99999/comprobante"}]
- captura: screenshots/ac2-registrar-notas-ocr-m390-light.png
