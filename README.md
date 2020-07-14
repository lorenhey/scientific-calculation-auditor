# scientific-calculation-auditor

> **Reconstructing the chain of evidence.**

`scientific-calculation-auditor` (sca) reconstructs the chain of evidence of a calculation and points out where it stops being traceable, reproducible, or technically defensible.

When reviewing a calculation, whether it's a Jupyter Notebook, a Python script, or an Excel Spreadsheet, the most important question is: *Where did this number come from?* This project exists to automatically audit calculation artifacts for common scientific and engineering issues such as hidden assumptions, hardcoded constants without provenance, inline unit conversions, early rounding, and broken execution graphs.

## Features

- **Spreadsheet Auditor (XLSX)**: Detects manual overrides inside formula columns, hardcoded numeric constants inside formulas, and links to external workbooks.
- **Python Auditor**: Uses AST parsing (not brittle regex) to detect magic numbers, early rounding, and undocumented constant assignments.
- **Notebook Auditor (IPYNB)**: Checks for out-of-order execution which can lead to hidden state, and attempts a Clean Re-execution from a fresh kernel to verify reproducibility.
- **Unified Intermediate Representation (IR)**: Models `Inputs`, `Constants`, `Equations`, and `Results` to standardize findings across formats.
- **CLI and CI-Ready**: Fully functional from the terminal, capable of breaking builds (`--fail-on-error`) if blocking scientific issues are found.

## Installation

```bash
uv pip install -e .
```

## Quick Start / Demo

Run the flagship demo to see it audit a broken Python script and a broken Excel spreadsheet in real-time:
```bash
sca demo
```

## Usage

### Audit a File
Audit a Python script, Notebook, or Excel workbook:
```bash
sca audit my_analysis.py
sca audit calculations.xlsx
sca audit model.ipynb
```

### Reproduce a Notebook
Attempt a clean re-execution of a Jupyter notebook to verify that its outputs match the code:
```bash
sca reproduce model.ipynb
```

## Audit Example

```text
> sca audit calculation.py

Audit Report for calculation.py

+-----------------------------------------------------------------------------+
| Severity | Rule                | Message             | Evidence             |
|----------+---------------------+---------------------+----------------------|
| INFO     | UNDOCUMENTED_CONST  | Variable 'g'        | Line 4               |
|          |                     | assigned numeric    | Context: g = 9.81    |
|          |                     | literal 9.81        |                      |
|          |                     | without explicit    |                      |
|          |                     | provenance.         |                      |
| WARNING  | INLINE_CONVERSION   | Possible inline     | Line 6               |
|          |                     | unit conversion or  | Context:             |
|          |                     | magic number (3600) | flow_rate_m3_h /     |
|          |                     | detected in binary  | 3600                 |
|          |                     | operation.          |                      |
| WARNING  | EARLY_ROUNDING      | Explicit round()    | Line 9               |
|          |                     | call detected.      | Context: round(0.5 * |
|          |                     | Intermediate        | 1000 *               |
|          |                     | rounding can cause  | flow_rate_m3_s ** 2, |
|          |                     | precision loss.     | 2)                   |
+-----------------------------------------------------------------------------+
```

## Data Philosophy

- **Traceability**: An input without a source is a liability.
- **Determinism**: Heuristics are explicitly marked as warnings. We do not use LLMs as the core rule engine to ensure deterministic auditing.
- **No Silent Executions**: Opening an Excel file parses its XML/AST; it does not execute macros.

## License
MIT License.
