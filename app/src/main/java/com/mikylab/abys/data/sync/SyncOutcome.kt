package com.mikylab.abys.data.sync

/**
 * Resultado de una operación de sincronización.
 *
 * Vive en la capa de **datos** (no en `androidx.work`) para que los procesadores no dependan
 * del framework de trabajo en segundo plano: los *workers* traducen este resultado a
 * `ListenableWorker.Result`.
 */
enum class SyncOutcome {

    /** La operación se completó correctamente. */
    OK,

    /**
     * Fallo **reintentable** (sin red, 5xx): el worker debe reintentar con backoff exponencial.
     */
    RETRY,

    /**
     * Fallo **terminal** (URL del backend inválida, error inesperado): reintentar no ayudaría.
     */
    FATAL,
}
