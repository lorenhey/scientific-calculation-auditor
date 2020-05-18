import nbformat
from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError
from pathlib import Path
from ..ir import AuditReport, Severity, Evidence
from .python_auditor import PythonAuditor
import tempfile

class NotebookAuditor:
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.report = AuditReport(target=str(file_path))
        with open(file_path, "r", encoding="utf-8") as f:
            self.nb = nbformat.read(f, as_version=4)

    def audit(self, reproduce: bool = False) -> AuditReport:
        self._check_execution_order()
        self._check_ast()
        if reproduce:
            self._check_reproducibility()
        return self.report
        
    def _check_execution_order(self):
        last_exec_count = -1
        for i, cell in enumerate(self.nb.cells):
            if cell.cell_type == "code":
                count = cell.get("execution_count")
                if count is not None:
                    if count < last_exec_count:
                        self.report.add_finding(
                            rule_id="OUT_OF_ORDER_EXECUTION",
                            severity=Severity.WARNING,
                            message=f"Cell {i} was executed before a preceding cell. Hidden state may compromise reproducibility.",
                            evidence=Evidence(file_path=str(self.file_path), cell_reference=f"Cell {i}")
                        )
                    last_exec_count = count
                else:
                    self.report.add_finding(
                        rule_id="UNEXECUTED_CELL",
                        severity=Severity.INFO,
                        message=f"Cell {i} has not been executed in the saved notebook.",
                        evidence=Evidence(file_path=str(self.file_path), cell_reference=f"Cell {i}")
                    )

    def _check_ast(self):
        # We can extract the code and run the PythonAuditor on it
        for i, cell in enumerate(self.nb.cells):
            if cell.cell_type == "code":
                code = cell.source
                if code.strip():
                    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
                        f.write(code)
                        temp_path = f.name
                    
                    # Audit the code
                    py_auditor = PythonAuditor(Path(temp_path))
                    py_report = py_auditor.audit()
                    
                    # Adapt evidence
                    for finding in py_report.findings:
                        finding.evidence.file_path = str(self.file_path)
                        finding.evidence.cell_reference = f"Cell {i}"
                        self.report.findings.append(finding)
                        
                    Path(temp_path).unlink()
                    
    def _check_reproducibility(self):
        client = NotebookClient(self.nb, timeout=60, kernel_name='python3')
        try:
            # We execute it. If it fails, reproducibility fails.
            # In a real auditor, we'd also compare the outputs (STALE_OUTPUT).
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
