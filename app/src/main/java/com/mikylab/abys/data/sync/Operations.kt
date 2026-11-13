package com.mikylab.abys.data.sync

/** Tipos de entidad y de operación de la cola de pendientes. */
object Operations {

    // Tipos de entidad
    const val TIPO_FUENTE = "fuente"
    const val TIPO_CUENTA = "cuenta"
    const val TIPO_PAGO = "pago"
    const val TIPO_SPLIT = "split"
    const val TIPO_TRANSACCION = "transaccion"
    const val TIPO_SETTINGS = "settings"

    // Operaciones
    const val OP_UPSERT = "UPSERT"
    const val OP_DELETE = "DELETE"
    const val OP_UPLOAD = "UPLOAD"
    const val OP_SET_RATE = "SET_RATE"
    const val OP_REALIZE = "REALIZE"

    // Claves de payload
    const val PAYLOAD_ARCHIVO = "archivo"
    const val PAYLOAD_TASA = "tasa"
    const val PAYLOAD_APLICAR = "aplicar_pendientes"

    /** Backoff por reintento: 30 s * 2^intentos, con tope de 5 h. */
    fun backoffMillis(intentos: Int): Long {
        val exponent = intentos.coerceIn(0, 10)
        val base = 30_000L * (1L shl exponent)
        return base.coerceAtMost(5 * 60 * 60 * 1000L)
    }
}
