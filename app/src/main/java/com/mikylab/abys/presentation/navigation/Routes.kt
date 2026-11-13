package com.mikylab.abys.presentation.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.PieChart
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Rutas de navegación. Replican las del web:
 * `/` (Dashboard), `/registrar`, `/ingresos`, `/splits`, `/configuracion`, `/health`.
 */
object Routes {
    const val DASHBOARD = "dashboard"
    const val REGISTRAR = "registrar"
    const val INGRESOS = "ingresos"
    const val SPLITS = "splits"
    const val CONFIGURACION = "configuracion"
    const val HEALTH = "health"

    val bottomBarRoutes = listOf(DASHBOARD, REGISTRAR, INGRESOS, SPLITS, CONFIGURACION)
}

/** Destino de la barra inferior con su etiqueta e icono. */
enum class BottomDestination(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val group: String,
) {
    DASHBOARD(Routes.DASHBOARD, "Dashboard", Icons.Filled.Dashboard, "Finanzas"),
    REGISTRAR(Routes.REGISTRAR, "Registrar", Icons.Filled.CalendarMonth, "Finanzas"),
    INGRESOS(Routes.INGRESOS, "Ingresos", Icons.Filled.List, "Finanzas"),
    SPLITS(Routes.SPLITS, "Splits", Icons.Filled.PieChart, "Finanzas"),
    CONFIGURACION(Routes.CONFIGURACION, "Configuración", Icons.Filled.Settings, "Sistema"),
    HEALTH(Routes.HEALTH, "Health", Icons.Filled.MonitorHeart, "Sistema"),
}
