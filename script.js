const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyz-6gON9iQrUoDI_HVMKwQ6McQ--49lNMYeIIpTFdnTkmnmRiL04-7HrZc8vvpiEEG/exec";

// ===============================
// ELEMENTOS GENERALES
// ===============================
const btn = document.getElementById("btnGenerar");
const resultadosDiv = document.getElementById("resultados");
const errorDiv = document.getElementById("error");

const dashTotal = document.getElementById("dashTotal");
const dashPendientes = document.getElementById("dashPendientes");
const dashListos = document.getElementById("dashListos");
const dashObservados = document.getElementById("dashObservados");
const ultimosTramites = document.getElementById("ultimosTramites");

const inputBusqueda = document.getElementById("inputBusqueda");
const btnBuscar = document.getElementById("btnBuscar");
const resultadosBusqueda = document.getElementById("resultadosBusqueda");
const detalleTramite = document.getElementById("detalleTramite");

// ===============================
// ELEMENTOS GLOBAL
// ===============================
const globalCantidad = document.getElementById("global_cantidad");
const globalFac1 = document.getElementById("global_fac1");
const globalFac2 = document.getElementById("global_fac2");
const globalFac3 = document.getElementById("global_fac3");

const grupoGlobalFac1 = document.getElementById("grupo_global_fac1");
const grupoGlobalFac2 = document.getElementById("grupo_global_fac2");
const grupoGlobalFac3 = document.getElementById("grupo_global_fac3");

const globalNombrePreview = document.getElementById("global_nombre_preview");

const btnGenerarGlobal = document.getElementById("btnGenerarGlobal");
const resultadoGlobal = document.getElementById("resultadoGlobal");
const errorGlobal = document.getElementById("errorGlobal");

// ===============================
// ELEMENTOS BORRADORES
// ===============================
const btnGuardarBorradorFactura = document.getElementById("btnGuardarBorradorFactura");
const btnGuardarBorradorGlobal = document.getElementById("btnGuardarBorradorGlobal");
const btnActualizarBorradores = document.getElementById("btnActualizarBorradores");
const listaBorradores = document.getElementById("listaBorradores");

let borradorActivoId = null;

// ===============================
// API
// ===============================
async function apiPost(payload) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const texto = await response.text();
  console.log("RESPUESTA CRUDA:", texto);

  try {
    return JSON.parse(texto);
  } catch (error) {
    throw new Error("El backend no devolvió JSON válido: " + texto);
  }
}

// ===============================
// NAVEGACIÓN
// ===============================
function cambiarSeccion(nombre) {
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  const section = document.getElementById("section-" + nombre);
  if (section) section.classList.add("active");

  const navBtn = document.querySelector(`.nav-btn[data-section="${nombre}"]`);
  if (navBtn) navBtn.classList.add("active");

  if (nombre === "dashboard") {
    cargarDashboard();
  }

  if (nombre === "global") {
    actualizarCamposGlobal();
  }

  if (nombre === "borradores") {
    cargarBorradores();
  }
}

document.querySelectorAll(".nav-btn").forEach(btnNav => {
  btnNav.addEventListener("click", () => {
    cambiarSeccion(btnNav.dataset.section);
  });
});

// ===============================
// DASHBOARD
// ===============================
document.getElementById("btnActualizarDashboard").addEventListener("click", cargarDashboard);

async function cargarDashboard() {
  ultimosTramites.innerHTML = `<p class="muted">Cargando dashboard...</p>`;
  ultimosTramites.innerHTML = renderSkeletonDashboard();

  try {
    const result = await apiPost({
      action: "obtenerDashboard"
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo obtener el dashboard.");
    }

    dashTotal.textContent = result.total || 0;
    dashPendientes.textContent = result.pendientes || 0;
    dashListos.textContent = result.listos || 0;
    dashObservados.textContent = result.observados || 0;

    renderUltimosTramites(result.ultimos || []);

  } catch (error) {
    ultimosTramites.innerHTML = `<p class="error-inline">${error.message}</p>`;
  }
}

function renderUltimosTramites(items) {
  if (!items.length) {
    ultimosTramites.innerHTML = `<p class="muted">No hay trámites registrados todavía.</p>`;
    return;
  }

  ultimosTramites.innerHTML = items.map(item => tramiteCard(item)).join("");
}

function tramiteCard(item) {
  return `
    <div class="tramite-card">
      <div class="tramite-main">
        <div>
          <h3>${item.numeroFactura || item.idTramite}</h3>
          <p><strong>Cliente:</strong> ${item.cliente || "-"}</p>
          <p><strong>Vehículo:</strong> ${item.marca || "-"} ${item.modelo || ""}</p>
          <p><strong>Chasis:</strong> ${item.chasis || "-"}</p>
        </div>

        <span class="badge ${badgeClass(item.estadoGeneral)}">
          ${item.estadoGeneral || "PENDIENTE"}
        </span>
      </div>

      <div class="tramite-actions">
        <button onclick="verDetalle('${item.idTramite}')">
          <i class="fas fa-eye"></i> Ver detalle
        </button>

        ${item.sheetUrl ? `<a href="${item.sheetUrl}" target="_blank"><i class="fas fa-table"></i> Sheet</a>` : ""}
        ${item.cpPdf ? `<a href="${item.cpPdf}" target="_blank"><i class="fas fa-file-pdf"></i> CP</a>` : ""}
        ${item.mfPdf ? `<a href="${item.mfPdf}" target="_blank"><i class="fas fa-file-pdf"></i> MF</a>` : ""}
        ${item.facPdf ? `<a href="${item.facPdf}" target="_blank"><i class="fas fa-file-pdf"></i> FAC</a>` : ""}

        <button class="btn-delete" onclick="confirmarEliminarTramite('${item.idTramite}', '${item.numeroFactura || item.idTramite}')">
          <i class="fas fa-trash"></i> Eliminar
        </button>
      </div>
    </div>
  `;
}

function badgeClass(estado) {
  if (estado === "LISTO") return "success";
  if (estado === "OBSERVADO") return "danger";
  return "warning";
}

// ===============================
// GENERAR FAC / CP / MF
// ===============================
async function enviarDatos() {
  const required = [
    { id: "v_nombre", name: "Nombre del vendedor" },
    { id: "v_telefono", name: "Teléfono del vendedor" },
    { id: "c_nombre", name: "Nombre del cliente" },
    { id: "numero_factura", name: "Número de factura" },
    { id: "marca", name: "Marca del vehículo" },
    { id: "modelo", name: "Modelo del vehículo" },
    { id: "precio", name: "Precio unitario" }
  ];

  for (let field of required) {
    const el = document.getElementById(field.id);

    if (!el || !el.value.trim()) {
      mostrarError(`❌ El campo "${field.name}" es obligatorio.`);
      return;
    }
  }

  const data = obtenerDatosFormularioFactura();

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> <i class="fas fa-hourglass-half"></i> Generando documentos...';

  ocultarResultados();
  ocultarError();
  mostrarLoader();

  try {
    const result = await apiPost({
      action: "generarFactura",
      data: data
    });

    if (result.exito === true && result.archivos) {
      mostrarExito(data.documento.numero, result.archivos, result.sheetUrl, result.estadoGeneral);
      limpiarFormulario();
      cargarDashboard();

      if (borradorActivoId) {
        await apiPost({
          action: "marcarBorradorCompletado",
          idBorrador: borradorActivoId
        });

        borradorActivoId = null;
      }

    } else {
      mostrarError(result.error || "Error desconocido al generar los documentos.");
    }

  } catch (error) {
    console.error("Error:", error);
    mostrarError("❌ Error: " + error.message);
  } finally {
    ocultarLoader();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar Documentos';
  }
}

function mostrarExito(numeroFactura, archivos, sheetUrl, estadoGeneral) {
  resultadosDiv.innerHTML = `
    <h3><i class="fas fa-check-circle"></i> ¡Documentos Generados Exitosamente!</h3>
    <p><strong>Factura N° ${numeroFactura}</strong> procesada correctamente.</p>
    <p><strong>Estado del trámite:</strong> ${estadoGeneral || "PENDIENTE"}</p>

    <div class="link-group">
      ${sheetUrl ? `<a href="${sheetUrl}" target="_blank"><i class="fas fa-table"></i> Hoja Generada</a>` : ""}
      ${archivos.CP ? `<a href="${archivos.CP}" target="_blank"><i class="fas fa-file-pdf"></i> Carta de Porte</a>` : ""}
      ${archivos.MF ? `<a href="${archivos.MF}" target="_blank"><i class="fas fa-file-pdf"></i> Manifiesto</a>` : ""}
      ${archivos.FAC ? `<a href="${archivos.FAC}" target="_blank"><i class="fas fa-file-pdf"></i> Factura</a>` : ""}
    </div>

    <p class="muted">Los documentos se guardaron en Google Drive y el trámite fue registrado en el historial.</p>
  `;

  resultadosDiv.classList.add("show");
}

function mostrarError(mensaje) {
  errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${mensaje}`;
  errorDiv.classList.add("show");

  setTimeout(() => {
    errorDiv.classList.remove("show");
  }, 9000);
}

function ocultarResultados() {
  resultadosDiv.classList.remove("show");
  resultadosDiv.innerHTML = "";
}

function ocultarError() {
  errorDiv.classList.remove("show");
  errorDiv.innerHTML = "";
}

function limpiarFormulario() {
  document.querySelectorAll("#section-generar input").forEach(input => {
    input.value = "";
  });
}

btn.addEventListener("click", enviarDatos);

document.querySelectorAll("#section-generar input").forEach(input => {
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      enviarDatos();
    }
  });
});

// ===============================
// GLOBAL
// ===============================
function actualizarCamposGlobal() {
  const cantidad = Number(globalCantidad.value);

  grupoGlobalFac1.style.display = "block";
  grupoGlobalFac2.style.display = cantidad >= 2 ? "block" : "none";
  grupoGlobalFac3.style.display = cantidad >= 3 ? "block" : "none";

  document.getElementById("manual_auto1").style.display = "block";
  document.getElementById("manual_auto2").style.display = cantidad >= 2 ? "block" : "none";
  document.getElementById("manual_auto3").style.display = cantidad >= 3 ? "block" : "none";

  if (cantidad < 2) {
    document.getElementById("manual_content_2").classList.add("hidden");
    limpiarAutoManual(2);
  }

  if (cantidad < 3) {
    document.getElementById("manual_content_3").classList.add("hidden");
    limpiarAutoManual(3);
  }

  actualizarPreviewGlobal();
}

function actualizarPreviewGlobal() {
  const cantidad = Number(globalCantidad.value);

  const f1 = globalFac1.value.trim();
  const f2 = globalFac2.value.trim();
  const f3 = globalFac3.value.trim();

  const facturas = [];

  if (cantidad >= 1 && f1) facturas.push(f1);
  if (cantidad >= 2 && f2) facturas.push(f2);
  if (cantidad >= 3 && f3) facturas.push(f3);

  globalNombrePreview.textContent = facturas.length
    ? "GLOBAL " + facturas.join("")
    : "GLOBAL";
}

function mostrarErrorGlobal(mensaje) {
  errorGlobal.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${mensaje}`;
  errorGlobal.classList.add("show");

  setTimeout(() => {
    errorGlobal.classList.remove("show");
  }, 9000);
}

function ocultarErrorGlobal() {
  errorGlobal.classList.remove("show");
  errorGlobal.innerHTML = "";
}

function ocultarResultadoGlobal() {
  resultadoGlobal.classList.remove("show");
  resultadoGlobal.innerHTML = "";
}

async function generarManifiestoGlobal() {
  ocultarErrorGlobal();
  ocultarResultadoGlobal();

  const cantidad = Number(globalCantidad.value);

  const facturas = [];

  if (cantidad >= 1) facturas.push(globalFac1.value.trim());
  if (cantidad >= 2) facturas.push(globalFac2.value.trim());
  if (cantidad >= 3) facturas.push(globalFac3.value.trim());

  for (let i = 0; i < facturas.length; i++) {
    if (!facturas[i]) {
      mostrarErrorGlobal(`❌ Debe ingresar la factura del auto ${i + 1}.`);
      return;
    }
  }

  const facturasUnicas = new Set(facturas);

  if (facturasUnicas.size !== facturas.length) {
    mostrarErrorGlobal("❌ No puede repetir números de factura en el manifiesto global.");
    return;
  }

  const conductor = {
    nombre: document.getElementById("global_conductor_nombre").value.trim(),
    pasaporte: document.getElementById("global_conductor_pasaporte").value.trim(),
    licencia: document.getElementById("global_conductor_licencia").value.trim(),
    placaCabezal: document.getElementById("global_placa_cabezal").value.trim(),
    codigoTransporte: document.getElementById("global_codigo_transporte").value.trim()
  };

  if (!conductor.nombre) {
    mostrarErrorGlobal("❌ El nombre del conductor es obligatorio.");
    return;
  }

  if (!conductor.pasaporte) {
    mostrarErrorGlobal("❌ El pasaporte del conductor es obligatorio.");
    return;
  }

  if (!conductor.licencia) {
    mostrarErrorGlobal("❌ La licencia del conductor es obligatoria.");
    return;
  }

  if (!conductor.placaCabezal) {
    mostrarErrorGlobal("❌ La placa del cabezal es obligatoria.");
    return;
  }

  if (!conductor.codigoTransporte) {
    mostrarErrorGlobal("❌ El código de transporte es obligatorio.");
    return;
  }

  const autosManuales = [
    obtenerAutoManual(1),
    obtenerAutoManual(2),
    obtenerAutoManual(3)
  ].slice(0, cantidad);

  btnGenerarGlobal.disabled = true;
  btnGenerarGlobal.innerHTML = '<span class="spinner"></span> <i class="fas fa-hourglass-half"></i> Generando manifiesto global...';

  try {
    const result = await apiPost({
      action: "generarGlobal",
      data: {
        facturas: facturas,
        conductor: conductor,
        autosManuales: autosManuales
      }
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo generar el manifiesto global.");
    }

    resultadoGlobal.innerHTML = `
      <h3><i class="fas fa-check-circle"></i> Manifiesto Global Generado</h3>
      <p><strong>Documento:</strong> ${result.nombre}</p>
      <p><strong>Tipo:</strong> ${result.tipo}</p>

      <div class="link-group">
        ${result.sheetUrl ? `<a href="${result.sheetUrl}" target="_blank"><i class="fas fa-table"></i> Hoja Global</a>` : ""}
        ${result.pdf ? `<a href="${result.pdf}" target="_blank"><i class="fas fa-file-pdf"></i> PDF Global</a>` : ""}
      </div>

      <p class="muted">El manifiesto global fue guardado en Google Drive.</p>
    `;

    resultadoGlobal.classList.add("show");

    limpiarFormularioGlobal();

    if (borradorActivoId) {
      await apiPost({
        action: "marcarBorradorCompletado",
        idBorrador: borradorActivoId
      });

      borradorActivoId = null;
    }

  } catch (error) {
    console.error("Error global:", error);
    mostrarErrorGlobal("❌ Error: " + error.message);
  } finally {
    btnGenerarGlobal.disabled = false;
    btnGenerarGlobal.innerHTML = '<i class="fas fa-file-pdf"></i> Generar Manifiesto Global';
  }
}

function limpiarFormularioGlobal() {
  globalFac1.value = "";
  globalFac2.value = "";
  globalFac3.value = "";

  document.getElementById("global_conductor_nombre").value = "";
  document.getElementById("global_conductor_pasaporte").value = "";
  document.getElementById("global_conductor_licencia").value = "";
  document.getElementById("global_placa_cabezal").value = "";
  document.getElementById("global_codigo_transporte").value = "";

  limpiarAutoManual(1);
  limpiarAutoManual(2);
  limpiarAutoManual(3);

  document.getElementById("manual_content_1").classList.add("hidden");
  document.getElementById("manual_content_2").classList.add("hidden");
  document.getElementById("manual_content_3").classList.add("hidden");

  actualizarCamposGlobal();
  actualizarPreviewGlobal();
}

globalCantidad.addEventListener("change", actualizarCamposGlobal);
globalFac1.addEventListener("input", actualizarPreviewGlobal);
globalFac2.addEventListener("input", actualizarPreviewGlobal);
globalFac3.addEventListener("input", actualizarPreviewGlobal);

btnGenerarGlobal.addEventListener("click", generarManifiestoGlobal);

// ===============================
// BUSCADOR
// ===============================
btnBuscar.addEventListener("click", buscarTramites);

inputBusqueda.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    buscarTramites();
  }
});

async function buscarTramites() {
  const query = inputBusqueda.value.trim();

  resultadosBusqueda.innerHTML = `<p class="muted">Buscando...</p>`;
  resultadosBusqueda.innerHTML = renderSkeletonDashboard();
  try {
    const result = await apiPost({
      action: "buscarTramites",
      query: query
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo buscar.");
    }

    if (!result.resultados.length) {
      resultadosBusqueda.innerHTML = `<p class="muted">No se encontraron resultados.</p>`;
      return;
    }

    resultadosBusqueda.innerHTML = result.resultados.map(item => tramiteCard(item)).join("");

  } catch (error) {
    resultadosBusqueda.innerHTML = `<p class="error-inline">${error.message}</p>`;
  }
}

// ===============================
// DETALLE
// ===============================
async function verDetalle(idTramite) {
  cambiarSeccion("detalle");

  detalleTramite.innerHTML = `<p class="muted">Cargando detalle del trámite...</p>`;

  try {
    const result = await apiPost({
      action: "obtenerDetalleTramite",
      idTramite: idTramite
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo obtener el detalle.");
    }

    renderDetalle(result.tramite, result.documentos);

  } catch (error) {
    detalleTramite.innerHTML = `<p class="error-inline">${error.message}</p>`;
  }
}

function renderDetalle(tramite, documentos) {
  detalleTramite.innerHTML = `
    <div class="detalle-header">
      <div>
        <h2>Trámite ${tramite.numeroFactura}</h2>
        <p><strong>Cliente:</strong> ${tramite.cliente}</p>
        <p><strong>Vehículo:</strong> ${tramite.marca} ${tramite.modelo}</p>
        <p><strong>Chasis:</strong> ${tramite.chasis || "-"}</p>
      </div>

      <span class="badge ${badgeClass(tramite.estadoGeneral)}">
        ${tramite.estadoGeneral}
      </span>
    </div>

    <div class="link-group">
      ${tramite.sheetUrl ? `<a href="${tramite.sheetUrl}" target="_blank"><i class="fas fa-table"></i> Sheet</a>` : ""}
      ${tramite.cpPdf ? `<a href="${tramite.cpPdf}" target="_blank"><i class="fas fa-file-pdf"></i> CP</a>` : ""}
      ${tramite.mfPdf ? `<a href="${tramite.mfPdf}" target="_blank"><i class="fas fa-file-pdf"></i> MF</a>` : ""}
      ${tramite.facPdf ? `<a href="${tramite.facPdf}" target="_blank"><i class="fas fa-file-pdf"></i> FAC</a>` : ""}
    </div>

    <hr>

    <h3><i class="fas fa-list-check"></i> Checklist documental</h3>

    <div class="docs-list">
      ${documentos.map(doc => documentoItem(doc)).join("")}
    </div>

    <div class="add-doc">
      <h3><i class="fas fa-plus"></i> Agregar documento adicional</h3>

      <div class="row">
        <div class="form-group">
          <label>Nombre del documento</label>
          <input type="text" id="nuevoDocumentoNombre" placeholder="Ej: Poder notariado" />
        </div>

        <div class="form-group">
          <label>Observación</label>
          <input type="text" id="nuevoDocumentoObs" placeholder="Observación opcional" />
        </div>
      </div>

      <button onclick="agregarDocumentoAdicional('${tramite.idTramite}', '${tramite.numeroFactura}')">
        <i class="fas fa-plus-circle"></i> Agregar documento
      </button>
    </div>
  `;
}

function documentoItem(doc) {
  return `
    <div class="doc-item">
      <div>
        <h4>${doc.documento}</h4>
        <p>${doc.tipo} ${doc.observacion ? " | " + doc.observacion : ""}</p>
        ${doc.urlArchivo ? `<a href="${doc.urlArchivo}" target="_blank">Abrir archivo</a>` : ""}
      </div>

      <div class="doc-actions">
        <select id="estado-${safeId(doc.documento)}">
          <option value="PENDIENTE" ${doc.estado === "PENDIENTE" ? "selected" : ""}>PENDIENTE</option>
          <option value="LISTO" ${doc.estado === "LISTO" ? "selected" : ""}>LISTO</option>
          <option value="OBSERVADO" ${doc.estado === "OBSERVADO" ? "selected" : ""}>OBSERVADO</option>
          <option value="NO APLICA" ${doc.estado === "NO APLICA" ? "selected" : ""}>NO APLICA</option>
        </select>

        <button onclick="actualizarDocumento('${doc.idTramite}', '${escapeAttr(doc.documento)}')">
          Guardar
        </button>
      </div>
    </div>
  `;
}

function safeId(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
}

function escapeAttr(texto) {
  return String(texto).replace(/'/g, "\\'");
}

async function actualizarDocumento(idTramite, documento) {
  const estadoSelect = document.getElementById("estado-" + safeId(documento));
  const estado = estadoSelect.value;

  try {
    const result = await apiPost({
      action: "actualizarDocumento",
      data: {
        idTramite: idTramite,
        documento: documento,
        estado: estado,
        observacion: "",
        urlArchivo: ""
      }
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo actualizar.");
    }

    mostrarToast("Documento actualizado. Estado general: " + result.estadoGeneral);
    verDetalle(idTramite);
    cargarDashboard();

  } catch (error) {
    mostrarToast("Error: " + error.message);
  }
}

async function agregarDocumentoAdicional(idTramite, numeroFactura) {
  const nombre = document.getElementById("nuevoDocumentoNombre").value.trim();
  const observacion = document.getElementById("nuevoDocumentoObs").value.trim();

  if (!nombre) {
    mostrarToast("Debe escribir el nombre del documento.");
    return;
  }

  try {
    const result = await apiPost({
      action: "agregarDocumentoAdicional",
      data: {
        idTramite: idTramite,
        numeroFactura: numeroFactura,
        documento: nombre,
        estado: "PENDIENTE",
        observacion: observacion,
        urlArchivo: ""
      }
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo agregar.");
    }

    mostrarToast("Documento adicional agregado.");
    verDetalle(idTramite);
    cargarDashboard();

  } catch (error) {
    mostrarToast("Error: " + error.message);
  }
}

document.getElementById("btnVolverBusqueda").addEventListener("click", () => {
  cambiarSeccion("buscar");
});

// ===============================
// ELIMINAR TRÁMITE
// ===============================
async function confirmarEliminarTramite(idTramite, numeroFactura) {
  const confirmar = confirm(
    `¿Seguro que deseas eliminar el trámite ${numeroFactura}?\n\n` +
    "Se enviarán a papelera:\n" +
    "- La hoja de cálculo generada\n" +
    "- PDF CP\n" +
    "- PDF MF\n" +
    "- PDF FAC\n\n" +
    "El historial no se borrará; quedará marcado como ELIMINADO."
  );

  if (!confirmar) return;

  try {
    const result = await apiPost({
      action: "eliminarTramite",
      idTramite: idTramite
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo eliminar el trámite.");
    }

    mostrarToast("✅ Trámite enviado a papelera correctamente.");

    await cargarDashboard();

    if (inputBusqueda && inputBusqueda.value.trim()) {
      await buscarTramites();
    }

    cambiarSeccion("dashboard");

  } catch (error) {
    console.error("Error eliminando trámite:", error);
    mostrarToast("❌ Error al eliminar: " + error.message);
  }
}

// ===============================
// DATOS MANUALES GLOBAL
// ===============================
function toggleManualGlobal(numeroAuto) {
  const content = document.getElementById("manual_content_" + numeroAuto);

  if (!content) return;

  content.classList.toggle("hidden");

  sincronizarFacturaManual(numeroAuto);
}

function sincronizarFacturaManual(numeroAuto) {
  const facturaGlobal = document.getElementById("global_fac" + numeroAuto);
  const facturaManual = document.getElementById("manual" + numeroAuto + "_factura");

  if (facturaGlobal && facturaManual && !facturaManual.value.trim()) {
    facturaManual.value = facturaGlobal.value.trim();
  }
}

function obtenerAutoManual(numeroAuto) {
  const content = document.getElementById("manual_content_" + numeroAuto);

  if (!content || content.classList.contains("hidden")) {
    return null;
  }

  return {
    vendedor: document.getElementById(`manual${numeroAuto}_vendedor`).value.trim(),
    numeroFactura: document.getElementById(`manual${numeroAuto}_factura`).value.trim(),
    cliente: document.getElementById(`manual${numeroAuto}_cliente`).value.trim(),
    marca: document.getElementById(`manual${numeroAuto}_marca`).value.trim(),
    modelo: document.getElementById(`manual${numeroAuto}_modelo`).value.trim(),
    chasis: document.getElementById(`manual${numeroAuto}_chasis`).value.trim(),
    motor: document.getElementById(`manual${numeroAuto}_motor`).value.trim(),
    anio: document.getElementById(`manual${numeroAuto}_anio`).value.trim(),
    color: document.getElementById(`manual${numeroAuto}_color`).value.trim()
  };
}

function limpiarAutoManual(numeroAuto) {
  const campos = [
    "vendedor",
    "factura",
    "cliente",
    "marca",
    "modelo",
    "chasis",
    "motor",
    "anio",
    "color"
  ];

  campos.forEach(campo => {
    const input = document.getElementById(`manual${numeroAuto}_${campo}`);
    if (input) input.value = "";
  });
}

// ===============================
// BORRADORES - CAPTURAR DATOS
// ===============================
function obtenerDatosFormularioFactura() {
  return {
    vendedor: {
      nombre: document.getElementById("v_nombre").value.trim(),
      telefono: document.getElementById("v_telefono").value.trim(),
      correo: document.getElementById("v_correo").value.trim(),
      id: document.getElementById("v_id").value.trim()
    },
    cliente: {
      nombre: document.getElementById("c_nombre").value.trim(),
      telefono: document.getElementById("c_telefono").value.trim(),
      id: document.getElementById("c_id").value.trim(),
      correo: document.getElementById("c_correo").value.trim()
    },
    documento: {
      numero: document.getElementById("numero_factura").value.trim(),
      fecha: document.getElementById("fecha") ? document.getElementById("fecha").value : ""
    },
    vehiculo: {
      marca: document.getElementById("marca").value.trim(),
      modelo: document.getElementById("modelo").value.trim(),
      chasis: document.getElementById("chasis").value.trim(),
      motor: document.getElementById("motor").value.trim(),
      color: document.getElementById("color").value.trim(),
      anio: document.getElementById("anio").value.trim()
    },
    costos: {
      precio: Number(document.getElementById("precio").value) || 0,
      flete: Number(document.getElementById("flete").value) || 0,
      seguro: Number(document.getElementById("seguro").value) || 0
    }
  };
}

function obtenerDatosFormularioGlobal() {
  const cantidad = Number(globalCantidad.value);

  const facturas = [];

  if (cantidad >= 1) facturas.push(globalFac1.value.trim());
  if (cantidad >= 2) facturas.push(globalFac2.value.trim());
  if (cantidad >= 3) facturas.push(globalFac3.value.trim());

  const conductor = {
    nombre: document.getElementById("global_conductor_nombre").value.trim(),
    pasaporte: document.getElementById("global_conductor_pasaporte").value.trim(),
    licencia: document.getElementById("global_conductor_licencia").value.trim(),
    placaCabezal: document.getElementById("global_placa_cabezal").value.trim(),
    codigoTransporte: document.getElementById("global_codigo_transporte").value.trim()
  };

  const autosManuales = [
    obtenerAutoManual(1),
    obtenerAutoManual(2),
    obtenerAutoManual(3)
  ].slice(0, cantidad);

  return {
    cantidad: cantidad,
    facturas: facturas,
    conductor: conductor,
    autosManuales: autosManuales
  };
}

// ===============================
// BORRADORES - GUARDAR
// ===============================
async function guardarBorradorFactura() {
  const datos = obtenerDatosFormularioFactura();

  const nombreReferencia = [
    datos.documento.numero,
    datos.cliente.nombre,
    datos.vehiculo.marca,
    datos.vehiculo.modelo
  ].filter(Boolean).join(" - ") || "Factura sin referencia";

  try {
    const result = await apiPost({
      action: "guardarBorrador",
      data: {
        idBorrador: borradorActivoId,
        tipo: "FACTURA",
        nombreReferencia: nombreReferencia,
        datos: datos
      }
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo guardar el borrador.");
    }

    borradorActivoId = result.idBorrador;

    mostrarToast("✅ Borrador de factura guardado correctamente.");

  } catch (error) {
    mostrarToast("❌ Error al guardar borrador: " + error.message);
  }
}

async function guardarBorradorGlobal() {
  const datos = obtenerDatosFormularioGlobal();

  const nombreReferencia = "GLOBAL " + datos.facturas.filter(Boolean).join("");

  try {
    const result = await apiPost({
      action: "guardarBorrador",
      data: {
        idBorrador: borradorActivoId,
        tipo: "GLOBAL",
        nombreReferencia: nombreReferencia || "GLOBAL sin referencia",
        datos: datos
      }
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo guardar el borrador.");
    }

    borradorActivoId = result.idBorrador;

    mostrarToast("✅ Borrador global guardado correctamente.");

  } catch (error) {
    mostrarToast("❌ Error al guardar borrador global: " + error.message);
  }
}

// ===============================
// BORRADORES - LISTAR / ABRIR / ELIMINAR
// ===============================
async function cargarBorradores() {
  if (!listaBorradores) return;

  listaBorradores.innerHTML = `<p class="muted">Cargando borradores...</p>`;
  listaBorradores.innerHTML = renderSkeletonBorradores();

  try {
    const result = await apiPost({
      action: "listarBorradores"
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudieron cargar los borradores.");
    }

    if (!result.borradores.length) {
      listaBorradores.innerHTML = `<p class="muted">No hay borradores guardados.</p>`;
      return;
    }

    listaBorradores.innerHTML = result.borradores.map(b => `
      <div class="draft-card">
        <div>
          <h3>${b.nombreReferencia || "Borrador sin referencia"}</h3>
          <p><strong>Tipo:</strong> ${b.tipo}</p>
          <p><strong>Estado:</strong> ${b.estado}</p>
          <p><strong>Actualizado:</strong> ${formatearFechaVisual(b.fechaActualizacion)}</p>
        </div>

        <div class="draft-actions">
          <button onclick="abrirBorrador('${b.idBorrador}')">
            <i class="fas fa-folder-open"></i> Abrir
          </button>

          <button class="btn-delete" onclick="confirmarEliminarBorrador('${b.idBorrador}')">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    `).join("");

  } catch (error) {
    listaBorradores.innerHTML = `<p class="error-inline">${error.message}</p>`;
  }
}

async function abrirBorrador(idBorrador) {
  try {
    const result = await apiPost({
      action: "obtenerBorrador",
      idBorrador: idBorrador
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo abrir el borrador.");
    }

    const borrador = result.borrador;
    borradorActivoId = borrador.idBorrador;

    if (borrador.tipo === "FACTURA") {
      cargarBorradorFactura(borrador.datos);
      cambiarSeccion("generar");
      mostrarToast("✅ Borrador de factura cargado.");
    } else if (borrador.tipo === "GLOBAL") {
      cargarBorradorGlobal(borrador.datos);
      cambiarSeccion("global");
      mostrarToast("✅ Borrador global cargado.");
    } else {
      mostrarToast("Tipo de borrador no reconocido.");
    }

  } catch (error) {
    mostrarToast("❌ Error al abrir borrador: " + error.message);
  }
}

async function confirmarEliminarBorrador(idBorrador) {
  const confirmar = confirm("¿Seguro que deseas eliminar este borrador?");

  if (!confirmar) return;

  try {
    const result = await apiPost({
      action: "eliminarBorrador",
      idBorrador: idBorrador
    });

    if (!result.exito) {
      throw new Error(result.error || "No se pudo eliminar el borrador.");
    }

    mostrarToast("✅ Borrador eliminado.");
    cargarBorradores();

  } catch (error) {
    mostrarToast("❌ Error al eliminar borrador: " + error.message);
  }
}

// ===============================
// BORRADORES - CARGAR FORMULARIOS
// ===============================
function cargarBorradorFactura(datos) {
  document.getElementById("v_nombre").value = datos.vendedor?.nombre || "";
  document.getElementById("v_telefono").value = datos.vendedor?.telefono || "";
  document.getElementById("v_correo").value = datos.vendedor?.correo || "";
  document.getElementById("v_id").value = datos.vendedor?.id || "";

  document.getElementById("c_nombre").value = datos.cliente?.nombre || "";
  document.getElementById("c_telefono").value = datos.cliente?.telefono || "";
  document.getElementById("c_id").value = datos.cliente?.id || "";
  document.getElementById("c_correo").value = datos.cliente?.correo || "";

  document.getElementById("numero_factura").value = datos.documento?.numero || "";
  document.getElementById("fecha").value = datos.documento?.fecha || "";

  document.getElementById("marca").value = datos.vehiculo?.marca || "";
  document.getElementById("modelo").value = datos.vehiculo?.modelo || "";
  document.getElementById("chasis").value = datos.vehiculo?.chasis || "";
  document.getElementById("motor").value = datos.vehiculo?.motor || "";
  document.getElementById("color").value = datos.vehiculo?.color || "";
  document.getElementById("anio").value = datos.vehiculo?.anio || "";

  document.getElementById("precio").value = datos.costos?.precio || "";
  document.getElementById("flete").value = datos.costos?.flete || "";
  document.getElementById("seguro").value = datos.costos?.seguro || "";
}

function cargarBorradorGlobal(datos) {
  globalCantidad.value = datos.cantidad || 1;
  actualizarCamposGlobal();

  globalFac1.value = datos.facturas?.[0] || "";
  globalFac2.value = datos.facturas?.[1] || "";
  globalFac3.value = datos.facturas?.[2] || "";

  document.getElementById("global_conductor_nombre").value = datos.conductor?.nombre || "";
  document.getElementById("global_conductor_pasaporte").value = datos.conductor?.pasaporte || "";
  document.getElementById("global_conductor_licencia").value = datos.conductor?.licencia || "";
  document.getElementById("global_placa_cabezal").value = datos.conductor?.placaCabezal || "";
  document.getElementById("global_codigo_transporte").value = datos.conductor?.codigoTransporte || "";

  const autosManuales = datos.autosManuales || [];

  autosManuales.forEach((auto, index) => {
    if (!auto) return;

    const n = index + 1;

    const content = document.getElementById("manual_content_" + n);
    if (content) content.classList.remove("hidden");

    document.getElementById(`manual${n}_vendedor`).value = auto.vendedor || "";
    document.getElementById(`manual${n}_factura`).value = auto.numeroFactura || "";
    document.getElementById(`manual${n}_cliente`).value = auto.cliente || "";
    document.getElementById(`manual${n}_marca`).value = auto.marca || "";
    document.getElementById(`manual${n}_modelo`).value = auto.modelo || "";
    document.getElementById(`manual${n}_chasis`).value = auto.chasis || "";
    document.getElementById(`manual${n}_motor`).value = auto.motor || "";
    document.getElementById(`manual${n}_anio`).value = auto.anio || "";
    document.getElementById(`manual${n}_color`).value = auto.color || "";
  });

  actualizarPreviewGlobal();
}

function formatearFechaVisual(fecha) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleString();
  } catch (error) {
    return fecha;
  }
}

// ===============================
// EVENTOS BORRADORES
// ===============================
if (btnGuardarBorradorFactura) {
  btnGuardarBorradorFactura.addEventListener("click", guardarBorradorFactura);
}

if (btnGuardarBorradorGlobal) {
  btnGuardarBorradorGlobal.addEventListener("click", guardarBorradorGlobal);
}

if (btnActualizarBorradores) {
  btnActualizarBorradores.addEventListener("click", cargarBorradores);
}

// ===============================
// INICIO
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  cargarDashboard();
  actualizarCamposGlobal();
});

// ===============================
// LOADER GLOBAL
// ===============================
function mostrarLoader() {
  document.getElementById('globalLoader').classList.add('show');
}

function ocultarLoader() {
  document.getElementById('globalLoader').classList.remove('show');
}

// ===============================
// TOASTS
// ===============================
function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;

  const iconos = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle'
  };

  toast.innerHTML = `<i class="fas ${iconos[tipo] || iconos.success}"></i> ${mensaje}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ===============================
// SKELETON LOADERS
// ===============================
function renderSkeletonDashboard() {
  return Array(4).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-lines">
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>
  `).join('');
}

function renderSkeletonBorradores() {
  return Array(3).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-lines" style="flex:1">
        <div class="skeleton skeleton-line long"></div>
        <div class="skeleton skeleton-line medium"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>
  `).join('');
}