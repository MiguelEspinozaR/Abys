package com.mikylab.abys.presentation.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.mikylab.abys.presentation.configuracion.ConfiguracionScreen
import com.mikylab.abys.presentation.dashboard.DashboardScreen
import com.mikylab.abys.presentation.health.HealthScreen
import com.mikylab.abys.presentation.ingresos.IngresosScreen
import com.mikylab.abys.presentation.registrar.RegistrarScreen
import com.mikylab.abys.presentation.splits.SplitsScreen

/**
 * Navegación principal de la app.
 *
 * Replica la navegación del web (6 secciones, agrupadas en "Finanzas" y "Sistema"):
 * en móvil se usa una `NavigationBar` inferior en lugar del sidebar.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AbysApp(modifier: Modifier = Modifier) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination
    val currentRoute = currentDestination?.route

    val titulo = BottomDestination.entries
        .firstOrNull { destino ->
            currentDestination?.hierarchy?.any { it.route == destino.route } == true
        }?.label ?: "Abys"

    Scaffold(
        modifier = modifier,
        topBar = { TopAppBar(title = { Text(titulo) }) },
        bottomBar = {
            NavigationBar {
                BottomDestination.entries.filter { it.route in Routes.bottomBarRoutes }
                    .forEach { destino ->
                        val seleccionado = currentDestination?.hierarchy
                            ?.any { it.route == destino.route } == true
                        NavigationBarItem(
                            selected = seleccionado,
                            onClick = {
                                if (!seleccionado) {
                                    navController.navigate(destino.route) {
                                        popUpTo(Routes.DASHBOARD) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = { Icon(destino.icon, contentDescription = destino.label) },
                            label = { Text(destino.label) },
                        )
                    }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.DASHBOARD,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Routes.DASHBOARD) { DashboardScreen() }
            composable(Routes.REGISTRAR) { RegistrarScreen() }
            composable(Routes.INGRESOS) { IngresosScreen() }
            composable(Routes.SPLITS) { SplitsScreen() }
            composable(Routes.CONFIGURACION) { ConfiguracionScreen() }
            composable(Routes.HEALTH) { HealthScreen() }
        }
    }
}
