import os
import tempfile
import torch
import pytest

from ml_engine.models.nca import NCAModel
from ml_engine.export.export_onnx import export_nca_to_onnx, verify_onnx_model


def test_onnx_export_file_size_and_contract():
    """Verify that ONNX export creates a valid model under 50KB with input/output shape [1, 16, 64, 64]."""
    model = NCAModel(channels=16)
    model.eval()

    with tempfile.TemporaryDirectory() as tmp_dir:
        onnx_path = os.path.join(tmp_dir, "dummy_model.onnx")
        
        # Export
        export_nca_to_onnx(model, onnx_path, height=64, width=64)

        # 1. Assert file exists
        assert os.path.exists(onnx_path), "ONNX file was not created"

        # 2. Assert byte size <= 50KB (51,200 bytes)
        file_size = os.path.getsize(onnx_path)
        assert file_size <= 51200, f"ONNX model size {file_size} bytes exceeds 50KB (51,200 bytes) constraint"

        # 3. Verify ONNX structure and tensor contract
        is_valid, message = verify_onnx_model(onnx_path)
        assert is_valid, f"ONNX validation failed: {message}"
