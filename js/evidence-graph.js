/**
 * scientific-calculation-auditor (SCA) - Chain of Evidence Graph Visualizer
 * Renders an interactive SVG showing the complete lineage of data:
 * Primary Measurements -> Tabulated Constants -> Mathematical Transforms -> Verified Results.
 * Highlights broken links and magic numbers in real-time.
 */

class EvidenceGraphRenderer {
  constructor(containerId) {
    this.container = typeof containerId === "string" ? document.getElementById(containerId) : containerId;
  }

  render(auditReport) {
    if (!this.container) return;
    this.container.innerHTML = "";

    // Build evidence lineage graph based on findings and artifact type
    const stages = [
      { id: "inputs", label: "1. Fuentes Primarias & Sensores", x: 60 },
      { id: "constants", label: "2. Constantes & Metrología", x: 280 },
      { id: "transforms", label: "3. Ecuaciones & Transformaciones", x: 520 },
      { id: "results", label: "4. Resultados & Criterios", x: 760 }
    ];

    // Determine nodes depending on whether issues were found
    const hasMagicConst = auditReport.findings.some(f => f.ruleId === "UNDOCUMENTED_CONSTANT" || f.ruleId === "HARDCODED_CONSTANT");
    const hasInlineConv = auditReport.findings.some(f => f.ruleId === "INLINE_CONVERSION");
    const hasEarlyRound = auditReport.findings.some(f => f.ruleId === "EARLY_ROUNDING");
    const hasOverride = auditReport.findings.some(f => f.ruleId === "MANUAL_OVERRIDE");

    const nodes = [
      // Stage 1: Inputs
      { id: "n_in1", stage: 0, y: 70, title: "Caudal Medido (Q)", source: "Flujómetro FT-201", status: "ok" },
      { id: "n_in2", stage: 0, y: 170, title: "Diámetro Tubo (D)", source: "Plano P&ID MEC-02", status: "ok" },
      { id: "n_in3", stage: 0, y: 270, title: "Longitud Cañería (L)", source: "Relevamiento de Planta", status: "ok" },
      { id: "n_in4", stage: 0, y: 370, title: "Presión / Altura (H)", source: "Manómetro M-104", status: "ok" },

      // Stage 2: Constants
      { 
        id: "n_c1", 
        stage: 1, 
        y: 100, 
        title: "Gravedad (g)", 
        source: hasMagicConst ? "⚠️ Literal 9.80665 (Sin Cita)" : "CODATA / IERS 2026", 
        status: hasMagicConst ? "broken" : "ok" 
      },
      { 
        id: "n_c2", 
        stage: 1, 
        y: 220, 
        title: "Densidad Fluido (ρ)", 
        source: hasMagicConst ? "⚠️ Literal 998.2 (Sin Cita)" : "Tablas IAPWS-97", 
        status: hasMagicConst ? "broken" : "ok" 
      },
      { 
        id: "n_c3", 
        stage: 1, 
        y: 340, 
        title: "Factor de Conversión", 
        source: hasInlineConv ? "⚠️ Magic /3600 (Inline)" : "Factor Exacto SI Nominado", 
        status: hasInlineConv ? "broken" : "ok" 
      },

      // Stage 3: Transforms
      { 
        id: "n_t1", 
        stage: 2, 
        y: 110, 
        title: "Área de Sección (A)", 
        source: "A = π·D² / 4", 
        status: "ok" 
      },
      { 
        id: "n_t2", 
        stage: 2, 
        y: 230, 
        title: "Velocidad Flujo (v)", 
        source: hasEarlyRound ? "⚠️ v = round(Q/A, 2)" : "v = Q / A (Float64)", 
        status: hasEarlyRound ? "broken" : "ok" 
      },
      { 
        id: "n_t3", 
        stage: 2, 
        y: 350, 
        title: "Pérdida Darcy (hf)", 
        source: hasMagicConst ? "⚠️ hf = 0.02·(L/D)·..." : "hf = f·(L/D)·(v²/2g)", 
        status: hasMagicConst ? "broken" : "ok" 
      },

      // Stage 4: Results
      { 
        id: "n_r1", 
        stage: 3, 
        y: 150, 
        title: "Altura Total (H_total)", 
        source: hasOverride ? "⚠️ Sobreescritura Manual" : "H = Hg + hf (Verificado)", 
        status: hasOverride ? "broken" : "ok" 
      },
      { 
        id: "n_r2", 
        stage: 3, 
        y: 300, 
        title: "Potencia Bomba (P_kw)", 
        source: "P = (ρ·g·Q·H) / 1000", 
        status: (hasMagicConst || hasInlineConv || hasEarlyRound) ? "compromised" : "ok" 
      }
    ];

    const edges = [
      { from: "n_in1", to: "n_c3" },
      { from: "n_c3", to: "n_t2" },
      { from: "n_in2", to: "n_t1" },
      { from: "n_t1", to: "n_t2" },
      { from: "n_in3", to: "n_t3" },
      { from: "n_t2", to: "n_t3" },
      { from: "n_c1", to: "n_t3" },
      { from: "n_in4", to: "n_r1" },
      { from: "n_t3", to: "n_r1" },
      { from: "n_r1", to: "n_r2" },
      { from: "n_c1", to: "n_r2" },
      { from: "n_c2", to: "n_r2" }
    ];

    const totalWidth = 960;
    const totalHeight = 490;
    const nodeWidth = 175;
    const nodeHeight = 65;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute("class", "sca-evidence-svg");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.minHeight = "460px";

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="ev-arrow-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#10b981" />
      </marker>
      <marker id="ev-arrow-broken" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ef4444" />
      </marker>
      <filter id="shadow-node" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.45"/>
      </filter>
    `;
    svg.appendChild(defs);

    // Render Stage Columns and Guides
    stages.forEach(st => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const colLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      colLine.setAttribute("x1", st.x + nodeWidth / 2);
      colLine.setAttribute("y1", 35);
      colLine.setAttribute("x2", st.x + nodeWidth / 2);
      colLine.setAttribute("y2", totalHeight - 15);
      colLine.setAttribute("stroke", "rgba(255, 255, 255, 0.05)");
      colLine.setAttribute("stroke-dasharray", "4, 4");
      g.appendChild(colLine);

      const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
      title.setAttribute("x", st.x + nodeWidth / 2);
      title.setAttribute("y", 22);
      title.setAttribute("text-anchor", "middle");
      title.setAttribute("fill", "#94a3b8");
      title.setAttribute("font-size", "11px");
      title.setAttribute("font-weight", "700");
      title.setAttribute("font-family", "var(--font-mono)");
      title.textContent = st.label;
      g.appendChild(title);

      svg.appendChild(g);
    });

    // Render Edges
    const edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    edges.forEach(e => {
      const fromNode = nodeMap[e.from];
      const toNode = nodeMap[e.to];
      if (!fromNode || !toNode) return;

      const x1 = stages[fromNode.stage].x + nodeWidth;
      const y1 = fromNode.y + nodeHeight / 2;
      const x2 = stages[toNode.stage].x;
      const y2 = toNode.y + nodeHeight / 2;

      const isBroken = fromNode.status === "broken" || toNode.status === "broken";
      const dx = Math.abs(x2 - x1) * 0.55;
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", isBroken ? "#ef4444" : "#334155");
      path.setAttribute("stroke-width", isBroken ? "2.5" : "1.75");
      if (isBroken) path.setAttribute("stroke-dasharray", "5, 4");
      path.setAttribute("marker-end", isBroken ? "url(#ev-arrow-broken)" : "url(#ev-arrow-ok)");

      edgesGroup.appendChild(path);
    });
    svg.appendChild(edgesGroup);

    // Render Nodes
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodes.forEach(n => {
      const stX = stages[n.stage].x;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("transform", `translate(${stX}, ${n.y})`);

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", nodeWidth);
      rect.setAttribute("height", nodeHeight);
      rect.setAttribute("rx", "6");
      rect.setAttribute("filter", "url(#shadow-node)");

      if (n.status === "broken") {
        rect.setAttribute("fill", "#1c1015");
        rect.setAttribute("stroke", "#ef4444");
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("stroke-dasharray", "4, 2");
      } else if (n.status === "compromised") {
        rect.setAttribute("fill", "#1e1b12");
        rect.setAttribute("stroke", "#f59e0b");
        rect.setAttribute("stroke-width", "1.75");
      } else {
        rect.setAttribute("fill", "#111827");
        rect.setAttribute("stroke", "#334155");
        rect.setAttribute("stroke-width", "1.25");
      }
      g.appendChild(rect);

      // Status pill strip
      const strip = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      strip.setAttribute("x", "0");
      strip.setAttribute("y", "0");
      strip.setAttribute("width", "5");
      strip.setAttribute("height", nodeHeight);
      strip.setAttribute("rx", "2");
      strip.setAttribute("fill", n.status === "broken" ? "#ef4444" : n.status === "compromised" ? "#f59e0b" : "#10b981");
      g.appendChild(strip);

      // Title
      const textTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textTitle.setAttribute("x", "14");
      textTitle.setAttribute("y", "22");
      textTitle.setAttribute("fill", n.status === "broken" ? "#fca5a5" : "#f1f5f9");
      textTitle.setAttribute("font-size", "12px");
      textTitle.setAttribute("font-weight", "700");
      textTitle.setAttribute("font-family", "var(--font-mono)");
      textTitle.textContent = n.title;
      g.appendChild(textTitle);

      // Source / Provenance
      const textSource = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textSource.setAttribute("x", "14");
      textSource.setAttribute("y", "45");
      textSource.setAttribute("fill", n.status === "broken" ? "#f87171" : "#94a3b8");
      textSource.setAttribute("font-size", "10px");
      textSource.textContent = n.source.length > 22 ? n.source.substring(0, 21) + "…" : n.source;
      g.appendChild(textSource);

      nodesGroup.appendChild(g);
    });

    svg.appendChild(nodesGroup);
    this.container.appendChild(svg);
  }
}

if (typeof window !== "undefined") {
  window.EvidenceGraphRenderer = EvidenceGraphRenderer;
}
