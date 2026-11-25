package com.mikylab.abys.domain.model

/**
 * Claves de la tabla local `app_settings` (clave/valor) y su correspondencia con el backend.
 *
 * Se centralizan aquí para que repositorio y workers de sincronización usen exactamente
 * las mismas claves. Ver `docs/data-model.md` §2 y `docs/api-contract.md` §7.
 */
object SettingsKeys {
    /** `GET/PUT /settings/split` → `modo_default`. */
    const val SPLIT_MODO_DEFAULT = "split_modo_default"

    /** `GET/PUT /settings/registrar` → `metodo_default`. */
    const val REGISTRAR_METODO_DEFAULT = "registrar_metodo_default"

    /** `GET/PUT /settings/registrar` → `modo_default`. */
    const val REGISTRAR_MODO_DEFAULT = "registrar_modo_default"

    /** `entityLocalId` de las operaciones de la cola para `/settings/registrar`. */
    const val ENTIDAD_REGISTRAR = "registrar"

    /** Clave del payload JSON de la cola para `/settings/registrar`. */
    const val PAYLOAD_METODO = "metodo_default"
    const val PAYLOAD_MODO = "modo_default"
}
