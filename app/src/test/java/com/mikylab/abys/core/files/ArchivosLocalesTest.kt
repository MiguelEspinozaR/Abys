package com.mikylab.abys.core.files

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Paridad con `Abys/web/src/lib/uploads.ts` (SPEC forms-a11y R5). */
class ArchivosLocalesTest {

    @Test
    fun `acepta los tipos permitidos por debajo del limite`() {
        listOf("image/png", "image/jpeg", "image/webp", "image/gif").forEach { mime ->
            assertNull(ArchivosLocales.validar(mime, 1024))
        }
    }

    @Test
    fun `acepta exactamente 10 MB`() {
        assertNull(ArchivosLocales.validar("image/png", ArchivosLocales.MAX_UPLOAD_BYTES))
    }

    @Test
    fun `rechaza mas de 10 MB`() {
        assertEquals(
            "El archivo debe pesar como máximo 10 MB.",
            ArchivosLocales.validar("image/png", ArchivosLocales.MAX_UPLOAD_BYTES + 1),
        )
    }

    @Test
    fun `rechaza tipos no permitidos`() {
        assertEquals(
            "El archivo debe ser una imagen PNG, JPG, WEBP o GIF.",
            ArchivosLocales.validar("application/pdf", 1024),
        )
    }

    @Test
    fun `rechaza mime desconocido`() {
        assertEquals(
            "El archivo debe ser una imagen PNG, JPG, WEBP o GIF.",
            ArchivosLocales.validar(null, 1024),
        )
    }
}
