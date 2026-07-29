import pytest
import torch

from ml_engine.models.sobel import SobelPerception
from ml_engine.models.nca import NCAModel


def test_sobel_perception_output_channels():
    """Verify that 3x3 Sobel perception filter converts 16 channels to 48 perception channels (identity, grad_x, grad_y)."""
    batch_size, channels, height, width = 2, 16, 32, 32
    x = torch.randn(batch_size, channels, height, width)

    perception = SobelPerception(channels=16)
    out = perception(x)

    assert out.shape == (batch_size, 48, height, width), f"Expected shape (2, 48, 32, 32), got {out.shape}"


def test_nca_model_forward_shape_and_range():
    """Verify NCAModel output maintains state tensor shape [B, 16, H, W]."""
    batch_size, channels, height, width = 2, 16, 32, 32
    x = torch.randn(batch_size, channels, height, width)

    model = NCAModel(channels=16, hidden_dim=128)
    out = model(x)

    assert out.shape == (batch_size, channels, height, width), f"Expected shape (2, 16, 32, 32), got {out.shape}"


def test_nca_model_absorbing_boundary():
    """Verify that outer border cells remain zero (absorbing zero-padding boundary condition)."""
    batch_size, channels, height, width = 1, 16, 16, 16
    x = torch.zeros(batch_size, channels, height, width)
    # Seed a center cell with alpha = 1.0 and state values
    x[:, :, 8, 8] = 1.0

    model = NCAModel(channels=16, hidden_dim=128)
    out = model(x)

    # Check top row, bottom row, left col, right col are zero
    assert torch.all(out[:, :, 0, :] == 0.0), "Top boundary failed zero-padding"
    assert torch.all(out[:, :, -1, :] == 0.0), "Bottom boundary failed zero-padding"
    assert torch.all(out[:, :, :, 0] == 0.0), "Left boundary failed zero-padding"
    assert torch.all(out[:, :, :, -1] == 0.0), "Right boundary failed zero-padding"


def test_nca_model_alive_mask():
    """Verify that dead cells (alpha <= 0.1) remain dead (zero state)."""
    batch_size, channels, height, width = 1, 16, 8, 8
    x = torch.zeros(batch_size, channels, height, width)
    # Channel 3 is alpha. Keep cell (4,4) dead with alpha=0, set non-zero state on other channels
    x[:, 4, 4, 4] = 0.5  # random hidden state on dead cell

    model = NCAModel(channels=16, hidden_dim=128)
    out = model(x)

    assert torch.all(out[:, :, 4, 4] == 0.0), "Dead cell (alpha <= 0.1) must be masked to zero"
