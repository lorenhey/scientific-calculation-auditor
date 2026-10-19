/**
 * scientific-calculation-auditor (SCA) - Rule Catalog & Preconfigured Test Artifacts
 * Formal definition of scientific/engineering rules and realistic industry presets.
 */

const SCA_RULES = {
  UNDOCUMENTED_CONSTANT: {
    id: "UNDOCUMENTED_CONSTANT",
    name: "Constante Numérica sin Procedencia (Magic Number)",
    severity: "INFO",
    category: "Trazabilidad de Datos",
    description: "Se detectó la asignación de un literal numérico directo sin comentario, docstring o referencia normativa que declare su fuente y unidad física.",
    remediation: "Definir la constante en un bloque de configuración o diccionario, especificando magnitud, unidad SI y cita bibliográfica/normativa (ej. ASME, DIN, NIST)."
  },
  INLINE_CONVERSION: {
    id: "INLINE_CONVERSION",
    name: "Conversión de Unidades Mágica en Operación Binaria",
    severity: "WARNING",
    category: "Rigor Dimensional",
    description: "Se detectó un multiplicador o divisor empírico (ej. /3600, *1000, *2.54) dentro de una fórmula matemática en lugar de emplear un motor de unidades explícito (ej. Pint).",
    remediation: "Utilizar objetos con unidades explícitas (Q.to('m**3/s')) o declarar factores de conversión nominados (SEGUNDOS_POR_HORA = 3600)."
  },
  EARLY_ROUNDING: {
    id: "EARLY_ROUNDING",
    name: "Redondeo Prematuro en Cálculo Intermedio",
    severity: "WARNING",
    category: "Integridad Numérica",
    description: "Invocación explícita de round() sobre una variable intermedia. El redondeo truncado degrada la propagación de incertidumbre en operaciones subsecuentes.",
    remediation: "Mantener precisión de punto flotante completa (float64) durante todo el cálculo analítico y formatear el redondeo únicamente en la presentación final."
  },
  HARDCODED_CONSTANT: {
    id: "HARDCODED_CONSTANT",
    name: "Constante Numérica Oculta en Fórmula de Planilla",
    severity: "WARNING",
    category: "Trazabilidad en Planillas",
    description: "Una fórmula de celda contiene números fijos (ej. =C3*1.21*9.81) embebidos en el texto de la fórmula en lugar de referenciar celdas con parámetros declarados.",
    remediation: "Extraer la constante a una celda de parámetro etiquetada en la cabecera del documento y referenciarla por dirección o nombre de rango."
  },
  MANUAL_OVERRIDE: {
    id: "MANUAL_OVERRIDE",
    name: "Sobreescritura Manual de Celda Calculada",
    severity: "ERROR",
    category: "Integridad en Planillas",
    description: "Una celda contiene un valor escalar constante en medio de una columna o serie destinada a fórmulas calculadas homogéneas.",
    remediation: "Restaurar la fórmula homogénea o explicitar la excepción en una columna de ajuste debidamente documentada con justificación técnica."
  },
  EXTERNAL_LINK: {
    id: "EXTERNAL_LINK",
    name: "Referencia a Libro Externo no Vinculado",
    severity: "WARNING",
    category: "Reproducibilidad",
    description: "La fórmula referencia celdas de un archivo de planilla externo (ej. [Reporte_Externo.xlsx]). Si el archivo se mueve, el cálculo se quiebra silenciosamente.",
    remediation: "Importar formalmente los datos de entrada al proyecto con marca temporal y control de versiones local."
  },
  OUT_OF_ORDER_EXECUTION: {
    id: "OUT_OF_ORDER_EXECUTION",
    name: "Ejecución de Celdas Fuera de Secuencia (Hidden State)",
    severity: "WARNING",
    category: "Reproducibilidad de Notebooks",
    description: "Una celda de código posee un número de ejecución menor al de una celda anterior. El estado de la memoria no coincide con la lectura top-to-bottom del cuaderno.",
    remediation: "Ejecutar 'Restart Kernel and Run All' para asegurar que el cuaderno se reproduzca secuencialmente sin variables zombi."
  },
  UNEXECUTED_CELL: {
    id: "UNEXECUTED_CELL",
    name: "Celda de Código no Ejecutada",
    severity: "INFO",
    category: "Completitud de Notebooks",
    description: "La celda de código no ha sido ejecutada en la versión guardada del notebook, dejando el resultado sin verificar.",
    remediation: "Ejecutar todas las celdas antes de commitear o archivar la memoria de cálculo."
  },
  DIV_BY_ZERO_RISK: {
    id: "DIV_BY_ZERO_RISK",
    name: "Riesgo de División por Cero no Controlada",
    severity: "ERROR",
    category: "Robustez Algorítmica",
    description: "Operación de división donde el denominador es una variable de entrada sin aserción de valor positivo no nulo.",
    remediation: "Agregar guarda o validación previa (ej. `assert diametro > 0, 'El diámetro debe ser estrictamente positivo'`)."
  }
};

const SCA_PRESETS = {
  python_pump_broken: {
    id: "python_pump_broken",
    type: "python",
    title: "Cálculo Hidráulico de Bomba de Proceso (Con Errores de Auditoría)",
    filename: "calculo_bomba_proceso.py",
    author: "Ingeniería de Planta",
    discipline: "Mecánica de Fluidos e Hidráulica Industrial",
    code: `# =====================================================================
# MEMORIA TÉCNICA: Dimensionamiento de Bomba de Recirculación P-102
# =====================================================================
import math

# Constantes físicas y parámetros de instalación
g = 9.80665
densidad_agua = 998.2
caudal_nominal_m3h = 120.0
diametro_tubo_mm = 80.0
longitud_tubo_m = 45.0
rugosidad_mm = 0.045
altura_estatica = 18.5

# Conversión inline de caudal (m3/h -> m3/s)
caudal_m3s = caudal_nominal_m3h / 3600

# Área de paso
area_flujo = (math.pi * (diametro_tubo_mm / 1000)**2) / 4

# Velocidad de flujo con redondeo prematuro
velocidad = round(caudal_m3s / area_flujo, 2)

# Pérdida de carga por Darcy-Weisbach (con constante mágica 0.02)
hf_friccion = 0.02 * (longitud_tubo_m / (diametro_tubo_mm / 1000)) * (velocidad**2 / (2 * g))

# Altura manométrica total con redondeo intermedio
H_total = round(altura_estatica + hf_friccion, 1)

# Potencia hidráulica demandada (W -> kW con división inline)
potencia_kw = (densidad_agua * g * caudal_m3s * H_total) / 1000
`
  },

  python_steam_clean: {
    id: "python_steam_clean",
    type: "python",
    title: "Dimensionamiento de Cañería de Vapor (Defendible y Trazable)",
    filename: "steam_pipe_sizing_audited.py",
    author: "Ing. Lorenzo Pérez",
    discipline: "Termomecánica / ASME B31.1",
    code: `# =====================================================================
# MEMORIA DE CÁLCULO: Línea de Vapor Saturado a Bombos de Curtido
# Conforme a Norma ASME B31.1 / Boxmark Leather Argentina S.A.
# =====================================================================
import math

# 1. CONSTANTES FÍSICAS CON CITAS Y METADATOS
SEGUNDOS_POR_HORA = 3600.0   # [s/h] Factor de conversión exacto SI
MILIMETROS_POR_METRO = 1000.0 # [mm/m] Factor de conversión exacto SI

# 2. PARÁMETROS NOMINALES CON FUENTE DE MEDICIÓN
caudal_masico_kg_h = 2400.0  # [kg/h] Flujómetro ultrasónico calderas (Tag FT-201)
volumen_especifico = 0.2729  # [m^3/kg] Tablas de Vapor IAPWS-97 a 7.0 bar abs.
diametro_interior_mm = 102.3 # [mm] Tubo Sch. 40 DN 100 s/ ASTM A106 Gr. B
velocidad_maxima_adm = 30.0  # [m/s] Límite de erosión y ruido según ASME B31.1

# 3. VERIFICACIÓN DE PRECONDICIONES
assert diametro_interior_mm > 0.0, "Diámetro de cañería debe ser positivo"

# 4. DESARROLLO ANALÍTICO EN PRECISIÓN COMPLETA (FLOAT64)
diametro_interior_m = diametro_interior_mm / MILIMETROS_POR_METRO
area_transversal_m2 = (math.pi * (diametro_interior_m ** 2)) / 4.0

caudal_masico_kg_s = caudal_masico_kg_h / SEGUNDOS_POR_HORA
caudal_volumetrico_m3_s = caudal_masico_kg_s * volumen_especifico

velocidad_vapor_m_s = caudal_volumetrico_m3_s / area_transversal_m2

# 5. CRITERIO DE VERIFICACIÓN
cumple_normativa = velocidad_vapor_m_s <= velocidad_maxima_adm
margen_seguridad_pct = ((velocidad_maxima_adm - velocidad_vapor_m_s) / velocidad_maxima_adm) * 100.0

print(f"Velocidad: {velocidad_vapor_m_s:.2f} m/s | Cumple: {cumple_normativa}")
`
  },

  spreadsheet_plant_steam: {
    id: "spreadsheet_plant_steam",
    type: "spreadsheet",
    title: "Balance de Vapor y Costos Energéticos (Con Overrides y Fórmulas Ocultas)",
    filename: "Balance_Vapor_Planta.xlsx",
    sheetName: "Consumos_Térmicos",
    columns: ["Equipo / Línea", "Presión [bar]", "Caudal [kg/h]", "Entalpía [kJ/kg]", "Costo [$ / h]"],
    rows: [
      { equipo: "Bombo de Curtido B-01", presion: 6.5, caudal: 450, entalpia: "=2763.5", costo: "=C2*0.045*1.21" },
      { equipo: "Bombo de Curtido B-02", presion: 6.5, caudal: 520, entalpia: "=2763.5", costo: "=C3*0.045*1.21" },
      { equipo: "Túnel de Secado TS-01", presion: 6.0, caudal: 850, entalpia: "=2756.2", costo: 42.50 }, // Manual override!
      { equipo: "Túnel de Secado TS-02", presion: 6.0, caudal: 810, entalpia: "=2756.2", costo: "=[Costos_Central.xlsx]Tarifas!$B$2*C5" }, // External link!
      { equipo: "Lavadora de Pieles L-01", presion: 5.5, caudal: 380, entalpia: "=2748.1", costo: "=C6*0.045*1.21" }
    ]
  },

  notebook_reaction_unreproducible: {
    id: "notebook_reaction_unreproducible",
    type: "notebook",
    title: "Cinética de Reactor Químico (Ejecución Desordenada y Estado Oculto)",
    filename: "cinetica_reactor_quimico.ipynb",
    cells: [
      { id: 0, exec_count: 1, type: "code", source: "import numpy as np\nimport matplotlib.pyplot as plt\nprint('Módulos cargados')" },
      { id: 1, exec_count: 5, type: "code", source: "k_cinetica = 0.045  # [1/s] Constante cinética ajustada manualmente\nvolumen_m3 = 12.5" },
      { id: 2, exec_count: 2, type: "code", source: "# Esta celda se corrió ANTES que la celda 1!\nconversion_esperada = 1 - np.exp(-k_cinetica * 60)" },
      { id: 3, exec_count: null, type: "code", source: "# Celda no ejecutada en el archivo guardado\nrendimiento_final = conversion_esperada * volumen_m3 * 1000" },
      { id: 4, exec_count: 6, type: "code", source: "print(f'Conversión estimada: {conversion_esperada * 100:.2f}%')" }
    ]
  }
};
