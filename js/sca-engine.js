/**
 * scientific-calculation-auditor (SCA) - Client-side Audit Engine
 * Pure JavaScript rule checker for Python AST patterns, spreadsheets, and Jupyter notebooks.
 * Computes the Chain of Evidence Index and auditable finding records.
 */

class ScaEngine {
  constructor() {
    this.report = {
      target: "",
      type: "python",
      findings: [],
      metrics: {
        provenance: 100,
        dimensionality: 100,
        precision: 100,
        reproducibility: 100,
        overallIndex: 100,
        verdict: "APROBADO / DEFENDIBLE"
      },
      evidenceChain: {
        inputs: [],
        constants: [],
        equations: [],
        results: []
      }
    };
  }

  auditPythonCode(codeString, targetName = "script.py") {
    const findings = [];
    const lines = codeString.split("\n");

    const constantsFound = [];
    const conversionsFound = [];
    const roundingsFound = [];
    const divRisks = [];

    const magicNumbersSet = new Set([1000, 3600, 60, 2.54, 1e6, 86400, 100, 101325]);

    lines.forEach((line, lineIdx) => {
      const lineNum = lineIdx + 1;
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      // Extract inline comment if any
      const commentIdx = line.indexOf("#");
      const codePart = (commentIdx >= 0 ? line.substring(0, commentIdx) : line).trim();
      const commentPart = (commentIdx >= 0 ? line.substring(commentIdx + 1) : "").toLowerCase();

      const hasProvenanceComment = commentPart.includes("[") || 
                                   commentPart.includes("ref") || 
                                   commentPart.includes("norma") || 
                                   commentPart.includes("asme") || 
                                   commentPart.includes("din") || 
                                   commentPart.includes("iso") || 
                                   commentPart.includes("fuente") ||
                                   commentPart.includes("tag") ||
                                   commentPart.includes("si") ||
                                   commentPart.includes("exacto");

      // 1. Detect Undocumented Constants (Assignments of numeric literals)
      const assignMatch = codePart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)\s*$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const numVal = parseFloat(assignMatch[2]);

        // If variable name is not all-caps and has no provenance comment
        if (!hasProvenanceComment && varName !== varName.toUpperCase()) {
          constantsFound.push({ varName, numVal, lineNum });
          findings.push({
            ruleId: "UNDOCUMENTED_CONSTANT",
            severity: SCA_RULES.UNDOCUMENTED_CONSTANT.severity,
            message: `Variable '${varName}' asignada a literal numérico ${numVal} sin procedencia ni unidad declarada.`,
            evidence: {
              line: lineNum,
              context: codePart,
              suggestion: `Declarar en mayúsculas (ej. ${varName.toUpperCase()}) y documentar unidad/fuente: # [unidad] Norma / Instrumento.`
            }
          });
        }
      }

      // 2. Detect Inline Conversions (* 1000, / 3600, * 2.54, etc.)
      const inlineOpMatch = codePart.match(/(\*|\/)\s*([0-9]+(?:\.[0-9]+)?)\b/g);
      if (inlineOpMatch) {
        inlineOpMatch.forEach(match => {
          const num = parseFloat(match.replace(/[*\/]/, "").trim());
          if (magicNumbersSet.has(num)) {
            conversionsFound.push({ num, lineNum });
            findings.push({
              ruleId: "INLINE_CONVERSION",
              severity: SCA_RULES.INLINE_CONVERSION.severity,
              message: `Posible conversión inline o número mágico (${num}) detectado en operación binaria.`,
              evidence: {
                line: lineNum,
                context: codePart,
                suggestion: `Reemplazar ${num} por una constante nominada o emplear una librería de unidades dimensionales (Pint).`
              }
            });
          }
        });
      }

      // 3. Detect Early Rounding
      if (codePart.includes("round(") && !trimmed.startsWith("print(")) {
        roundingsFound.push(lineNum);
        findings.push({
          ruleId: "EARLY_ROUNDING",
          severity: SCA_RULES.EARLY_ROUNDING.severity,
          message: `Invocación explícita a round() en variable intermedia. Riesgo de degradación de precisión.`,
          evidence: {
            line: lineNum,
            context: codePart,
            suggestion: `Mantener precisión completa en cálculos intermedios y aplicar formato de redondeo solo al exportar.`
          }
        });
      }

      // 4. Detect Unchecked Division (e.g. / variable without prior assert)
      const divMatch = codePart.match(/\/\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/);
      if (divMatch && !codeString.includes(`assert ${divMatch[1]}`)) {
        const denom = divMatch[1];
        if (denom !== "math" && denom !== "np" && !magicNumbersSet.has(parseFloat(denom))) {
          // Soft check: flag as info
          findings.push({
            ruleId: "DIV_BY_ZERO_RISK",
            severity: "INFO",
            message: `División por denominador variable '${denom}' sin aserción previa detectable.`,
            evidence: {
              line: lineNum,
              context: codePart,
              suggestion: `Agregar 'assert ${denom} > 0' antes de la operación de división.`
            }
          });
        }
      }
    });

    // Score calculations
    const totalLines = Math.max(lines.filter(l => l.trim() && !l.trim().startsWith("#")).length, 1);
    const provenanceScore = Math.max(0, 100 - (constantsFound.length * 20));
    const dimensionalScore = Math.max(0, 100 - (conversionsFound.length * 25));
    const precisionScore = Math.max(0, 100 - (roundingsFound.length * 30));
    const reproScore = 100; // Python script is reproducible top-to-bottom

    const overallIndex = Math.round(
      0.35 * provenanceScore + 
      0.25 * dimensionalScore + 
      0.20 * precisionScore + 
      0.20 * reproScore
    );

    let verdict = "APROBADO / DEFENDIBLE";
    if (overallIndex < 50) verdict = "RECHAZADO (NO CONFORME)";
    else if (overallIndex < 75) verdict = "OBSERVADO (REQUIERE REFACTORIZACIÓN)";

    this.report = {
      target: targetName,
      type: "python",
      findings,
      metrics: {
        provenance: provenanceScore,
        dimensionality: dimensionalScore,
        precision: precisionScore,
        reproducibility: reproScore,
        overallIndex,
        verdict
      },
      stats: {
        totalLines,
        constantsCount: constantsFound.length,
        conversionsCount: conversionsFound.length,
        roundingsCount: roundingsFound.length
      }
    };

    return this.report;
  }

  auditSpreadsheet(sheetData, targetName = "Calculos.xlsx") {
    const findings = [];
    const rows = sheetData.rows || [];
    const cols = sheetData.columns || [];

    // Analyze column patterns (expecting formulas vs constants)
    const colTypes = {};
    cols.forEach(c => colTypes[c] = { formulas: 0, scalars: 0, total: 0 });

    rows.forEach((r, rIdx) => {
      cols.forEach(colKey => {
        const val = r[colKey.toLowerCase().replace(/[^a-z0-9]/g, "_").split("_")[0]] ?? r[colKey];
        if (val !== undefined && val !== null) {
          colTypes[colKey].total++;
          if (typeof val === "string" && val.startsWith("=")) {
            colTypes[colKey].formulas++;
          } else {
            colTypes[colKey].scalars++;
          }
        }
      });
    });

    let manualOverridesCount = 0;
    let hardcodedConstantsCount = 0;
    let externalLinksCount = 0;

    // Check cells
    rows.forEach((r, rIdx) => {
      const rowNum = rIdx + 2; // header is row 1
      cols.forEach((colKey, colIdx) => {
        const colLetter = String.fromCharCode(65 + colIdx);
        const cellCoord = `${colLetter}${rowNum}`;
        const prop = colKey.toLowerCase().replace(/[^a-z0-9]/g, "_").split("_")[0];
        const val = r[prop] ?? r[colKey];

        if (typeof val === "string" && val.startsWith("=")) {
          // Check external link
          if (val.includes("[") && val.includes("]")) {
            externalLinksCount++;
            findings.push({
              ruleId: "EXTERNAL_LINK",
              severity: SCA_RULES.EXTERNAL_LINK.severity,
              message: `Celda ${cellCoord} contiene fórmula que referencia un libro externo sin trazabilidad.`,
              evidence: {
                cell: cellCoord,
                context: val,
                suggestion: "Incrustar o importar los datos con marca temporal y control de versiones local."
              }
            });
          }

          // Check hardcoded numbers in formula (e.g. =C2 * 0.045 * 1.21)
          const numbersInFormula = val.match(/(?<![A-Za-z0-9_])\d+(?:\.\d+)?/g);
          if (numbersInFormula) {
            const floats = numbersInFormula.filter(n => n.includes("."));
            if (floats.length > 0) {
              hardcodedConstantsCount++;
              findings.push({
                ruleId: "HARDCODED_CONSTANT",
                severity: SCA_RULES.HARDCODED_CONSTANT.severity,
                message: `Fórmula en celda ${cellCoord} contiene constantes numéricas en línea: ${floats.join(", ")}.`,
                evidence: {
                  cell: cellCoord,
                  context: val,
                  suggestion: "Definir las constantes en celdas de parámetros etiquetadas en la cabecera."
                }
              });
            }
          }
        } else if (typeof val === "number") {
          // If the rest of the column is formulas, this is a manual override!
          if (colTypes[colKey].formulas >= 2 && colTypes[colKey].formulas > colTypes[colKey].scalars) {
            manualOverridesCount++;
            findings.push({
              ruleId: "MANUAL_OVERRIDE",
              severity: SCA_RULES.MANUAL_OVERRIDE.severity,
              message: `Celda ${cellCoord} contiene un valor escalar (${val}) en medio de una columna calculada homogénea.`,
              evidence: {
                cell: cellCoord,
                context: String(val),
                suggestion: "Restaurar la fórmula homogénea o explicitar la excepción en columna de ajuste."
              }
            });
          }
        }
      });
    });

    const provenanceScore = Math.max(0, 100 - (hardcodedConstantsCount * 25));
    const dimensionalScore = 80;
    const precisionScore = 90;
    const reproScore = Math.max(0, 100 - (manualOverridesCount * 35) - (externalLinksCount * 20));

    const overallIndex = Math.round(
      0.35 * provenanceScore + 
      0.25 * dimensionalScore + 
      0.20 * precisionScore + 
      0.20 * reproScore
    );

    let verdict = "APROBADO / DEFENDIBLE";
    if (overallIndex < 50) verdict = "RECHAZADO (NO CONFORME)";
    else if (overallIndex < 75) verdict = "OBSERVADO (REQUIERE REFACTORIZACIÓN)";

    this.report = {
      target: targetName,
      type: "spreadsheet",
      findings,
      metrics: {
        provenance: provenanceScore,
        dimensionality: dimensionalScore,
        precision: precisionScore,
        reproducibility: reproScore,
        overallIndex,
        verdict
      },
      stats: {
        totalRows: rows.length,
        columnsCount: cols.length,
        manualOverridesCount,
        hardcodedConstantsCount,
        externalLinksCount
      }
    };

    return this.report;
  }

  auditNotebook(notebookData, targetName = "analisis.ipynb") {
    const findings = [];
    const cells = notebookData.cells || [];

    let lastExec = -1;
    let outOfOrderCount = 0;
    let unexecutedCount = 0;

    cells.forEach((cell, idx) => {
      if (cell.type === "code") {
        const count = cell.exec_count;
        if (count !== null && count !== undefined) {
          if (count < lastExec) {
            outOfOrderCount++;
            findings.push({
              ruleId: "OUT_OF_ORDER_EXECUTION",
              severity: SCA_RULES.OUT_OF_ORDER_EXECUTION.severity,
              message: `Celda [${count}] se ejecutó antes de celdas previas en el cuaderno. Riesgo de estado oculto (zombi).`,
              evidence: {
                cell: `Celda #${idx} [${count}]`,
                context: cell.source.split("\n")[0],
                suggestion: "Reiniciar el kernel y ejecutar 'Restart & Run All' para asegurar linealidad reproducible."
              }
            });
          }
          lastExec = count;
        } else {
          unexecutedCount++;
          findings.push({
            ruleId: "UNEXECUTED_CELL",
            severity: SCA_RULES.UNEXECUTED_CELL.severity,
            message: `Celda #${idx} no fue ejecutada en la versión guardada del notebook.`,
            evidence: {
              cell: `Celda #${idx}`,
              context: cell.source.split("\n")[0],
              suggestion: "Ejecutar todas las celdas antes de commitear o archivar la memoria."
            }
          });
        }

        // Run Python checks on cell source
        const cellAuditor = new ScaEngine();
        const cellReport = cellAuditor.auditPythonCode(cell.source, `Celda #${idx}`);
        cellReport.findings.forEach(f => {
          findings.push({
            ...f,
            evidence: {
              ...f.evidence,
              cell: `Celda #${idx}`
            }
          });
        });
      }
    });

    const reproScore = Math.max(0, 100 - (outOfOrderCount * 30) - (unexecutedCount * 15));
    const provenanceScore = Math.max(0, 90 - (findings.filter(f => f.ruleId === "UNDOCUMENTED_CONSTANT").length * 15));
    const dimensionalScore = Math.max(0, 90 - (findings.filter(f => f.ruleId === "INLINE_CONVERSION").length * 20));
    const precisionScore = 95;

    const overallIndex = Math.round(
      0.35 * provenanceScore + 
      0.25 * dimensionalScore + 
      0.20 * precisionScore + 
      0.20 * reproScore
    );

    let verdict = "APROBADO / DEFENDIBLE";
    if (overallIndex < 50) verdict = "RECHAZADO (NO CONFORME)";
    else if (overallIndex < 75) verdict = "OBSERVADO (REQUIERE REFACTORIZACIÓN)";

    this.report = {
      target: targetName,
      type: "notebook",
      findings,
      metrics: {
        provenance: provenanceScore,
        dimensionality: dimensionalScore,
        precision: precisionScore,
        reproducibility: reproScore,
        overallIndex,
        verdict
      },
      stats: {
        totalCells: cells.length,
        outOfOrderCount,
        unexecutedCount
      }
    };

    return this.report;
  }
}

if (typeof window !== "undefined") {
  window.ScaEngine = ScaEngine;
}
