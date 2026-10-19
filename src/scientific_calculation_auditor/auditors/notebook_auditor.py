import json
import tempfile
from pathlib import Path
from ..ir import AuditReport, Severity, Evidence
from .python_auditor import PythonAuditor

try:
    import nbformat
except ImportError:
    nbformat = None

try:
    from nbclient import NotebookClient
    from nbclient.exceptions import CellExecutionError
except ImportError:
    NotebookClient = None
    CellExecutionError = Exception

class MockCell:
    def __init__(self, data):
        self.cell_type = data.get("cell_type", "code")
        exec_count = data.get("execution_count")
        self.execution_count = int(exec_count) if exec_count is not None and isinstance(exec_count, (int, float)) else exec_count
        source = data.get("source", "")
        self.source = "".join(source) if isinstance(source, list) else str(source)
        self._data = data

    def get(self, key, default=None):
        return self._data.get(key, default)

class MockNotebook:
    def __init__(self, cells):
        self.cells = cells

class NotebookAuditor:
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.report = AuditReport(target=str(file_path))
        with open(file_path, "r", encoding="utf-8") as f:
            if nbformat:
                self.nb = nbformat.read(f, as_version=4)
            else:
                raw_data = json.load(f)
                cells = [MockCell(c) for c in raw_data.get("cells", [])]
                self.nb = MockNotebook(cells)

    def audit(self, reproduce: bool = False) -> AuditReport:
        self._check_execution_order()
        self._check_ast()
        if reproduce:
            self._check_reproducibility()
        return self.report
        
    def _check_execution_order(self):
        last_exec_count = -1
        for i, cell in enumerate(self.nb.cells):
            cell_type = getattr(cell, "cell_type", "code")
            if cell_type == "code":
                count = cell.get("execution_count") if hasattr(cell, "get") else getattr(cell, "execution_count", None)
                if count is not None and isinstance(count, int):
                    if count < last_exec_count:
                        self.report.add_finding(
                            rule_id="OUT_OF_ORDER_EXECUTION",
                            severity=Severity.WARNING,
                            message=f"Cell {i} was executed before a preceding cell. Hidden state may compromise reproducibility.",
                            evidence=Evidence(file_path=str(self.file_path), cell_reference=f"Cell {i}")
                        )
                    last_exec_count = count
                elif count is None:
                    self.report.add_finding(
                        rule_id="UNEXECUTED_CELL",
                        severity=Severity.INFO,
                        message=f"Cell {i} has not been executed in the saved notebook.",
                        evidence=Evidence(file_path=str(self.file_path), cell_reference=f"Cell {i}")
                    )

    def _check_ast(self):
        for i, cell in enumerate(self.nb.cells):
            cell_type = getattr(cell, "cell_type", "code")
            if cell_type == "code":
                code = getattr(cell, "source", "")
                if code.strip():
                    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as f:
                        f.write(code)
                        temp_path = f.name
                    
                    try:
                        py_auditor = PythonAuditor(Path(temp_path))
                        py_report = py_auditor.audit()
                        
                        for finding in py_report.findings:
                            finding.evidence.file_path = str(self.file_path)
                            finding.evidence.cell_reference = f"Cell {i}"
                            self.report.findings.append(finding)
                    finally:
                        if Path(temp_path).exists():
                            Path(temp_path).unlink()
                        
    def _check_reproducibility(self):
        if not NotebookClient:
            self.report.add_finding(
                rule_id="REPRODUCIBILITY_SKIPPED",
                severity=Severity.INFO,
                message="nbclient no disponible para re-ejecución automática en este entorno.",
                evidence=Evidence(file_path=str(self.file_path))
            )
            return

        client = NotebookClient(self.nb, timeout=60, kernel_name='python3')
        try:
            client.execute()
            self.report.add_finding(
                rule_id="CLEAN_REEXECUTION",
                severity=Severity.INFO,
                message="Notebook executed successfully from a clean kernel.",
                evidence=Evidence(file_path=str(self.file_path))
            )
        except CellExecutionError as e:
            self.report.add_finding(
                rule_id="REPRODUCIBILITY_FAILURE",
                severity=Severity.ERROR,
                message="Notebook failed to execute from a clean kernel.",
                evidence=Evidence(file_path=str(self.file_path), context=str(e))
            )
        except Exception as e:
            self.report.add_finding(
                rule_id="REPRODUCIBILITY_ERROR",
                severity=Severity.ERROR,
                message="Error during clean re-execution.",
                evidence=Evidence(file_path=str(self.file_path), context=str(e))
            )
