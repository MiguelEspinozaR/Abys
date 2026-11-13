// Configuración raíz del proyecto Android "Abys".
// La app es un único módulo (:app) con Clean Architecture por paquetes
// (data / domain / presentation) — ver docs/parallel-plan.md §2.

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
