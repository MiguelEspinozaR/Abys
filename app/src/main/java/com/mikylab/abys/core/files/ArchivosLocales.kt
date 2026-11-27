package com.mikylab.abys.core.files

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File

/**
 * Utilidades para archivos subidos (comprobantes, QR y logos).
 *
 * Replica la validación del web (`lib/uploads.ts`, SPEC forms-a11y R5): solo imágenes
 * PNG/JPG/WEBP/GIF y **máximo 10 MB** (default `MaxUploadSize` del backend). El archivo
 * elegido con el Photo Picker se copia a la caché de la app para que el worker de sync
 * pueda enviarlo después aunque el proveedor revoque el permiso temporal.
 */
object ArchivosLocales {

    const val MAX_UPLOAD_MB = 10
    const val MAX_UPLOAD_BYTES = MAX_UPLOAD_MB.toLong() * 1024 * 1024

    private val TIPOS_PERMITIDOS = setOf(
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
    )

    /** Devuelve el mensaje de error o `null` si el archivo es aceptable. */
    fun validar(mime: String?, bytes: Long): String? {
        if (mime == null || mime !in TIPOS_PERMITIDOS) {
            return "El archivo debe ser una imagen PNG, JPG, WEBP o GIF."
        }
        if (bytes > MAX_UPLOAD_BYTES) {
            return "El archivo debe pesar como máximo $MAX_UPLOAD_MB MB."
        }
        return null
    }

    sealed interface Resultado {
        data class Ok(val ruta: String) : Resultado
        data class Error(val mensaje: String) : Resultado
    }

    /**
     * Valida y copia el contenido de [uri] a `filesDir/adjuntos/<prefijo>_<timestamp>.<ext>`.
     * Se usa el almacenamiento **persistente** (no la caché) para que el worker de sync pueda
     * subir el archivo más tarde aunque el sistema libere espacio.
     */
    fun copiarArchivo(context: Context, uri: Uri, prefijo: String): Resultado {
        val resolver = context.contentResolver
        val mime = resolver.getType(uri)
        val tamano = consultarTamano(context, uri)
        validar(mime, tamano)?.let { return Resultado.Error(it) }

        val directorio = File(context.filesDir, "adjuntos").apply { mkdirs() }
        val extension = extensionPara(mime, uri)
        val destino = File(
            directorio,
            "${prefijo}_${System.currentTimeMillis()}.$extension",
        )
        return try {
            val copiados = resolver.openInputStream(uri)?.use { entrada ->
                destino.outputStream().use { salida ->
                    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                    var total = 0L
                    while (true) {
                        val leidos = entrada.read(buffer)
                        if (leidos < 0) break
                        total += leidos
                        if (total > MAX_UPLOAD_BYTES) {
                            return Resultado.Error(
                                "El archivo debe pesar como máximo $MAX_UPLOAD_MB MB.",
                            )
                        }
                        salida.write(buffer, 0, leidos)
                    }
                    total
                }
            }
            if (copiados == null || copiados == 0L) {
                destino.delete()
                Resultado.Error("No se pudo leer el archivo seleccionado.")
            } else {
                Resultado.Ok(destino.absolutePath)
            }
        } catch (e: Exception) {
            destino.delete()
            Resultado.Error("No se pudo leer el archivo seleccionado.")
        }
    }

    private fun consultarTamano(context: Context, uri: Uri): Long {
        val columnas = arrayOf(OpenableColumns.SIZE)
        return runCatching {
            context.contentResolver.query(uri, columnas, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getLong(0) else -1L
            } ?: -1L
        }.getOrDefault(-1L)
    }

    private fun extensionPara(mime: String?, uri: Uri): String = when (mime) {
        "image/png" -> "png"
        "image/webp" -> "webp"
        "image/gif" -> "gif"
        "image/jpeg" -> "jpg"
        else -> uri.lastPathSegment
            ?.substringAfterLast('.', "")
            ?.lowercase()
            ?.takeIf { it in setOf("png", "jpg", "jpeg", "webp", "gif") }
            ?: "jpg"
    }
}
