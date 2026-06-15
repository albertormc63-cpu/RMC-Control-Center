async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Error consultando ${url}`);
  }

  return response.json();
}

async function loadDashboard() {
  const data = await getJSON("/api/dashboard");

  document.getElementById("nikeRuns").textContent = data.nikeRuns;
  document.getElementById("nikeRegistros").textContent = data.nikeRegistros;
  document.getElementById("nikePiezas").textContent = data.nikePiezas;
  document.getElementById("mockupRuns").textContent = data.mockupRuns;
  document.getElementById("errores").textContent = data.errores;
}

async function loadRuns() {
  const runs = await getJSON("/api/nike/runs");
  const tbody = document.getElementById("runsTable");

  tbody.innerHTML = "";

  runs.forEach(run => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${run.id}</td>
      <td>${run.created_at || ""}</td>
      <td>${run.herramienta || ""}</td>
      <td>${run.pedidos || 0}</td>
      <td>${run.piezas || 0}</td>
      <td>${run.estilos || 0}</td>
      <td>${run.ok || 0}</td>
      <td>${run.errores || 0}</td>
      <td>
        <button onclick="loadRunDetail('${run.id}')">Ver</button>
      </td>
      <td>
        <a class="btn" href="/api/reports/nike/${run.id}/excel">Excel</a>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function loadRunDetail(id) {
  const data = await getJSON(`/api/nike/runs/${id}`);

  document.getElementById("detailSection").classList.remove("hidden");

  document.getElementById("runInfo").innerHTML = `
    <p><strong>ID:</strong> ${data.run.id}</p>
    <p><strong>Fecha:</strong> ${data.run.created_at || ""}</p>
    <p><strong>Herramienta:</strong> ${data.run.herramienta || ""}</p>
    <p><strong>Piezas:</strong> ${data.run.piezas || 0}</p>
    <p><strong>Errores:</strong> ${data.run.errores || 0}</p>
  `;

  const tbody = document.getElementById("itemsTable");
  tbody.innerHTML = "";

  data.items.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.wo || ""}</td>
      <td>${item.equipo || ""}</td>
      <td>${item.style || ""}</td>
      <td>${item.talla || ""}</td>
      <td>${item.piezas || 0}</td>
      <td>${item.nombre || ""}</td>
      <td>${item.numero || ""}</td>
      <td>${item.estado || ""}</td>
      <td>${item.error || ""}</td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById("detailSection").scrollIntoView({
    behavior: "smooth"
  });
}

async function init() {
  try {
    await loadDashboard();
    await loadRuns();
  } catch (error) {
    console.error(error);
    alert("Error cargando datos. Revisa la ruta de la BD o la consola.");
  }
}

init();