package com.mikylab.abys.domain.usecase

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Límites de longitud de cuentas introducidos en el backend v1.0.0
 * (`CuentaRequest`: alias ≤ 100, numero ≤ 50, banco ≤ 100).
 */
class ValidarCuentaUseCaseTest {

    @Test
    fun `acepta una cuenta valida`() {
        assertNull(ValidarCuentaUseCase.validar("Business", "BMSC", "1016387238"))
    }

    @Test
    fun `acepta numero y banco nulos`() {
        assertNull(ValidarCuentaUseCase.validar("Business", null, null))
    }

    @Test
    fun `rechaza alias vacio o solo espacios`() {
        assertEquals(
            "el alias de la cuenta es obligatorio",
            ValidarCuentaUseCase.validar("   ", null, null),
        )
    }

    @Test
    fun `acepta alias de 100 caracteres`() {
        assertNull(ValidarCuentaUseCase.validar("a".repeat(100), null, null))
    }

    @Test
    fun `rechaza alias de 101 caracteres`() {
        assertEquals(
            "el alias no puede superar los 100 caracteres",
            ValidarCuentaUseCase.validar("a".repeat(101), null, null),
        )
    }

    @Test
    fun `rechaza numero de 51 caracteres`() {
        assertEquals(
            "el número de cuenta no puede superar los 50 caracteres",
            ValidarCuentaUseCase.validar("Business", null, "1".repeat(51)),
        )
    }

    @Test
    fun `rechaza banco de 101 caracteres`() {
        assertEquals(
            "el banco no puede superar los 100 caracteres",
            ValidarCuentaUseCase.validar("Business", "b".repeat(101), null),
        )
    }

    @Test
    fun `no cuenta los espacios exteriores del alias`() {
        assertNull(ValidarCuentaUseCase.validar(" " + "a".repeat(100) + " ", null, null))
    }
}
