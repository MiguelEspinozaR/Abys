# AC1 — casos

| caso | tema | resultado | checks | detalle de fallos |
|---|---|---|---|---|
| registrar | light | PASS | 9 | — |
| editar | light | PASS | 7 | — |
| fuente | light | PASS | 3 | — |
| cuenta | light | PASS | 3 | — |
| tasa | light | PASS | 2 | — |
| generar-split | light | PASS | 3 | — |
| splits-tab | light | PASS | 5 | — |

## registrar (light, mobile)

- [x] form con aria-labelledby=registrar-pago-titulo — ok
- [x] todos los controles del form tienen nombre accesible (51) — 51 controles
- [x] fieldset #metodo con legend — ok
- [x] fieldset #registrar-dias con legend — ok
- [x] Enter en #monto envía el formulario — submits=1
- [x] Enter en #fuente abre el listbox — select-content=1
- [x] Enter en #fuente NO envía el form — submits=1
- [x] Enter en #notas inserta salto de línea — "abc\n"
- [x] Enter en #notas NO envía el form — submits=1

## editar (light, mobile)

- [x] dialog aria-labelledby=edit-pago-titulo — ok
- [x] todos los controles del diálogo tienen nombre accesible (51) — 51 controles
- [x] Enter en #edit-monto envía el formulario — submits=1
- [x] Enter en #edit-fuente abre el listbox — select-content=1
- [x] Enter en #edit-fuente NO envía el form — ok
- [x] botón Cancelar es type=button — type=button
- [x] botón X de cierre es type=button — type=button

## fuente (light, mobile)

- [x] todos los controles del diálogo fuente tienen nombre accesible (7) — 7 controles
- [x] Enter en #fuente-alias envía el formulario — submits=1
- [x] el diálogo permanece abierto tras submit inválido — ok

## cuenta (light, mobile)

- [x] todos los controles del diálogo cuenta tienen nombre accesible (6) — 6 controles
- [x] Enter en #cuenta-alias envía el formulario — submits=1
- [x] el diálogo permanece abierto tras submit inválido — ok

## tasa (light, mobile)

- [x] todos los controles del diálogo tasa tienen nombre accesible (5) — 5 controles
- [x] cuenta General no tiene botón Editar tasa (histórica) — ok

## generar-split (light, mobile)

- [x] todos los controles del diálogo generar-split tienen nombre accesible (4) — 4 controles
- [x] Enter en #modo abre el listbox — select-content=1
- [x] Enter en #modo NO envía el form — ok

## splits-tab (light, mobile)

- [x] SplitsTab no renderiza <form> (autoguardado) — tabs-content=0, page=0
- [x] todos los controles de SplitsTab tienen nombre accesible — 1 controles
- [x] #split-modo-default-error es región aria-live=polite — aria-live=polite
- [x] cambiar el modo dispara PUT /settings/split (autoguardado) — PUTs=1
- [x] el select refleja el nuevo modo — valor=preciso (truncado al centavo)
