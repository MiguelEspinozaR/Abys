# AC5 — casos

| caso | tema | resultado | checks | detalle de fallos |
|---|---|---|---|---|
| comprobante-pdf | light | PASS | 3 | — |
| comprobante-11mb | light | PASS | 2 | — |
| comprobante-drop-11mb | light | PASS | 2 | — |
| comprobante-valido-ocr | light | PASS | 8 | — |
| pago-200-comprobante-400 | light | PASS | 9 | — |
| reintentar-comprobante | light | PASS | 3 | — |
| logo-invalidos | light | PASS | 4 | — |
| logo-qr-validos | light | PASS | 4 | — |

## comprobante-pdf (light, mobile)

- [x] PDF rechazado con error inline — El archivo debe ser una imagen PNG, JPG, WEBP o GIF.
- [x] 0 requests de subida — writes=0
- [x] sin barra de progreso — ok

## comprobante-11mb (light, mobile)

- [x] 11MB rechazado con error inline — El archivo debe pesar como máximo 10 MB.
- [x] 0 requests de subida — writes=0
- captura: screenshots/ac5-comprobante-11mb-m390-light.png

## comprobante-drop-11mb (light, mobile)

- [x] drop de 11MB rechazado con error inline — drop={"ok":true} err=El archivo debe pesar como máximo 10 MB.
- [x] 0 requests de subida por drop — writes=0

## comprobante-valido-ocr (light, mobile)

- [x] nombre del archivo visible (comprobante) — ok
- [x] tamaño visible en KB (comprobante) — ok
- [x] sin error con archivo válido — ok
- [x] barra de progreso visible durante la lectura — ok
- [x] progressbar con aria-label descriptivo — Progreso de lectura del comprobante
- [x] estado de OCR anunciado en región aria-live=polite — durante=Leyendo comprobante… | después=Comprobante leído: Monto 265,00 Bs · Fecha jue, 5 nov 2026
- [x] OCR autocompleta monto (265,00) — monto=265,00
- [x] OCR autocompleta notas con referencia — Referencia: 1234567890 — pago mensual de servicios del mes d

## pago-200-comprobante-400 (light, mobile)

- [x] exactamente 1 POST /pagos (no se re-crea el pago) — POSTs=1
- [x] 1 intento de comprobante — uploads=1
- [x] error de comprobante inline visible — La imagen del comprobante no es válida (mock harness)
- [x] botón "Reintentar comprobante" visible — ok
- [x] botón "Ir a ingresos" visible — ok
- [x] sigue en /registrar (pago ya guardado) — http://localhost:5178/registrar
- [x] sin confirmación de descarte al reintentar upload — ok
- [x] "Ir a ingresos" navega sin bloqueo — http://localhost:5178/ingresos
- [x] no se creó un segundo pago — POSTs=1
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"},{"method":"POST","path":"/api/v1/pagos/99999/comprobante"}]
- captura: screenshots/ac5-comprobante-reintentar-m390-light.png

## reintentar-comprobante (light, mobile)

- [x] reintentar solo sube el comprobante (1 POST /pagos) — POSTs=1
- [x] 2 uploads de comprobante (fallo + reintento) — uploads=2
- [x] tras reintento exitoso navega a /ingresos — http://localhost:5178/ingresos
- respuestas mockeadas 4xx/5xx (no cuentan como error de consola): 1
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/pagos"},{"method":"POST","path":"/api/v1/pagos/99999/comprobante"},{"method":"POST","path":"/api/v1/pagos/99999/comprobante"}]

## logo-invalidos (light, mobile)

- [x] logo PDF rechazado con error inline — {"id":"logo-error-1","text":"El archivo debe ser una imagen PNG, JPG, WEBP o GIF."}
- [x] logo 11MB rechazado con error inline — El archivo debe pesar como máximo 10 MB.
- [x] 0 requests de subida de logo — writes=0
- [x] logo no muestra nombre/tamaño del archivo — ok

## logo-qr-validos (light, mobile)

- [x] logo válido hace 1 POST /fuentes/:id/logo (mock) — POSTs=1
- [x] sin error tras subir logo válido — ok
- [x] QR PDF rechazado con error inline — El archivo debe ser una imagen PNG, JPG, WEBP o GIF.
- [x] 0 requests de subida de QR — writes=0
- escrituras mockeadas: [{"method":"POST","path":"/api/v1/fuentes/1/logo"}]
