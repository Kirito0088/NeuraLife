import torch
import pytest

from ml_engine.training.sample_pool import SamplePool


def test_sample_pool_initialization():
    """Verify SamplePool initializes with 1024 state tensors of shape [16, H, W]."""
    pool_size, channels, height, width = 1024, 16, 64, 64
    pool = SamplePool(pool_size=pool_size, channels=channels, height=height, width=width)

    assert pool.pool.shape == (pool_size, channels, height, width), f"Expected pool shape (1024, 16, 64, 64), got {pool.pool.shape}"
    # Verify seed cell in center has alpha = 1.0
    center_h, center_w = height // 2, width // 2
    assert torch.all(pool.pool[:, 3, center_h, center_w] == 1.0), "Seed cell alpha should be 1.0"


def test_sample_pool_sample_and_commit():
    """Verify sampling a batch returns correct shapes/indices and commit updates pool states."""
    pool = SamplePool(pool_size=1024, channels=16, height=32, width=32)
    batch_size = 8

    states, indices = pool.sample(batch_size=batch_size)

    assert states.shape == (batch_size, 16, 32, 32)
    assert len(indices) == batch_size

    # Modify sampled states and commit back
    new_states = states + 0.5
    pool.commit(indices, new_states)

    updated_states = pool.pool[indices]
    assert torch.allclose(updated_states, new_states), "Committed states were not updated in pool"


def test_sample_pool_damage_injection():
    """Verify that sample pool can inject damage into a subset of sampled states for self-healing training."""
    pool = SamplePool(pool_size=1024, channels=16, height=32, width=32)
    batch_size = 8

    damaged_states = pool.sample_with_damage(batch_size=batch_size, damage_radius=4)
    assert damaged_states.shape == (batch_size, 16, 32, 32)
