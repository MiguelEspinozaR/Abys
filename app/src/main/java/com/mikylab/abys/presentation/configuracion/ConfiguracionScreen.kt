package com.mikylab.abys.presentation.configuracion

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.mikylab.abys.core.files.ArchivosLocales
import com.mikylab.abys.core.money.formatTasaBps
import com.mikylab.abys.domain.model.Cuenta
import com.mikylab.abys.domain.model.Fuente
import com.mikylab.abys.domain.model.MetodoPago
import com.mikylab.abys.domain.model.ModoCalculo
import com.mikylab.abys.domain.model.ModoRegistro
import com.mikylab.abys.presentation.components.EstadoVacio
import com.mikylab.abys.presentation.theme.colorDesdeHex
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Pantalla "Configuración" (equivalente a `/configuracion` del web) con las pestañas
 * Cuentas · Fuentes · Splits · Registro, más la pestaña **App** (URL del backend, prueba
 * de conexión y sincronización manual).
 */
@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun ConfiguracionScreen(
    modifier: Modifier = Modifier,
    viewModel: ConfiguracionViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var tab by remember { mutableIntStateOf(0) }
    var urlTexto by remember(state.baseUrl) { mutableStateOf(state.baseUrl) }

    // Diálogos (el estado de "abierto" vive en la UI; los datos y errores, en el ViewModel).
    var dialogoCuenta by remember { mutableStateOf(false) }
    var cuentaEnEdicion by remember { mutableStateOf<Cuenta?>(null) }
    var dialogoFuente by remember { mutableStateOf(false) }
    var fuenteEnEdicion by remember { mutableStateOf<Fuente?>(null) }
    var cuentaTasa by remember { mutableStateOf<Cuenta?>(null) }
    var cuentaEliminar by remember { mutableStateOf<Cuenta?>(null) }
    var fuenteEliminar by remember { mutableStateOf<Fuente?>(null) }

    // Photo Picker para QR y logos (sin permisos).
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var errorArchivo by remember { mutableStateOf<String?>(null) }
    var objetivoQr by remember { mutableStateOf<String?>(null) }
    var objetivoLogo by remember { mutableStateOf<String?>(null) }

    fun copiarYSubir(uri: Uri, prefijo: String, onRuta: (String) -> Unit) {
        scope.launch {
            when (val resultado = withContext(Dispatchers.IO) {
                ArchivosLocales.copiarArchivo(context, uri, prefijo)
            }) {
                is ArchivosLocales.Resultado.Ok -> {
                    errorArchivo = null
                    onRuta(resultado.ruta)
                }

                is ArchivosLocales.Resultado.Error -> errorArchivo = resultado.mensaje
            }
        }
    }

    val pickerQr = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        val localId = objetivoQr
        objetivoQr = null
        if (uri != null && localId != null) {
            copiarYSubir(uri, "qr") { viewModel.subirQr(localId, it) }
        }
    }
    val pickerLogo = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        val localId = objetivoLogo
        objetivoLogo = null
        if (uri != null && localId != null) {
            copiarYSubir(uri, "logo") { viewModel.subirLogo(localId, it) }
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(
                text = "Administra fuentes de ingreso, cuentas de distribución y splits.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            TabRow(selectedTabIndex = tab) {
                listOf("Cuentas", "Fuentes", "Splits", "Registro", "App").forEachIndexed { index, titulo ->
                    Tab(
                        selected = tab == index,
                        onClick = { tab = index },
                        text = { Text(titulo) },
                    )
                }
            }
        }

        state.mensaje?.let { mensaje ->
            item {
                Text(
                    text = mensaje,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }

        when (tab) {
            0 -> {
                if (state.sumaTasasNoGeneral > 10_000) {
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "Suma de tasas > 100%",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                                Text(
                                    text = "La suma de tasas de las cuentas " +
                                        "(${state.sumaTasasNoGeneral.formatTasaBps()}) supera el 100%. " +
                                        "La API rechazará nuevos splits hasta corregirlo.",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                }
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Cuentas (${state.cuentas.size}) · suma otras: " +
                                state.sumaTasasNoGeneral.formatTasaBps(),
                            style = MaterialTheme.typography.titleSmall,
                        )
                        TextButton(
                            onClick = {
                                viewModel.limpiarErrorCuenta()
                                cuentaEnEdicion = null
                                dialogoCuenta = true
                            },
                        ) {
                            Text("Nueva cuenta")
                        }
                    }
                }
                state.errorCuenta?.let { error ->
                    item {
                        Text(
                            text = error,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
                errorArchivo?.let { error ->
                    item {
                        Text(
                            text = error,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
                if (state.cuentas.isEmpty()) {
                    item { EstadoVacio(titulo = "No hay cuentas configuradas.") }
                }
                items(state.cuentas, key = { it.localId }) { cuenta ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(cuenta.alias, style = MaterialTheme.typography.titleSmall)
                                    Text(
                                        text = "${cuenta.banco ?: "—"}" +
                                            (cuenta.numero?.let { " · $it" } ?: ""),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = cuenta.tasa.bps.formatTasaBps(),
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    if (cuenta.esGeneral) {
                                        AssistChip(onClick = {}, label = { Text("Residual (derivada)") })
                                        Text(
                                            text = "= 100% − otras · no configurable",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Miniatura(
                                    modelo = viewModel.modeloImagen(cuenta.qrRuta),
                                    descripcion = "QR de ${cuenta.alias}",
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = if (cuenta.qrRuta == null) {
                                            "Sin QR cargado"
                                        } else {
                                            "QR cargado"
                                        },
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    if (cuenta.syncState.isPending) {
                                        Text(
                                            text = "Pendiente de sincronizar",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.tertiary,
                                        )
                                    }
                                }
                            }

                            FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                if (!cuenta.esGeneral) {
                                    TextButton(
                                        onClick = {
                                            viewModel.limpiarErrorCuenta()
                                            cuentaEnEdicion = cuenta
                                            dialogoCuenta = true
                                        },
                                    ) {
                                        Text("Editar")
                                    }
                                    TextButton(
                                        onClick = {
                                            viewModel.limpiarErrorCuenta()
                                            cuentaTasa = cuenta
                                        },
                                    ) {
                                        Text("Tasa")
                                    }
                                }
                                TextButton(onClick = { viewModel.abrirHistorial(cuenta) }) {
                                    Text("Historial")
                                }
                                TextButton(
                                    onClick = {
                                        objetivoQr = cuenta.localId
                                        pickerQr.launch(
                                            PickVisualMediaRequest(
                                                ActivityResultContracts.PickVisualMedia.ImageOnly,
                                            ),
                                        )
                                    },
                                ) {
                                    Text(if (cuenta.qrRuta == null) "Subir QR" else "Cambiar QR")
                                }
                                if (cuenta.qrRuta != null) {
                                    TextButton(onClick = { viewModel.eliminarQr(cuenta.localId) }) {
                                        Text("Quitar QR")
                                    }
                                }
                                if (!cuenta.esGeneral) {
                                    TextButton(onClick = { cuentaEliminar = cuenta }) {
                                        Text(
                                            text = "Eliminar",
                                            color = MaterialTheme.colorScheme.error,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            1 -> {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = "Fuentes (${state.fuentes.size})",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        TextButton(
                            onClick = {
                                viewModel.limpiarErrorFuente()
                                fuenteEnEdicion = null
                                dialogoFuente = true
                            },
                        ) {
                            Text("Nueva fuente")
                        }
                    }
                }
                state.errorFuente?.let { error ->
                    item {
                        Text(
                            text = error,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
                errorArchivo?.let { error ->
                    item {
                        Text(
                            text = error,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
                if (state.fuentes.isEmpty()) {
                    item { EstadoVacio(titulo = "No hay fuentes configuradas.") }
                }
                items(state.fuentes, key = { it.localId }) { fuente ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(14.dp)
                                            .clip(CircleShape)
                                            .background(colorDesdeHex(fuente.color)),
                                    )
                                    Column {
                                        Text(
                                            fuente.alias,
                                            style = MaterialTheme.typography.titleSmall,
                                        )
                                        Text(
                                            text = fuente.color,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                                AssistChip(
                                    onClick = {},
                                    label = {
                                        Text(
                                            if (fuente.splitAuto) {
                                                "Auto · ${fuente.splitAutoModo?.wire ?: "por defecto"}"
                                            } else {
                                                "Manual"
                                            },
                                        )
                                    },
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Miniatura(
                                    modelo = viewModel.modeloImagen(fuente.logoRuta),
                                    descripcion = "Logo de ${fuente.alias}",
                                )
                                Text(
                                    text = if (fuente.logoRuta == null) {
                                        "Sin logo cargado"
                                    } else {
                                        "Logo cargado"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }

                            FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                TextButton(
                                    onClick = {
                                        viewModel.limpiarErrorFuente()
                                        fuenteEnEdicion = fuente
                                        dialogoFuente = true
                                    },
                                ) {
                                    Text("Editar")
                                }
                                TextButton(
                                    onClick = {
                                        objetivoLogo = fuente.localId
                                        pickerLogo.launch(
                                            PickVisualMediaRequest(
                                                ActivityResultContracts.PickVisualMedia.ImageOnly,
                                            ),
                                        )
                                    },
                                ) {
                                    Text(if (fuente.logoRuta == null) "Subir logo" else "Cambiar logo")
                                }
                                if (fuente.logoRuta != null) {
                                    TextButton(onClick = { viewModel.eliminarLogo(fuente.localId) }) {
                                        Text("Quitar logo")
                                    }
                                }
                                TextButton(onClick = { fuenteEliminar = fuente }) {
                                    Text(
                                        text = "Eliminar",
                                        color = MaterialTheme.colorScheme.error,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            2 -> {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text("Modo de cálculo por defecto", style = MaterialTheme.typography.titleSmall)
                            Text(
                                text = "Se usa al generar un split cuando la fuente no define un modo propio.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ModoCalculo.entries.forEach { modo ->
                                    FilterChip(
                                        selected = state.modoDefault == modo,
                                        onClick = { viewModel.cambiarModoDefault(modo) },
                                        label = {
                                            Text(
                                                when (modo) {
                                                    ModoCalculo.PRECISO -> "preciso (truncado al centavo)"
                                                    ModoCalculo.REDONDEADO -> "redondeado (half-up a 1 Bs)"
                                                    ModoCalculo.ENTEROS -> "enteros (truncado a 1 Bs)"
                                                },
                                            )
                                        },
                                    )
                                }
                            }
                        }
                    }
                }
            }

            3 -> {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = "Defaults al registrar ingresos",
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(
                                text = "Se aplican al abrir el formulario de registro. " +
                                    "Puedes cambiarlos en cada pago.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )

                            Text(
                                text = "Método de pago por defecto",
                                style = MaterialTheme.typography.labelMedium,
                            )
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                MetodoPago.entries.forEach { metodo ->
                                    FilterChip(
                                        selected = state.registrarSettings.metodo == metodo,
                                        onClick = { viewModel.cambiarMetodoRegistrar(metodo) },
                                        enabled = !state.guardandoRegistrar,
                                        label = { Text(metodo.label) },
                                    )
                                }
                            }

                            Text(
                                text = "Modo de registro por defecto",
                                style = MaterialTheme.typography.labelMedium,
                            )
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ModoRegistro.entries.forEach { modo ->
                                    FilterChip(
                                        selected = state.registrarSettings.modo == modo,
                                        onClick = { viewModel.cambiarModoRegistrar(modo) },
                                        enabled = !state.guardandoRegistrar,
                                        label = { Text(modo.label) },
                                    )
                                }
                            }

                            if (state.registrarSettings.syncState.isPending) {
                                Text(
                                    text = "Se sincronizará con el servidor cuando haya conexión.",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }

                            state.errorRegistrar?.let { error ->
                                Text(
                                    text = error,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                            }
                        }
                    }
                }
            }

            else -> {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text("Servidor", style = MaterialTheme.typography.titleSmall)
                            Text(
                                text = "La app guarda todo en el dispositivo y sincroniza con este backend.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            OutlinedTextField(
                                value = urlTexto,
                                onValueChange = { urlTexto = it },
                                label = { Text("URL del backend") },
                                supportingText = { Text("Se guarda cifrada en el dispositivo") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                            )
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                TextButton(
                                    onClick = { viewModel.actualizarBaseUrl(urlTexto) },
                                    enabled = urlTexto.trim() != state.baseUrl,
                                ) {
                                    Text("Guardar URL")
                                }
                                TextButton(onClick = viewModel::probarConexion) {
                                    Text("Probar conexión")
                                }
                                TextButton(onClick = viewModel::sincronizarAhora) {
                                    Text("Sincronizar ahora")
                                }
                            }
                            Text(
                                text = "Presets",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                AssistChip(
                                    onClick = viewModel::usarProduccion,
                                    label = { Text("Público (test3.mikylab.com)") },
                                )
                                AssistChip(
                                    onClick = viewModel::usarEmulador,
                                    label = { Text("Emulador (10.0.2.2:8080)") },
                                )
                            }
                            if (state.probandoConexion) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        strokeWidth = 2.dp,
                                    )
                                    Text(
                                        text = "Comprobando conexión…",
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                            }
                            state.pruebaConexion?.let { prueba ->
                                Text(
                                    text = if (prueba.ok) "✓ ${prueba.mensaje}" else "✗ ${prueba.mensaje}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (prueba.ok) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.error
                                    },
                                )
                            }
                        }
                    }
                }

                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Text("Sincronización", style = MaterialTheme.typography.titleSmall)
                            Text(
                                text = "Pendientes de subir: ${state.pendientesSync}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            state.errorSync?.let { error ->
                                Text(
                                    text = "Último error: $error",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                            } ?: Text(
                                text = "Sin errores en el último intento.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = "Automática cada 15/30 min, al abrir la app y al recuperar la conexión.",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }

    if (dialogoCuenta) {
        DialogoCuenta(
            cuenta = cuentaEnEdicion,
            guardando = state.guardandoCuenta,
            error = state.errorCuenta,
            onCerrar = {
                dialogoCuenta = false
                viewModel.limpiarErrorCuenta()
            },
            onGuardar = { alias, banco, numero ->
                val edicion = cuentaEnEdicion
                val cerrar = { dialogoCuenta = false }
                if (edicion == null) {
                    viewModel.crearCuenta(alias, banco, numero, cerrar)
                } else {
                    viewModel.actualizarCuenta(edicion.localId, alias, banco, numero, cerrar)
                }
            },
        )
    }

    cuentaTasa?.let { cuenta ->
        DialogoTasa(
            cuenta = cuenta,
            guardando = state.guardandoCuenta,
            error = state.errorCuenta,
            onCerrar = {
                cuentaTasa = null
                viewModel.limpiarErrorCuenta()
            },
            onGuardar = { tasa, aplicar ->
                viewModel.cambiarTasa(cuenta.localId, tasa, aplicar) { cuentaTasa = null }
            },
        )
    }

    state.historialCuenta?.let { cuenta ->
        DialogoHistorial(
            cuenta = cuenta,
            historial = state.historial,
            onCerrar = viewModel::cerrarHistorial,
        )
    }

    cuentaEliminar?.let { cuenta ->
        DialogoEliminar(
            titulo = "¿Eliminar cuenta \"${cuenta.alias}\"?",
            mensaje = "La cuenta se desactiva; los snapshots históricos de splits se conservan.",
            onConfirmar = {
                viewModel.eliminarCuenta(cuenta.localId)
                cuentaEliminar = null
            },
            onCerrar = { cuentaEliminar = null },
        )
    }

    if (dialogoFuente) {
        DialogoFuente(
            fuente = fuenteEnEdicion,
            guardando = state.guardandoFuente,
            error = state.errorFuente,
            onCerrar = {
                dialogoFuente = false
                viewModel.limpiarErrorFuente()
            },
            onGuardar = { alias, color, splitAuto, modo ->
                val edicion = fuenteEnEdicion
                val cerrar = { dialogoFuente = false }
                if (edicion == null) {
                    viewModel.crearFuente(alias, color, splitAuto, modo, cerrar)
                } else {
                    viewModel.actualizarFuente(
                        edicion.localId,
                        alias,
                        color,
                        splitAuto,
                        modo,
                        cerrar,
                    )
                }
            },
        )
    }

    fuenteEliminar?.let { fuente ->
        DialogoEliminar(
            titulo = "¿Eliminar fuente \"${fuente.alias}\"?",
            mensaje = "La fuente se desactiva; los pagos históricos se conservan.",
            onConfirmar = {
                viewModel.eliminarFuente(fuente.localId)
                fuenteEliminar = null
            },
            onCerrar = { fuenteEliminar = null },
        )
    }
}

/** Miniatura 40×40 de QR/logo con placeholder cuando no hay imagen. */
@Composable
private fun Miniatura(modelo: Any?, descripcion: String) {
    if (modelo == null) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "—",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    } else {
        AsyncImage(
            model = modelo,
            contentDescription = descripcion,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(40.dp).clip(RoundedCornerShape(6.dp)),
        )
    }
}
