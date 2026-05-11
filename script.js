// URL de tu Apps Script
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyz-6gON9iQrUoDI_HVMKwQ6McQ--49lNMYeIIpTFdnTkmnmRiL04-7HrZc8vvpiEEG/exec";

const btn = document.getElementById('btnGenerar');
const resultadosDiv = document.getElementById('resultados');
const errorDiv = document.getElementById('error');

async function enviarDatos() {
  const required = [
    { id: 'v_nombre', name: 'Nombre del vendedor' },
    { id: 'v_telefono', name: 'Teléfono del vendedor' },
    { id: 'c_nombre', name: 'Nombre del cliente' },
    { id: 'numero_factura', name: 'Número de factura' },
    { id: 'marca', name: 'Marca del vehículo' },
    { id: 'modelo', name: 'Modelo del vehículo' },
    { id: 'precio', name: 'Precio unitario' }
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
      nombre: document.getElementById('v_nombre').value.trim(),
      telefono: document.getElementById('v_telefono').value.trim(),
      correo: document.getElementById('v_correo').value.trim(),
      id: document.getElementById('v_id').value.trim()
    },
    cliente: {
      nombre: document.getElementById('c_nombre').value.trim(),
      telefono: document.getElementById('c_telefono').value.trim(),
      id: document.getElementById('c_id').value.trim(),
      correo: document.getElementById('c_correo').value.trim()
    },
    documento: {
      numero: document.getElementById('numero_factura').value.trim(),
      fecha: document.getElementById('fecha') ? document.getElementById('fecha').value : ""
    },
    vehiculo: {
      marca: document.getElementById('marca').value.trim(),
      modelo: document.getElementById('modelo').value.trim(),
      chasis: document.getElementById('chasis').value.trim(),
      motor: document.getElementById('motor').value.trim(),
      color: document.getElementById('color').value.trim(),
      anio: document.getElementById('anio').value.trim()
    },
    costos: {
      precio: Number(document.getElementById('precio').value) || 0,
      flete: Number(document.getElementById('flete').value) || 0,
      seguro: Number(document.getElementById('seguro').value) || 0
    }
  };

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> <i class="fas fa-hourglass-half"></i> Generando documentos...';

  ocultarResultados();
  ocultarError();

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    const texto = await response.text();

    console.log("RESPUESTA CRUDA DEL BACKEND:", texto);

    let result;

    try {
      result = JSON.parse(texto);
    } catch (errorJson) {
      throw new Error("El backend no devolvió JSON válido: " + texto);
    }

    console.log("RESPUESTA JSON:", result);

    if (result.exito === true && result.archivos) {
      mostrarExito(data.documento.numero, result.archivos, result.sheetId);
    } else if (result.exito === true && !result.archivos) {
      mostrarError(
        "⚠️ Apps Script respondió exito:true, pero no devolvió los enlaces de los PDFs. Revisa que el doPost esté usando el código completo y no una versión de prueba."
      );
    } else {
      mostrarError(result.error || 'Error desconocido al generar los documentos.');
    }

  } catch (error) {
    console.error('Error:', error);
    mostrarError('❌ Error: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar Documentos';
  }
}

function mostrarExito(numeroFactura, archivos, sheetId) {
  if (!archivos) {
    mostrarError("❌ No se recibieron los enlaces de los archivos PDF.");
    return;
  }

  resultadosDiv.innerHTML = `
    <h3><i class="fas fa-check-circle"></i> ¡Documentos Generados Exitosamente!</h3>

    <p><strong>Factura N° ${numeroFactura}</strong> procesada correctamente.</p>

    <div style="margin-top: 15px;">
      ${archivos.CP ? `
        <a href="${archivos.CP}" target="_blank" rel="noopener">
          <i class="fas fa-file-pdf"></i> Carta de Porte (PDF)
        </a>
      ` : `<p>⚠️ No se recibió el PDF CP.</p>`}

      ${archivos.MF ? `
        <a href="${archivos.MF}" target="_blank" rel="noopener">
          <i class="fas fa-file-pdf"></i> Manifiesto de Carga (PDF)
        </a>
      ` : `<p>⚠️ No se recibió el PDF MF.</p>`}

      ${archivos.FAC ? `
        <a href="${archivos.FAC}" target="_blank" rel="noopener">
          <i class="fas fa-file-pdf"></i> Factura (PDF)
        </a>
      ` : `<p>⚠️ No se recibió el PDF FAC.</p>`}
    </div>

    ${sheetId ? `
      <p style="margin-top: 15px; font-size: 13px;">
        Sheet generado: ${sheetId}
      </p>
    ` : ""}

    <p style="margin-top: 15px; font-size: 13px; color: #555;">
      <i class="fas fa-cloud-upload-alt"></i> Los documentos se han guardado en Google Drive.
    </p>
  `;

  resultadosDiv.classList.add('show');
}

function mostrarError(mensaje) {
  errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${mensaje}`;
  errorDiv.classList.add('show');

  setTimeout(() => {
    errorDiv.classList.remove('show');
  }, 9000);
}

function ocultarResultados() {
  resultadosDiv.classList.remove('show');
  resultadosDiv.innerHTML = '';
}

function ocultarError() {
  errorDiv.classList.remove('show');
  errorDiv.innerHTML = '';
}

btn.addEventListener('click', enviarDatos);

document.querySelectorAll('input').forEach(input => {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enviarDatos();
    }
  });
});