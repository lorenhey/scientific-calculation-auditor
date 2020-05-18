import ast
from pathlib import Path
from ..ir import AuditReport, Severity, Evidence

class PythonAuditor(ast.NodeVisitor):
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.report = AuditReport(target=str(file_path))
        with open(file_path, "r", encoding="utf-8") as f:
            self.source = f.read()
        self.tree = ast.parse(self.source)

    def audit(self) -> AuditReport:
        self.visit(self.tree)
        return self.report

    def visit_BinOp(self, node):
        # Detect inline conversions like * 1000, / 3600
        if isinstance(node.op, (ast.Mult, ast.Div)):
            for child in (node.left, node.right):
                if isinstance(child, ast.Constant) and isinstance(child.value, (int, float)):
                    val = child.value
                    if val in [1000, 3600, 60, 2.54, 1e6]:
                        self.report.add_finding(
                            rule_id="INLINE_CONVERSION",
                            severity=Severity.WARNING,
                            message=f"Possible inline unit conversion or magic number ({val}) detected in binary operation.",
                            evidence=Evidence(file_path=str(self.file_path), line_number=node.lineno, context=ast.unparse(node))
                        )
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id == "round":
            self.report.add_finding(
                rule_id="EARLY_ROUNDING",
                severity=Severity.WARNING,
                message="Explicit round() call detected. Intermediate rounding can cause precision loss.",
                evidence=Evidence(file_path=str(self.file_path), line_number=node.lineno, context=ast.unparse(node))
            )
        self.generic_visit(node)
        
    def visit_Assign(self, node):
        # Look for constants without sources (magic numbers assigned to variables)
        if isinstance(node.value, ast.Constant) and isinstance(node.value.value, (int, float)):
            target_name = node.targets[0].id if isinstance(node.targets[0], ast.Name) else "unknown"
            # In a real auditor, we'd check if there's a comment/docstring specifying the unit/source.
            self.report.add_finding(
                rule_id="UNDOCUMENTED_CONSTANT",
                severity=Severity.INFO,
                message=f"Variable '{target_name}' assigned numeric literal {node.value.value} without explicit provenance.",
                evidence=Evidence(file_path=str(self.file_path), line_number=node.lineno, context=ast.unparse(node))
            )
        self.generic_visit(node)
