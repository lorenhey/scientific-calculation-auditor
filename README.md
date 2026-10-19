# Scientific Calculation Auditor (SCA)

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-00e5ff?style=for-the-badge&logo=github)](https://lorenhey.github.io/scientific-calculation-auditor/)
[![Python Tests](https://img.shields.io/badge/Tests-100%25%20Passing-10b981?style=for-the-badge&logo=pytest)](https://github.com/lorenhey/scientific-calculation-auditor)
[![Standard](https://img.shields.io/badge/Standard-GUM%20%7C%20ASME%20PTC%2019.1%20%7C%20SI-3b82f6?style=for-the-badge)](https://lorenhey.github.io/scientific-calculation-auditor/)
[![Release](https://img.shields.io/badge/Release-v2.0.0-ffb74d?style=for-the-badge)](https://github.com/lorenhey/scientific-calculation-auditor/releases/tag/v2.0.0)

> **Reconstruyendo la cadena de evidencia.** Auditoría automática de scripts científicos, planillas de cálculo y cuadernos Jupyter. Detecta números mágicos, conversiones inline, redondeos prematuros y sobreescrituras manuales para certificar la reproducibilidad técnica y metrológica en plantas industriales.

👉 **Accedé a la aplicación interactiva en vivo:**  
**[https://lorenhey.github.io/scientific-calculation-auditor/](https://lorenhey.github.io/scientific-calculation-auditor/)**

---

## 🛠️ Capacidades de Auditoría

1. **Auditor de Código Python (AST):**
   - Inspección estática del árbol sintáctico abstracto (AST) sin ejecuciones silenciosas.
   - Detección de constantes numéricas no documentadas (`UNDOCUMENTED_CONSTANT`).
   - Identificación de multiplicadores o divisores inline empíricos (`INLINE_CONVERSION` como `/ 3600`, `* 1000`).
   - Detección de truncamiento de precisión (`EARLY_ROUNDING` mediante llamadas intermedias a `round()`).
   - Verificación de divisiones sin aserción previa de divisor positivo (`DIV_BY_ZERO_RISK`).

2. **Auditor de Planillas de Cálculo (XLSX):**
   - Detección de sobreescrituras manuales (`MANUAL_OVERRIDE`): celdas escalares fijas incrustadas en columnas homogéneas de cálculo.
   - Constantes numéricas ocultas en fórmulas (`HARDCODED_CONSTANT` como `=C3*1.21*9.81`).
   - Detección de dependencias externas no controladas (`EXTERNAL_LINK` referenciando libros externos que quiebran silenciosamente).
   - Visor interactivo en navegador con conmutación entre *Valores Numéricos* y *Fórmulas Analíticas*.

3. **Auditor de Jupyter Notebooks (IPYNB):**
   - Detección de ejecución fuera de orden (`OUT_OF_ORDER_EXECUTION` con `execution_count` desfasado que genera estado oculto o zombi).
   - Detección de celdas no ejecutadas (`UNEXECUTED_CELL`).
   - Simulador de *Clean Re-execution* desde un kernel limpio.

4. **Grafo de Cadena de Evidencia (DAG de Lineage):**
   - Representación SVG interactiva de 4 capas:
     $$\text{Fuentes Primarias / Sensores} \longrightarrow \text{Constantes & Metrología} \longrightarrow \text{Transformaciones Analíticas} \longrightarrow \text{Resultados}$$
   - Resaltado visual en tiempo real de nodos con "cadena rota" donde un número carece de procedencia.

5. **Índice Cuantitativo de Cadena de Evidencia ($I_{evidencia}$):**
   $$I_{evidencia} = 0.35 \cdot S_{prov} + 0.25 \cdot S_{dim} + 0.20 \cdot S_{prec} + 0.20 \cdot S_{repro}$$
   - **Trazabilidad y Procedencia ($S_{prov}$ - 35%):** % de constantes con citas o metadatos explícitos.
   - **Rigor Dimensional ($S_{dim}$ - 25%):** Coherencia SI sin factores inline.
   - **Integridad Numérica ($S_{prec}$ - 20%):** Precisión completa en float64.
   - **Reproducibilidad ($S_{repro}$ - 20%):** Determinismo y linealidad del grafo.

6. **Dictamen Formal de Auditoría (Estándar Boxmark):**
   - Encabezado técnico institucional, matriz de pilares, registro pormenorizado de hallazgos con severidad, dictamen de aprobación (*APROBADO*, *OBSERVADO*, *RECHAZADO*) y cuadro de firmas.
   - Diseñado para impresión y generación de PDF en un clic (`@media print`).

---

## 💻 Uso Local y CLI en Python

```bash
# Clonar el repositorio
git clone https://github.com/lorenhey/scientific-calculation-auditor.git
cd scientific-calculation-auditor

# Instalar en entorno editable
pip install -e .

# Ejecutar auditoría sobre un script Python
sca audit calculo_bomba.py

# Auditar una planilla Excel
sca audit balance_vapor.xlsx

# Auditar un Jupyter Notebook
sca audit modelo_cinetico.ipynb

# Ejecutar demo interactiva
sca demo
```

### Ejecución de Pruebas Automatizadas

```bash
python -m pytest
```

---

## 🏛️ Estructura del Repositorio

```
scientific-calculation-auditor/
├── index.html                   # Single Page Application interactiva
├── css/
│   └── style.css                # Tema dark dashboard + @media print normalizado Boxmark
├── js/
│   ├── sca-rules.js             # Catálogo de reglas y presets industriales
│   ├── sca-engine.js            # Motor cliente de auditoría y cálculo de scores
│   ├── evidence-graph.js        # Visualizador SVG de la cadena de evidencia
│   └── app.js                   # Orquestador UI, visor Excel, notebook runner y CLI
├── src/
│   └── scientific_calculation_auditor/
│       ├── cli.py               # CLI implementada con Typer & Rich
│       ├── ir.py                # Modelo de datos intermedio (IR) y esquemas Pydantic
│       └── auditors/            # Auditores de Python (AST), Notebooks y Planillas
├── tests/                       # Suite de tests unitarios pytest
└── .github/workflows/deploy.yml # Workflow de despliegue a GitHub Pages (master)
```

---

## 📜 Licencia y Autoría

- **Autor:** Lorenzo Pérez (Ingeniero de Proyectos y Procesos)
- **Organización:** Boxmark Leather Argentina S.A.
- **Licencia:** MIT License
