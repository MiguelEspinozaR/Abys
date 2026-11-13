package com.mikylab.abys.presentation.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

/**
 * Paleta de Abys. El web usa Tailwind + shadcn con una paleta oscura por defecto;
 * aquí se replica con los mismos colores de marca (`#023749`).
 */
object AbysColors {
    val Primary = Color(0xFF023749)
    val PrimaryDark = Color(0xFF8ED0F0)
    val Secondary = Color(0xFF4C616B)
    val SecondaryDark = Color(0xFFB4CAD5)
    val Tertiary = Color(0xFFE4C852)
    val Error = Color(0xFFBA1A1A)
    val ErrorDark = Color(0xFFFFB4AB)

    // Colores de los gráficos (equivalentes a --chart-1..5 del web)
    val Chart1 = Color(0xFF3B82F6)
    val Chart2 = Color(0xFF14B8A6)
    val Chart3 = Color(0xFFE4C852)
    val Chart4 = Color(0xFFF472B6)
    val Chart5 = Color(0xFF8B5CF6)

    // Marcadores del calendario (registrar)
    val DiaNuevo = Color(0xFF10B981)
    val DiaExistente = Color(0xFF8B5CF6)
    val FechaPago = Color(0xFFF59E0B)
}

private val LightColors = lightColorScheme(
    primary = AbysColors.Primary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFCFE5F5),
    onPrimaryContainer = Color(0xFF001E2C),
    secondary = AbysColors.Secondary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD3E4EE),
    onSecondaryContainer = Color(0xFF0C1D26),
    tertiary = Color(0xFF6B5E00),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFF3E19A),
    onTertiaryContainer = Color(0xFF221B00),
    error = AbysColors.Error,
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    background = Color(0xFFFBFCFF),
    onBackground = Color(0xFF191C1E),
    surface = Color(0xFFFBFCFF),
    onSurface = Color(0xFF191C1E),
    surfaceVariant = Color(0xFFDBE4E8),
    onSurfaceVariant = Color(0xFF3F484B),
    outline = Color(0xFF6F797B),
)

private val DarkColors = darkColorScheme(
    primary = AbysColors.PrimaryDark,
    onPrimary = Color(0xFF00344F),
    primaryContainer = Color(0xFF004C6E),
    onPrimaryContainer = Color(0xFFC7E7FF),
    secondary = AbysColors.SecondaryDark,
    onSecondary = Color(0xFF24343D),
    secondaryContainer = Color(0xFF3A4B55),
    onSecondaryContainer = Color(0xFFD3E4EE),
    tertiary = Color(0xFFD7C66D),
    onTertiary = Color(0xFF383000),
    tertiaryContainer = Color(0xFF514600),
    onTertiaryContainer = Color(0xFFF3E19A),
    error = AbysColors.ErrorDark,
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF101416),
    onBackground = Color(0xFFE1E2E5),
    surface = Color(0xFF101416),
    onSurface = Color(0xFFE1E2E5),
    surfaceVariant = Color(0xFF3F484B),
    onSurfaceVariant = Color(0xFFBFC8CB),
    outline = Color(0xFF899295),
)

private val AbysTypography = Typography(
    titleLarge = TextStyle(fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold),
    titleSmall = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
    labelMedium = TextStyle(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
    labelSmall = TextStyle(fontSize = 11.sp, lineHeight = 16.sp),
)

/**
 * Tema de la app. El web arranca en **modo oscuro** por defecto; aquí se respeta el tema del
 * sistema, que es el comportamiento nativo esperado en Android.
 */
@Composable
fun AbysTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colors,
        typography = AbysTypography,
        content = content,
    )
}
