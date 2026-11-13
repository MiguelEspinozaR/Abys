package com.mikylab.abys.core.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Almacenamiento cifrado (AES256) para credenciales y configuración sensible.
 *
 * Usa `EncryptedSharedPreferences` (AndroidX Security). **Nunca** se escribe en texto plano.
 */
@Singleton
class SecureStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    private val prefs: SharedPreferences by lazy { createPrefs() }

    private fun createPrefs(): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    fun getString(key: String): String? =
        runCatching { prefs.getString(key, null) }.getOrNull()

    fun putString(key: String, value: String?) {
        runCatching { prefs.edit().apply { if (value == null) remove(key) else putString(key, value) }.apply() }
    }

    fun remove(key: String) {
        runCatching { prefs.edit().remove(key).apply() }
    }

    fun getBoolean(key: String, default: Boolean): Boolean =
        runCatching { prefs.getBoolean(key, default) }.getOrDefault(default)

    fun putBoolean(key: String, value: Boolean) {
        runCatching { prefs.edit().putBoolean(key, value).apply() }
    }

    companion object {
        const val PREFS_NAME = "abys_secure_prefs"
    }
}
