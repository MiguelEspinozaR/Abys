# AC6 — casos

| caso | tema | resultado | checks | detalle de fallos |
|---|---|---|---|---|
| registrar-teclado | light | PASS | 11 | — |
| walk-registrar | light | PASS | 1 | — |
| focus-trap-dialogos | light | PASS | 4 | — |
| splits-teclado | light | PASS | 3 | — |

## registrar-teclado (light, mobile)

- [x] primer Tab = "Saltar al contenido" — {}
- [x] #fuente alcanzable por Tab — ok
- [x] Enter abre el listbox — ok
- [x] opción elegida con teclado — valor=Essencia
- [x] #monto alcanzable por Tab — ok
- [x] días del calendario alcanzables por Tab — {"id":"","tag":"BUTTON","role":null,"slot":null,"variant":null,"text":"1","aria":""}
- [x] Enter marca el día enfocado — tiles marcados=1
- [x] submit alcanzable por Tab — ok
- [x] Enter en submit guarda el pago — POSTs=1
- [x] navega a /ingresos — http://localhost:5178/ingresos
- [x] indicador de foco ≥3:1 en 3 paradas de Tab — 
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"}]

## walk-registrar (light, mobile)

- [x] walk por /registrar: 54 paradas, todas con foco visible e indicador — 

## focus-trap-dialogos (light, mobile)

- [x] foco inicial dentro del diálogo — {"id":"fuente-alias","tag":"INPUT","text":"","inDialog":"dialog-content"}
- [x] Tab dentro del diálogo no escapa (trampa de foco) — escapes=0
- [x] Tab dentro de la confirmación no escapa — escapes=0
- [x] foco sigue dentro de la confirmación — {"id":"","tag":"BUTTON","text":"Seguir editando","inDialog":"alert-dialog-content"}

## splits-teclado (light, mobile)

- [x] Enter abre el listbox del autoguardado — ok
- [x] selección con teclado dispara el PUT — PUTs=1
- [x] el modo cambió con teclado — antes=enteros (truncado a 1 Bs) después=redondeado (half-up a 1 Bs)
