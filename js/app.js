/**
 * scientific-calculation-auditor (SCA) - Main Application Controller
 * Handles UI interactions, tabs, live code auditing, spreadsheet grid,
 * notebook runner, simulated sca CLI, and formal Boxmark audit report generation.
 */

document.addEventListener("DOMContentLoaded", () => {
  const engine = new ScaEngine();
  let currentPresetKey = "python_pump_broken";
  let activePreset = SCA_PRESETS[currentPresetKey];
  let currentReport = null;
  let evidenceGraph = null;

  // DOM Elements
  const presetSelect = document.getElementById("preset-select");
  const tabButtons = document.querySelectorAll(".nav-tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const pythonTextarea = document.getElementById("python-code-editor");
  const btnAuditPython = document.getElementById("btn-audit-python");
  const findingsList = document.getElementById("findings-list-container");
  const graphContainer = document.getElementById("evidence-graph-container");
  const formalReportContainer = document.getElementById("formal-report-container");
  const cliInput = document.getElementById("cli-input");
  const cliOutput = document.getElementById("cli-output");

  // Metrics elements
  const metricOverall = document.getElementById("metric-overall-index");
  const metricVerdict = document.getElementById("metric-verdict-badge");
  const metricProvenance = document.getElementById("metric-provenance-bar");
  const metricDimensionality = document.getElementById("metric-dimensionality-bar");
  const metricPrecision = document.getElementById("metric-precision-bar");
  const metricReproducibility = document.getElementById("metric-reproducibility-bar");

  // Spreadsheet and Notebook containers
  const spreadsheetTable = document.getElementById("spreadsheet-grid");
  const notebookContainer = document.getElementById("notebook-cells-list");
  const btnToggleFormulas = document.getElementById("btn-toggle-formulas");
  const btnRunCleanNotebook = document.getElementById("btn-run-clean-notebook");
  let showFormulas = false;

  // Init Graph Renderer
  if (graphContainer) {
    evidenceGraph = new EvidenceGraphRenderer(graphContainer);
  }

  // Populate Presets
  if (presetSelect) {
    presetSelect.innerHTML = "";
    Object.keys(SCA_PRESETS).forEach(key => {
      const p = SCA_PRESETS[key];
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `[${p.type.toUpperCase()}] ${p.title}`;
      if (key === currentPresetKey) opt.selected = true;
      presetSelect.appendChild(opt);
    });

    presetSelect.addEventListener("change", (e) => {
      loadPreset(e.target.value);
    });
  }

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
        if (targetId === "tab-evidence-graph" && evidenceGraph && currentReport) {
          setTimeout(() => evidenceGraph.render(currentReport), 50);
        }
      }
    });
  });

  // Action Buttons
  document.getElementById("btn-print-report")?.addEventListener("click", () => {
    window.print();
  });

  document.getElementById("btn-export-json")?.addEventListener("click", () => {
    exportJsonReport();
  });

  document.getElementById("btn-reset-preset")?.addEventListener("click", () => {
    loadPreset(currentPresetKey);
  });

  if (btnAuditPython) {
    btnAuditPython.addEventListener("click", () => {
      runAudit();
    });
  }

  if (btnToggleFormulas) {
    btnToggleFormulas.addEventListener("click", () => {
      showFormulas = !showFormulas;
      btnToggleFormulas.textContent = showFormulas ? "Ver Valores Numéricos" : "Ver Fórmulas (=...)";
      renderSpreadsheetGrid();
    });
  }

  if (btnRunCleanNotebook) {
    btnRunCleanNotebook.addEventListener("click", () => {
      // Clean re-execution simulation
      if (activePreset.type === "notebook") {
        activePreset.cells.forEach((c, idx) => {
          c.exec_count = idx + 1; // Sequential execution
        });
        appendCliMessage("[SCA REPRODUCE] Kernel reiniciado. Re-ejecución limpia completada (Celdas 1 a 5 ordenadas).", "success");
        renderNotebookCells();
        runAudit();
      }
    });
  }

  function loadPreset(presetKey) {
    currentPresetKey = presetKey;
    activePreset = JSON.parse(JSON.stringify(SCA_PRESETS[presetKey]));

    if (activePreset.type === "python") {
      if (pythonTextarea) pythonTextarea.value = activePreset.code;
      document.querySelector('[data-tab="tab-python"]')?.click();
    } else if (activePreset.type === "spreadsheet") {
      renderSpreadsheetGrid();
      document.querySelector('[data-tab="tab-spreadsheet"]')?.click();
    } else if (activePreset.type === "notebook") {
      renderNotebookCells();
      document.querySelector('[data-tab="tab-notebook"]')?.click();
    }

    runAudit();
    appendCliMessage(`Artefacto cargado: [${activePreset.title}]`, "sys");
  }

  function runAudit() {
    if (activePreset.type === "python") {
      const code = pythonTextarea ? pythonTextarea.value : activePreset.code;
      currentReport = engine.auditPythonCode(code, activePreset.filename);
    } else if (activePreset.type === "spreadsheet") {
      currentReport = engine.auditSpreadsheet(activePreset, activePreset.filename);
    } else if (activePreset.type === "notebook") {
      currentReport = engine.auditNotebook(activePreset, activePreset.filename);
    }

    updateMetricsUI();
    renderFindingsList();
    renderFormalReport();

    if (evidenceGraph && currentReport) {
      evidenceGraph.render(currentReport);
    }
  }

  function updateMetricsUI() {
    if (!currentReport) return;
    const m = currentReport.metrics;

    if (metricOverall) {
      metricOverall.textContent = `${m.overallIndex}%`;
      metricOverall.style.color = m.overallIndex >= 75 ? "#10b981" : m.overallIndex >= 50 ? "#f59e0b" : "#ef4444";
    }

    if (metricVerdict) {
      metricVerdict.textContent = m.verdict;
      metricVerdict.className = `status-pill-badge ${m.overallIndex >= 75 ? 'pill-pass' : m.overallIndex >= 50 ? 'pill-warn' : 'pill-fail'}`;
    }

    updateBar(metricProvenance, m.provenance);
    updateBar(metricDimensionality, m.dimensionality);
    updateBar(metricPrecision, m.precision);
    updateBar(metricReproducibility, m.reproducibility);
  }

  function updateBar(el, val) {
    if (!el) return;
    el.style.width = `${val}%`;
    el.textContent = `${val}%`;
    el.className = `metric-progress-fill ${val >= 80 ? 'fill-green' : val >= 50 ? 'fill-yellow' : 'fill-red'}`;
  }

  function renderFindingsList() {
    if (!findingsList || !currentReport) return;
    findingsList.innerHTML = "";

    if (currentReport.findings.length === 0) {
      findingsList.innerHTML = `
        <div class="findings-empty">
          <i class="fa-solid fa-circle-check" style="font-size: 2rem; color: #10b981; margin-bottom: 0.5rem;"></i>
          <p><strong>Cero no conformidades detectadas.</strong> El cálculo preserva la cadena de evidencia y trazabilidad completa.</p>
        </div>
      `;
      return;
    }

    currentReport.findings.forEach(f => {
      const card = document.createElement("div");
      card.className = `finding-card finding-${f.severity.toLowerCase()}`;

      const sevColor = f.severity === "ERROR" || f.severity === "BLOCKING" ? "#ef4444" : f.severity === "WARNING" ? "#f59e0b" : "#38bdf8";

      card.innerHTML = `
        <div class="finding-header">
          <span class="finding-severity-badge" style="background: ${sevColor}22; color: ${sevColor}; border: 1px solid ${sevColor};">
            <i class="fa-solid fa-triangle-exclamation"></i> ${f.severity}
          </span>
          <span class="finding-rule-id"><code>${f.ruleId}</code></span>
          <span class="finding-loc">${f.evidence.line ? `Línea ${f.evidence.line}` : f.evidence.cell || ""}</span>
        </div>
        <div class="finding-message">${f.message}</div>
        ${f.evidence.context ? `<div class="finding-context"><code>${f.evidence.context}</code></div>` : ""}
        ${f.evidence.suggestion ? `
          <div class="finding-suggestion">
            <i class="fa-solid fa-lightbulb"></i> <strong>Sugerencia de Remediación:</strong> ${f.evidence.suggestion}
          </div>
        ` : ""}
      `;

      findingsList.appendChild(card);
    });
  }

  function renderSpreadsheetGrid() {
    if (!spreadsheetTable) return;
    const data = activePreset.type === "spreadsheet" ? activePreset : SCA_PRESETS["spreadsheet_plant_steam"];

    let html = `<thead><tr><th>#</th>`;
    data.columns.forEach(col => {
      html += `<th>${col}</th>`;
    });
    html += `</tr></thead><tbody>`;

    data.rows.forEach((row, rIdx) => {
      const rowNum = rIdx + 2;
      html += `<tr><td class="row-index">${rowNum}</td>`;
      data.columns.forEach((colKey, colIdx) => {
        const prop = colKey.toLowerCase().replace(/[^a-z0-9]/g, "_").split("_")[0];
        const rawVal = row[prop] ?? row[colKey];
        const isFormula = typeof rawVal === "string" && rawVal.startsWith("=");
        const isOverride = rIdx === 2 && colIdx === 4; // TS-01 manual override
        const isExternal = typeof rawVal === "string" && rawVal.includes("[");

        let displayVal = rawVal;
        if (!showFormulas && isFormula) {
          if (colIdx === 3) displayVal = "2763.50 kJ/kg";
          else if (colIdx === 4) displayVal = `$ ${(24.50 + rIdx * 4.2).toFixed(2)}`;
        }

        let cellClass = "";
        if (isOverride) cellClass = "cell-override";
        else if (isExternal) cellClass = "cell-external";
        else if (isFormula && rawVal.includes("0.045")) cellClass = "cell-magic";

        html += `<td class="${cellClass}" title="${isFormula ? rawVal : ''}">${displayVal}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody>`;
    spreadsheetTable.innerHTML = html;
  }

  function renderNotebookCells() {
    if (!notebookContainer) return;
    const data = activePreset.type === "notebook" ? activePreset : SCA_PRESETS["notebook_reaction_unreproducible"];

    notebookContainer.innerHTML = "";
    data.cells.forEach((cell, idx) => {
      const card = document.createElement("div");
      card.className = "notebook-cell-card";

      const isOutOfOrder = idx === 2 && cell.exec_count === 2;
      const isUnexecuted = cell.exec_count === null;

      card.innerHTML = `
        <div class="cell-header">
          <span class="cell-exec-badge ${isOutOfOrder ? 'badge-out-of-order' : ''}">
            In [${cell.exec_count !== null ? cell.exec_count : ' '}]
          </span>
          ${isOutOfOrder ? `<span class="badge-tag-danger">⚠️ FUERA DE SECUENCIA (Hidden State)</span>` : ""}
          ${isUnexecuted ? `<span class="badge-tag-warn">ℹ️ NO EJECUTADA</span>` : ""}
        </div>
        <pre class="cell-code-view"><code>${cell.source}</code></pre>
      `;
      notebookContainer.appendChild(card);
    });
  }

  // Formal Boxmark Audit Report
  function renderFormalReport() {
    if (!formalReportContainer || !currentReport) return;
    const p = activePreset;
    const m = currentReport.metrics;
    const isApproved = m.overallIndex >= 75;

    let html = `
      <div class="audit-boxmark-document" id="printable-audit-memorandum">
        <header class="doc-header-boxmark">
          <div class="header-brand-block">
            <div class="brand-logo-area">
              <span class="brand-logo-badge"><i class="fa-solid fa-microchip"></i> BOXI SCA</span>
              <span class="brand-org-name">BOXMARK LEATHER ARGENTINA S.A.</span>
            </div>
            <div class="brand-dept-name">DEPARTAMENTO DE INGENIERÍA & METROLOGÍA INDUSTRIAL</div>
          </div>
          <div class="header-meta-table">
            <div class="meta-row"><span class="meta-lbl">INFORME:</span><span class="meta-val">DICTAMEN TÉCNICO DE AUDITORÍA</span></div>
            <div class="meta-row"><span class="meta-lbl">ARTEFACTO:</span><span class="meta-val">${p.filename || p.title}</span></div>
            <div class="meta-row"><span class="meta-lbl">CÓDIGO:</span><span class="meta-val">AUD-SCA-${p.id.toUpperCase()}-2026</span></div>
            <div class="meta-row"><span class="meta-lbl">FECHA:</span><span class="meta-val">${new Date().toISOString().split("T")[0]}</span></div>
            <div class="meta-row"><span class="meta-lbl">DICTAMEN:</span><span class="meta-val ${isApproved ? 'text-success' : 'text-danger'}"><strong>${m.verdict}</strong></span></div>
          </div>
        </header>

        <div class="doc-title-section">
          <div class="doc-discipline-tag">${p.discipline || "Auditoría de Cómputos de Ingeniería"}</div>
          <h1 class="doc-title">Dictamen de Auditoría y Verificación de Cadena de Evidencia</h1>
          <p class="doc-objective">
            Evaluación automatizada de trazabilidad de datos, dimensionalidad, integridad de precisión y reproducibilidad sobre el artefacto de cálculo <strong>${p.filename}</strong>.
          </p>
        </div>

        <!-- 1. ÍNDICE DE CALIDAD Y MATRIZ DE PILARES -->
        <section class="doc-section">
          <h2 class="section-title"><span class="sec-num">1.0</span> Evaluación Numérica y Matriz de Pilares</h2>
          <table class="doc-table">
            <thead>
              <tr>
                <th>Pilar de Integridad Científica</th>
                <th>Ponderación</th>
                <th style="text-align: right;">Puntaje</th>
                <th>Estado</th>
                <th>Criterio de Evaluación</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Trazabilidad y Procedencia</strong></td>
                <td>35%</td>
                <td style="text-align: right; font-weight: 700;">${m.provenance}%</td>
                <td><span class="${m.provenance >= 75 ? 'text-success' : 'text-danger'}">${m.provenance >= 75 ? 'CONFORME' : 'OBSERVADO'}</span></td>
                <td>Declaración explícita de citas, normas y unidades de constantes.</td>
              </tr>
              <tr>
                <td><strong>Rigor Dimensional</strong></td>
                <td>25%</td>
                <td style="text-align: right; font-weight: 700;">${m.dimensionality}%</td>
                <td><span class="${m.dimensionality >= 75 ? 'text-success' : 'text-danger'}">${m.dimensionality >= 75 ? 'CONFORME' : 'OBSERVADO'}</span></td>
                <td>Ausencia de factores de conversión inline mágicos.</td>
              </tr>
              <tr>
                <td><strong>Integridad Numérica</strong></td>
                <td>20%</td>
                <td style="text-align: right; font-weight: 700;">${m.precision}%</td>
                <td><span class="${m.precision >= 75 ? 'text-success' : 'text-danger'}">${m.precision >= 75 ? 'CONFORME' : 'OBSERVADO'}</span></td>
                <td>Precisión completa (float64) sin redondeo prematuro intermedio.</td>
              </tr>
              <tr>
                <td><strong>Reproducibilidad y Estado</strong></td>
                <td>20%</td>
                <td style="text-align: right; font-weight: 700;">${m.reproducibility}%</td>
                <td><span class="${m.reproducibility >= 75 ? 'text-success' : 'text-danger'}">${m.reproducibility >= 75 ? 'CONFORME' : 'OBSERVADO'}</span></td>
                <td>Flujo determinista sin celdas fuera de secuencia ni overrides.</td>
              </tr>
              <tr style="background: #f1f5f9; font-weight: 800;">
                <td colspan="2">ÍNDICE DE CADENA DE EVIDENCIA GLOBAL</td>
                <td style="text-align: right; font-size: 1.1rem; color: ${isApproved ? '#15803d' : '#b91c1c'};">${m.overallIndex}%</td>
                <td colspan="2"><span class="${isApproved ? 'text-success' : 'text-danger'}">${m.verdict}</span></td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 2. HALLAZGOS Y NO CONFORMIDADES DETECTADAS -->
        <section class="doc-section">
          <h2 class="section-title"><span class="sec-num">2.0</span> Registro de Hallazgos y Desvíos Detectados (${currentReport.findings.length})</h2>
          ${currentReport.findings.length === 0 ? `
            <div class="conclusion-box conclusion-pass">
              No se detectaron hallazgos ni violaciones de integridad técnica. El cálculo es completamente defendible.
            </div>
          ` : `
            <table class="doc-table">
              <thead>
                <tr>
                  <th style="width: 14%;">Severidad</th>
                  <th style="width: 26%;">Regla Violada</th>
                  <th style="width: 15%;">Ubicación</th>
                  <th style="width: 45%;">Descripción & Recomendación</th>
                </tr>
              </thead>
              <tbody>
                ${currentReport.findings.map(f => `
                  <tr>
                    <td><strong class="${f.severity === 'ERROR' || f.severity === 'BLOCKING' ? 'text-danger' : 'text-warning'}">${f.severity}</strong></td>
                    <td><code>${f.ruleId}</code></td>
                    <td>${f.evidence.line ? `Línea ${f.evidence.line}` : f.evidence.cell || "-"}</td>
                    <td>
                      <div>${f.message}</div>
                      ${f.evidence.suggestion ? `<div style="color: #64748b; font-size: 0.75rem; margin-top: 0.25rem;"><em>Acción: ${f.evidence.suggestion}</em></div>` : ""}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `}
        </section>

        <!-- 3. DICTAMEN DE AUDITORÍA -->
        <section class="doc-section">
          <h2 class="section-title"><span class="sec-num">3.0</span> Dictamen Técnico y Conclusión de Aprobación</h2>
          <div class="conclusion-box ${isApproved ? 'conclusion-pass' : 'conclusion-warn'}">
            <p>
              ${isApproved
                ? `El artefacto analizado reúne las condiciones de trazabilidad, rigor dimensional y reproducibilidad exigidas para su inclusión en memorias de cálculo técnicas de Boxmark Leather Argentina S.A. Se autoriza su utilización formal en proyectos de ingeniería.`
                : `El artefacto analizado presenta desvíos sustanciales que comprometen la cadena de evidencia. Los números mágicos, redondeos prematuros o sobreescrituras manuales invalidan su uso formal hasta tanto se apliquen las acciones correctivas descriptas en la sección 2.0.`
              }
            </p>
          </div>
        </section>

        <!-- 4. FIRMAS FORMALES -->
        <section class="doc-signatures-section">
          <div class="signature-box">
            <div class="sig-role">AUDITOR TÉCNICO</div>
            <div class="sig-line"></div>
            <div class="sig-name">Ing. Lorenzo Pérez</div>
            <div class="sig-title">Ingeniero de Proyectos y Procesos</div>
            <div class="sig-entity">Boxmark Leather Argentina S.A.</div>
          </div>
          <div class="signature-box">
            <div class="sig-role">METROLOGÍA & CALIDAD</div>
            <div class="sig-line"></div>
            <div class="sig-name">Jefatura de Calidad e Ingeniería</div>
            <div class="sig-title">Control de Procesos Industriales</div>
            <div class="sig-entity">Boxmark Leather Argentina S.A.</div>
          </div>
          <div class="signature-box">
            <div class="sig-role">DIRECCIÓN TÉCNICA</div>
            <div class="sig-line"></div>
            <div class="sig-name">Gerencia de Operaciones</div>
            <div class="sig-title">Planta Industrial</div>
            <div class="sig-entity">Boxmark Leather Argentina S.A.</div>
          </div>
        </section>
      </div>
    `;

    formalReportContainer.innerHTML = html;
  }

  function exportJsonReport() {
    if (!currentReport) return;
    const blob = new Blob([JSON.stringify(currentReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${activePreset.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // CLI Simulation
  if (cliInput) {
    cliInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cmd = cliInput.value.trim();
        cliInput.value = "";
        executeCliCommand(cmd);
      }
    });
  }

  function appendCliMessage(text, type = "normal") {
    if (!cliOutput) return;
    const line = document.createElement("div");
    line.className = `cli-line cli-${type}`;
    line.textContent = text;
    cliOutput.appendChild(line);
    cliOutput.scrollTop = cliOutput.scrollHeight;
  }

  function executeCliCommand(cmd) {
    appendCliMessage(`$ ${cmd}`, "user");
    const parts = cmd.split(" ").filter(p => p.length > 0);
    const root = parts[0]?.toLowerCase() || "";

    switch (root) {
      case "help":
        appendCliMessage("Comandos disponibles de sca CLI:", "info");
        appendCliMessage("  sca audit [pump|steam|spreadsheet|notebook] : Auditar un artefacto", "sys");
        appendCliMessage("  sca score                                    : Ver índice de cadena de evidencia", "sys");
        appendCliMessage("  sca rules                                    : Listar catálogo de reglas activas", "sys");
        appendCliMessage("  sca reproduce                                : Simular re-ejecución limpia de notebook", "sys");
        appendCliMessage("  sca demo                                     : Ejecutar demo completa de auditoría", "sys");
        appendCliMessage("  clear                                        : Limpiar la pantalla de la consola", "sys");
        break;

      case "clear":
        cliOutput.innerHTML = "";
        break;

      case "sca":
        handleScaCommand(parts.slice(1));
        break;

      default:
        appendCliMessage(`Comando '${cmd}' no reconocido. Escribí 'help' para ver las opciones.`, "error");
        break;
    }
  }

  function handleScaCommand(args) {
    const sub = args[0]?.toLowerCase();
    if (!sub || sub === "help") {
      executeCliCommand("help");
      return;
    }

    if (sub === "audit") {
      const which = args[1]?.toLowerCase();
      let key = "python_pump_broken";
      if (which === "steam") key = "python_steam_clean";
      else if (which === "spreadsheet") key = "spreadsheet_plant_steam";
      else if (which === "notebook") key = "notebook_reaction_unreproducible";

      loadPreset(key);
      if (presetSelect) presetSelect.value = key;
      appendCliMessage(`[AUDIT COMPLETE] ${currentReport.findings.length} hallazgos encontrados. Índice: ${currentReport.metrics.overallIndex}% (${currentReport.metrics.verdict})`, "success");
    } else if (sub === "score") {
      appendCliMessage(`--- Índice de Cadena de Evidencia ---`, "info");
      appendCliMessage(`  Trazabilidad:     ${currentReport.metrics.provenance}%`, "sys");
      appendCliMessage(`  Dimensionalidad:  ${currentReport.metrics.dimensionality}%`, "sys");
      appendCliMessage(`  Integridad Num.:  ${currentReport.metrics.precision}%`, "sys");
      appendCliMessage(`  Reproducibilidad: ${currentReport.metrics.reproducibility}%`, "sys");
      appendCliMessage(`  Score Global:     ${currentReport.metrics.overallIndex}% -> ${currentReport.metrics.verdict}`, "success");
    } else if (sub === "rules") {
      appendCliMessage(`--- Catálogo de Reglas SCA ---`, "info");
      Object.values(SCA_RULES).forEach(r => {
        appendCliMessage(`  [${r.severity.padEnd(8)}] ${r.id.padEnd(24)} : ${r.name}`, "sys");
      });
    } else if (sub === "reproduce") {
      btnRunCleanNotebook?.click();
    } else if (sub === "demo") {
      loadPreset("python_pump_broken");
      appendCliMessage("[DEMO] Auditando código con números mágicos y conversiones inline...", "info");
      setTimeout(() => {
        loadPreset("python_steam_clean");
        appendCliMessage("[DEMO] Artefacto refactorizado a estándar defendible ASME B31.1 cargado.", "success");
      }, 1500);
    } else {
      appendCliMessage(`Subcomando sca '${sub}' no reconocido.`, "error");
    }
  }

  // Initial audit
  loadPreset(currentPresetKey);
  appendCliMessage("scientific-calculation-auditor CLI v2.0.0 inicializada.", "sys");
  appendCliMessage("Escribí 'help' para explorar comandos disponibles.", "sys");
});
