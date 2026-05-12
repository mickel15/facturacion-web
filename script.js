const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyz-6gON9iQrUoDI_HVMKwQ6McQ--49lNMYeIIpTFdnTkmnmRiL04-7HrZc8vvpiEEG/exec";

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
}

document.querySelectorAll(".nav-btn").forEach(btnNav => {
  btnNav.addEventListener("click", () => {
    cambiarSeccion(btnNav.dataset.section);
  });
});

document.getElementById("btnActualizarDashboard").addEventListener("click", cargarDashboard);

async function cargarDashboard() {
  ultimosTramites.innerHTML = `<p class="muted">Cargando dashboard...</p>`;

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
      </div>
    </div>
  `;
}

function badgeClass(estado) {
  if (estado === "LISTO") return "success";
  if (estado === "OBSERVADO") return "danger";
  return "warning";
}

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

  const data = {
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

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> <i class="fas fa-hourglass-half"></i> Generando documentos...';

  ocultarResultados();
  ocultarError();

  try {
    const result = await apiPost({
      action: "generarFactura",
      data: data
    });

    if (result.exito === true && result.archivos) {
      mostrarExito(data.documento.numero, result.archivos, result.sheetUrl, result.estadoGeneral);
      limpiarFormulario();
      cargarDashboard();
    } else {
      mostrarError(result.error || "Error desconocido al generar los documentos.");
    }

  } catch (error) {
    console.error("Error:", error);
    mostrarError("❌ Error: " + error.message);
  } finally {
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

    alert("Documento actualizado. Estado general: " + result.estadoGeneral);
    verDetalle(idTramite);
    cargarDashboard();

  } catch (error) {
    alert("Error: " + error.message);
  }
}

async function agregarDocumentoAdicional(idTramite, numeroFactura) {
  const nombre = document.getElementById("nuevoDocumentoNombre").value.trim();
  const observacion = document.getElementById("nuevoDocumentoObs").value.trim();

  if (!nombre) {
    alert("Debe escribir el nombre del documento.");
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

    alert("Documento adicional agregado.");
    verDetalle(idTramite);
    cargarDashboard();

  } catch (error) {
    alert("Error: " + error.message);
  }
}

document.getElementById("btnVolverBusqueda").addEventListener("click", () => {
  cambiarSeccion("buscar");
});

window.addEventListener("DOMContentLoaded", () => {
  cargarDashboard();
});