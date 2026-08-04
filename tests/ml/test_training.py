import os
import torch
import pytest

from ml_engine.models.nca import NCAModel
from ml_engine.training.sample_pool import SamplePool
from ml_engine.training.targets import generate_procedural_target, load_target_image
from ml_engine.training.train import NCATrainer, run_training


def test_target_generation_shapes_and_bounds():
    """Verify procedural targets generate [1, 4, 64, 64] tensors with values in [0, 1]."""
    target_circle = generate_procedural_target(64, 64, "circle")
    target_square = generate_procedural_target(64, 64, "square")
    target_emblem = generate_procedural_target(64, 64, "emblem")

    for t in [target_circle, target_square, target_emblem]:
        assert t.shape == (1, 4, 64, 64)
        assert torch.all(t >= 0.0) and torch.all(t <= 1.0)


def test_nca_trainer_dry_run():
    """Verify 5-iteration dry run of NCATrainer updates model weights and produces finite loss."""
    model = NCAModel(channels=16)
    target = generate_procedural_target(32, 32, "circle")
    pool = SamplePool(pool_size=16, channels=16, height=32, width=32)

    trainer = NCATrainer(model=model, target_tensor=target, pool=pool, lr=1e-3, device="cpu")

    losses = trainer.train(num_iterations=5, batch_size=4, min_steps=4, max_steps=8, log_interval=1)
    
    assert len(losses) == 5
    for l in losses:
        assert isinstance(l, float)
        assert not torch.isnan(torch.tensor(l))
        assert l > 0.0


def test_run_training_integration(tmp_path):
    """Verify run_training execution exports a valid ONNX binary."""
    out_onnx = os.path.join(tmp_path, "nca_model.onnx")
    exported_path = run_training(iterations=5, target_pattern="circle", output_onnx_path=str(out_onnx))

    assert os.path.exists(exported_path)
    assert os.path.getsize(exported_path) <= 51200
