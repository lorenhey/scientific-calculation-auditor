from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any
from enum import Enum

class Severity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    BLOCKING = "BLOCKING"

class Evidence(BaseModel):
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    cell_reference: Optional[str] = None
    context: Optional[str] = None

class Finding(BaseModel):
    rule_id: str
    severity: Severity
    message: str
    evidence: Evidence

class CalculationNode(BaseModel):
    id: str
    description: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    provenance: Optional[str] = None

class Input(CalculationNode):
    type: str = "input"

class Constant(CalculationNode):
    type: str = "constant"
    is_exact: bool = False

class Equation(BaseModel):
    id: str
    expression: str
    source: Optional[str] = None
    assumptions: List[str] = []
    
class Result(CalculationNode):
    type: str = "result"
    dependencies: List[str] = [] # IDs of nodes it depends on
    equation_id: Optional[str] = None

class AuditReport(BaseModel):
    target: str
    findings: List[Finding] = []
    nodes: Dict[str, Union[Input, Constant, Result, Equation]] = {}
    
    def add_finding(self, rule_id: str, severity: Severity, message: str, evidence: Evidence):
        self.findings.append(Finding(rule_id=rule_id, severity=severity, message=message, evidence=evidence))
