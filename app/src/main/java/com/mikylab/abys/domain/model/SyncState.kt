package com.mikylab.abys.domain.model

/**
 * Estado de sincronización de una fila local respecto al servidor.
 * Ver `docs/data-model.md` §2.1.
 */
enum class SyncState {
    /** La fila local coincide con el servidor. */
    SYNCED,

    /** Creada localmente, pendiente de `POST`. */
    PENDING_CREATE,

    /** Modificada localmente, pendiente de `PUT`. */
    PENDING_UPDATE,

    /** Marcada para borrado en el servidor. */
    PENDING_DELETE,

    /** El servidor rechazó el cambio (409/422/400): requiere decisión del usuario. */
    FAILED;

    val isPending: Boolean
        get() = this == PENDING_CREATE || this == PENDING_UPDATE || this == PENDING_DELETE
}

/** Enum de métodos de pago (BR-007): `efectivo`, `qr`, `transaccion`. */
enum class MetodoPago(val wire: String, val label: String) {
    EFECTIVO("efectivo", "Efectivo"),
    QR("qr", "QR"),
    TRANSACCION("transaccion", "Transacción");

    companion object {
        fun fromWire(value: String?): MetodoPago =
            entries.firstOrNull { it.wire == value } ?: EFECTIVO
    }
}

/** Modo de cálculo del split (BR-034). */
enum class ModoCalculo(val wire: String, val label: String) {
    REDONDEADO("redondeado", "redondeado"),
    ENTEROS("enteros", "enteros"),
    PRECISO("preciso", "preciso");

    companion object {
        val DEFAULT = PRECISO

        fun fromWire(value: String?): ModoCalculo =
            entries.firstOrNull { it.wire == value } ?: DEFAULT
    }
}

/**
 * Modo de carga de montos al registrar (`GET/PUT /settings/registrar`, v0.4.0):
 * - **Detallado**: el usuario ingresa el monto de cada día; el total se calcula solo.
 * - **Distribuido**: el usuario ingresa el total y el sistema lo reparte entre los días.
 *
 * Vive en `domain` porque forma parte del contrato con el backend (whitelist
 * `detallado|distribuido`, ver `Abys/backend/internal/handler/settings_handler.go`).
 */
enum class ModoRegistro(val wire: String, val label: String) {
    DETALLADO("detallado", "Detallado"),
    DISTRIBUIDO("distribuido", "Distribuido");

    companion object {
        val DEFAULT = DETALLADO

        fun fromWire(value: String?): ModoRegistro =
            entries.firstOrNull { it.wire == value } ?: DEFAULT
    }
}

/**
 * Modo de redondeo de la **distribución equitativa** de un total entre días
 * (`web/src/lib/distribuir.ts`, espeja `splitcalc`): el sobrante se asigna al último día.
 */
enum class ModoDistribucion(val wire: String, val label: String) {
    REDONDEADO("redondeado", "Redondeado (1 Bs)"),
    ENTEROS("enteros", "Enteros (1 Bs)"),
    PRECISO("preciso", "Preciso (centavos)");

    companion object {
        val DEFAULT = PRECISO

        fun fromWire(value: String?): ModoDistribucion =
            entries.firstOrNull { it.wire == value } ?: DEFAULT
    }
}
