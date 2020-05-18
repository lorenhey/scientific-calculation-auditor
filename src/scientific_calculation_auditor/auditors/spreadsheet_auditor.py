import openpyxl
from pathlib import Path
from ..ir import AuditReport, Severity, Evidence
import re

class SpreadsheetAuditor:
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.report = AuditReport(target=str(file_path))
        self.wb = openpyxl.load_workbook(file_path, data_only=False)
        
    def audit(self) -> AuditReport:
        for sheet_name in self.wb.sheetnames:
            sheet = self.wb[sheet_name]
            self._audit_sheet(sheet)
        return self.report
        
    def _audit_sheet(self, sheet):
        # We'll just do some basic checks for the demo
        for row in sheet.iter_rows():
            for cell in row:
                if cell.value is not None:
                    if isinstance(cell.value, str) and cell.value.startswith("="):
                        self._audit_formula(sheet, cell)
                    elif isinstance(cell.value, (int, float)):
                        # Heuristic: if surrounded by formulas but this is a constant
                        # We can check above and below
                        if self._is_manual_override(sheet, cell):
                            self.report.add_finding(
                                rule_id="MANUAL_OVERRIDE",
                                severity=Severity.WARNING,
                                message=f"Cell {cell.coordinate} contains a manual constant within a region of formulas.",
                                evidence=Evidence(file_path=str(self.file_path), cell_reference=f"{sheet.title}!{cell.coordinate}")
                            )
                            
    def _audit_formula(self, sheet, cell):
        formula = cell.value
        # Check for external links
        if "[" in formula and "]" in formula:
            self.report.add_finding(
                rule_id="EXTERNAL_LINK",
                severity=Severity.WARNING,
                message=f"Cell {cell.coordinate} contains a formula referencing an external workbook.",
                evidence=Evidence(file_path=str(self.file_path), cell_reference=f"{sheet.title}!{cell.coordinate}", context=formula)
            )
            
        # Check for hardcoded constants
        # Regex to find numbers in formulas that aren't cell references (e.g. not A1)
        # simplified check: looking for explicit floats like 9.81, 1000
        matches = re.findall(r'(?<![A-Z])\b\d+\.\d+\b', formula)
        if matches:
            self.report.add_finding(
                rule_id="HARDCODED_CONSTANT",
                severity=Severity.WARNING,
                message=f"Formula in {cell.coordinate} contains hardcoded numeric constants: {', '.join(matches)}",
                evidence=Evidence(file_path=str(self.file_path), cell_reference=f"{sheet.title}!{cell.coordinate}", context=formula)
            )

    def _is_manual_override(self, sheet, cell):
        # Check cell above and below
        row, col = cell.row, cell.column
        if row > 1 and row < sheet.max_row:
            above = sheet.cell(row=row-1, column=col).value
            below = sheet.cell(row=row+1, column=col).value
            if isinstance(above, str) and above.startswith("=") and isinstance(below, str) and below.startswith("="):
                return True
        return False
