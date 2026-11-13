# Instrucciones Android — proyecto abys-gestion

## Contexto del proyecto
- Objetivo: crear la **versión Android** de la app web existente, replicando su comportamiento y usando el **mismo backend/API**.
- En la raíz del proyecto está clonado el repositorio de referencia: `Abys/` (no modificar salvo que se pida explícitamente).
  - `Abys/backend/`: API Go + Gin + PostgreSQL (pgx/v5). Rutas en `Abys/backend/internal/router/router.go`, handlers en `internal/handler/`, modelos/DTOs en `internal/model/`, lógica en `internal/service/`, migraciones en `migrations/`.
  - `Abys/web/`: frontend React + TypeScript + Vite (`web/src/features/` por vista: dashboard, registrar, ingresos, splits, configuracion, health).
  - `Abys/backlog/`: documentación clave — `api.md` (endpoints), `arquitectura.md`, `reglas-de-negocio.md`, etc. **Usar como fuente de verdad funcional**.
  - `Abys/README.md` y `.env.example`: stack y configuración.

## Fuente de verdad (antes de implementar)
1. **API/contratos**: extraer de `Abys/backlog/api.md` y confirmar con `Abys/backend/internal/router/router.go` + handlers/models.
   - Base: `/api/v1`. Errores: `{ "error": { "code", "message", "details" } }` (400/404/409/422/500).
   - Convenciones: montos en centavos enteros (`monto_enteros`, 26500=265.00 Bs), tasas en basis points (`tasa_bps`, 2000=20%), zona `America/La_Paz` (UTC-4).
   - Áreas: pagos y días trabajados (+ comprobante/OCR en cliente web), fuentes (+ logo), cuentas/tasas/QR/historial, splits y transacciones, dashboard (summary/weekly/monthly/yearly/history), health, settings/split. Estáticos `/uploads`.
2. **Comportamiento y reglas**: leer `Abys/backlog/reglas-de-negocio.md` y la lógica en `internal/service/` y `internal/splitcalc/` para replicar reglas (splits, inmutabilidad, transacciones realizadas, cuenta General, etc.).
3. **UX/funcionalidad**: mapear vistas y flujos desde `Abys/web/src/features/` y servicios/API del frontend web a pantallas Android equivalentes.

## Artefactos a generar/mantener en este proyecto (Android)
- `docs/api-contract.md`: endpoints, métodos, params/body, respuestas/errores, modelos y convenciones (derivado de Abys).
- `docs/feature-matrix.md`: matriz web → Android (pantalla/flujo, comportamiento, estado, endpoints usados, prioridad, estrategia offline/sync por entidad).
- `docs/data-model.md`: mapeo modelos web/backend → entidades Room, relaciones, claves, campos de sync (estado pendiente, updatedAt/version, etc.) y repositorios.
- `docs/parallel-plan.md`: desglose de trabajo y asignación por áreas para paralelizar sin solaparse.
- Mantener estos documentos actualizados cuando se descubran detalles en `Abys/`.

## Tareas iniciales (arranque del proyecto)
1. **Estructura de paquetes/módulos** (Clean Architecture): definir `data` (local/Room, remote/Retrofit, repos impl, mappers, sync/workers), `domain` (modelos, repos interfaces, casos de uso), `presentation` (Compose UI, navegación, ViewModels/UiState) adaptada al proyecto.
2. **Esquemas Room**: entidades/DAOs/Database y migraciones locales basadas en modelos/reglas de `Abys` (pagos, dias_trabajados, fuentes, cuentas, historial_tasas, splits, transacciones, settings; considerar adjuntos y cuenta General) con soporte para estado de sincronización.
3. **Red y repositorios offline-first**: configurar Retrofit/OkHttp (base URL, serialización, interceptores), almacenamiento seguro de tokens, y repositorios que implementen lectura/escritura local-first + sincronización con el backend respetando reglas (inmutabilidad, transacciones realizadas, recálculos).
4. **Sincronización**: workers de WorkManager (periodicidad y trigger por conectividad) para push de pendientes y pull/refresh, con manejo de errores/conflictos.
5. **UI base (Compose/M3)**: navegación y pantallas principales equivalentes al web (`Abys/web/src/features`: dashboard, registrar, ingresos, splits, configuracion, health) consumiendo estado desde Room vía ViewModels.

## Stack y requisitos técnicos obligatorios (Android nativo, Offline-First)
- **Lenguaje y UI**: Kotlin puro + **Jetpack Compose** con **Material Design 3** (UI moderna, adaptada a móvil).
- **Arquitectura**: Clean Architecture (capas **data**, **domain**, **presentation**) + patrón **MVVM** (ViewModel + UiState/estado unidireccional).
- **Base de datos local (Offline-First)**: **Room (SQLite)** como almacenamiento local.
  - La UI debe **leer y escribir primero en Room** para garantizar velocidad y disponibilidad sin conexión (single source of truth local).
  - Modelar entidades/relaciones según los modelos y reglas del backend/web (`Abys/`), respetando centavos (`monto_enteros`) y bps (`tasa_bps`).
- **Comunicación con backend remoto (mismo API de Abys)**: **Retrofit + OkHttp** contra `/api/v1`.
  - Serialización/mapeo alineado al backend; manejo de errores `{error:{code,message,details}}`; uploads multipart donde aplique (comprobantes, logos, QR).
  - **Autenticación segura**: guardar tokens/credenciales en **EncryptedSharedPreferences** (nunca en texto plano).
- **Sincronización en segundo plano**: **WorkManager** para sincronizar Room ↔ servidor de forma periódica y/o al recuperar conectividad (cola de operaciones pendientes, reintentos, resolución coherente con reglas de negocio/inmutabilidad).
- **Proyecto**: inspeccionar primero la estructura real en esta raíz y adaptarse (`settings.gradle*`, `build.gradle*`/`build.gradle.kts`, `gradle/libs.versions.toml`, módulos, `AndroidManifest.xml`). No actualizar dependencias si no es necesario. DI (p. ej. Hilt) si encaja. No introducir secretos; configurar base URL/entornos adecuadamente.

## Paralelización del desarrollo (varios agentes/sesiones)
- **Regla de oro**: dividir por áreas **sin solapamiento de archivos/módulos**; congelar contratos compartidos antes de trabajar en paralelo.
- **Fase 0 (secuencial, 1 agente)**: análisis de `Abys/` y creación de `docs/api-contract.md`, `docs/feature-matrix.md` y `docs/parallel-plan.md`; definir estructura de módulos/paquetes, modelos compartidos e interfaces de red/repositorio.
- **Fase 1 (paralelo, tras congelar contratos)** — ejemplos de particiones independientes:
  - *Networking/Core*: cliente API, interceptores/auth, DTOs y mapeos, manejo de errores y base URL.
  - *Data*: repositorios e integraciones por dominio (pagos, fuentes, cuentas, splits/transacciones, dashboard, settings).
  - *UI por feature*: pantallas/navegación y ViewModels por flujo (dashboard, registrar, ingresos, splits, configuración, health), sin tocar core compartido salvo interfaces acordadas.
  - *Infra*: configuración Gradle/módulos, DI, tema/design system, utilidades de formato (Bs/fechas), tests.
- **Fase 2 (integración)**: merge/integración, resolver conflictos, revisión de consistencia y verificación (`./gradlew assembleDebug`, `./gradlew test`/lint según corresponda; en Windows `gradlew.bat`).
- **Coordinación**: cada agente debe declarar alcance (archivos/paquetes) y no modificar fuera de él; cambios en modelos/contratos compartidos se hacen de forma centralizada y se comunican antes de continuar. Usar ramas/worktrees si hay ediciones paralelas intensas.
- **Límites**: modelos gratuitos tienen cupos/velocidad; paralelizar en lotes acotados y priorizar features según `docs/feature-matrix.md`.

## Verificación y entrega
- Tras cambios, compilar/tests/lint cuando sea posible y reportar comandos y resultados.
- Si no se puede ejecutar algo en el entorno, indicarlo claramente con pasos de validación manual.
- Explicar brevemente cambios, riesgos y cómo validar contra el backend existente.
