import pytest
import tempfile
import json
from pathlib import Path
from scientific_calculation_auditor.ir import AuditReport, Severity, Evidence
from scientific_calculation_auditor.auditors.python_auditor import PythonAuditor
from scientific_calculation_auditor.auditors.notebook_auditor import NotebookAuditor

def test_ir_report_creation():
    report = AuditReport(target="test_calc.py")
    assert report.target == "test_calc.py"
    assert len(report.findings) == 0

    report.add_finding(
        rule_id="INLINE_CONVERSION",
        severity=Severity.WARNING,
        message="Inline conversion detected",
        evidence=Evidence(file_path="test_calc.py", line_number=10, context="x / 3600")
    )
    assert len(report.findings) == 1
    assert report.findings[0].rule_id == "INLINE_CONVERSION"
    assert report.findings[0].severity == Severity.WARNING

def test_python_auditor_detects_magic_numbers_and_rounding():
    code = """
# Script de cálculo hidráulico
g = 9.81
densidad = 1000
caudal_m3h = 150
caudal_m3s = caudal_m3h / 3600
presion_pa = round(0.5 * densidad * (caudal_m3s ** 2), 2)
"""
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(code)
        temp_path = Path(f.name)

    try:
        auditor = PythonAuditor(temp_path)
        report = auditor.audit()

        rule_ids = [f.rule_id for f in report.findings]
        assert "UNDOCUMENTED_CONSTANT" in rule_ids
        assert "INLINE_CONVERSION" in rule_ids
        assert "EARLY_ROUNDING" in rule_ids
    finally:
        if temp_path.exists():
            temp_path.unlink()

def test_notebook_auditor_detects_out_of_order_execution():
    nb_dict = {
        "cells": [
            {
                "cell_type": "code",
                "execution_count": 5,
                "metadata": {},
                "source": ["a = 10\n"]
            },
            {
                "cell_type": "code",
                "execution_count": 2,
                "metadata": {},
                "source": ["b = a * 2\n"]
            }
        ],
        "metadata": {},
        "nbformat": 4,
        "nbformat_minor": 2
    }

    with tempfile.NamedTemporaryFile("w", suffix=".ipynb", delete=False, encoding="utf-8") as f:
        json.dump(nb_dict, f)
        temp_path = Path(f.name)

    try:
        auditor = NotebookAuditor(temp_path)
        report = auditor.audit(reproduce=False)

        rule_ids = [f.rule_id for f in report.findings]
        assert "OUT_OF_ORDER_EXECUTION" in rule_ids
    finally:
        if temp_path.exists():
            temp_path.unlink()
