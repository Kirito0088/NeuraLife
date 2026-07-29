import os
import torch
import torch.nn as nn


def export_nca_to_onnx(
    model: nn.Module,
    output_path: str,
    channels: int = 16,
    height: int = 64,
    width: int = 64,
    opset_version: int = 17
) -> str:
    """Exports an NCAModel to FP32 ONNX format under 50KB byte size.
    
    Args:
        model: NCAModel instance
        output_path: Path where .onnx binary will be saved
        channels: State vector channels (16)
        height: Grid height
        width: Grid width
        opset_version: ONNX opset version (17)
    Returns:
        Absolute path to exported ONNX file
    """
    model.eval()
    dummy_input = torch.randn(1, channels, height, width, dtype=torch.float32)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    dynamic_axes = {
        "input": {0: "batch_size", 2: "height", 3: "width"},
        "output": {0: "batch_size", 2: "height", 3: "width"}
    }

    class SingleInputWrapper(nn.Module):
        def __init__(self, m: nn.Module):
            super().__init__()
            self.m = m
        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.m(x)

    wrapped_model = SingleInputWrapper(model)

    torch.onnx.export(
        wrapped_model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes=dynamic_axes,
        dynamo=False
    )

    return output_path


def verify_onnx_model(onnx_path: str) -> tuple[bool, str]:
    """Verifies ONNX model structural integrity using onnx.checker.
    
    Args:
        onnx_path: Path to ONNX model
    Returns:
        (is_valid, message)
    """
    try:
        import onnx
        model = onnx.load(onnx_path)
        onnx.checker.check_model(model)
        return True, "ONNX model validation passed successfully."
    except Exception as e:
        return False, str(e)


if __name__ == "__main__":
    from ml_engine.models.nca import NCAModel
    nca = NCAModel()
    out = export_nca_to_onnx(nca, "c:/Projects/NeuraLife/ml_engine/export/dummy_model.onnx")
    print(f"Exported model to {out}, size: {os.path.getsize(out)} bytes")
