import torch
import torch.nn as nn
import torch.nn.functional as F

from ml_engine.models.sobel import SobelPerception


class NCAModel(nn.Module):
    """Neural Cellular Automata (NCA) update model for pattern generation and self-healing morphogenesis.
    
    Architecture:
    - Perception: 3x3 Sobel filters (48 channels output: identity, grad_x, grad_y for 16 state channels).
    - Update Network: 1x1 Conv (48 -> 128 -> 16).
    - Alive Cell Masking: Cells are alive if 3x3 max-pooled alpha channel > 0.1.
    - Absorbing Boundaries: Hard zeroing of outer grid borders to prevent infinite outward growth.
    """

    def __init__(self, channels: int = 16, hidden_dim: int = 64, fire_rate: float = 0.5):
        super().__init__()
        self.channels = channels
        self.hidden_dim = hidden_dim
        self.fire_rate = fire_rate

        self.perception = SobelPerception(channels=self.channels)

        # 1x1 Conv update network (16*3=48 -> hidden_dim -> channels)
        self.update_net = nn.Sequential(
            nn.Conv2d(self.channels * 3, hidden_dim, kernel_size=1),
            nn.ReLU(),
            nn.Conv2d(hidden_dim, self.channels, kernel_size=1, bias=False)
        )

        # Zero initialize output projection layer so initial update is zero
        nn.init.zeros_(self.update_net[-1].weight)

    def get_alive_mask(self, x: torch.Tensor) -> torch.Tensor:
        """Alive mask: cell is alive if max 3x3 neighborhood alpha (channel 3) > 0.1."""
        alpha = x[:, 3:4, :, :]
        alive = F.max_pool2d(alpha, kernel_size=3, stride=1, padding=1) > 0.1
        return alive.float()

    def apply_absorbing_boundary(self, x: torch.Tensor) -> torch.Tensor:
        """Hard zero-padding at spatial borders (row 0, row H-1, col 0, col W-1)."""
        h, w = x.shape[2], x.shape[3]
        mask = F.pad(torch.ones(1, 1, h - 2, w - 2, device=x.device, dtype=x.dtype), (1, 1, 1, 1), value=0.0)
        return x * mask

    def forward(self, x: torch.Tensor, step_size: float = 1.0) -> torch.Tensor:
        """Args:
            x: State tensor of shape [B, 16, H, W]
            step_size: Integration step multiplier
        Returns:
            Updated state tensor of shape [B, 16, H, W]
        """
        pre_alive = self.get_alive_mask(x)

        perc = self.perception(x)
        delta = self.update_net(perc)

        # Stochastic cell update mask during training/inference if fire_rate < 1.0
        if self.training and self.fire_rate < 1.0:
            stochastic_mask = (torch.rand(x.shape[0], 1, x.shape[2], x.shape[3], device=x.device) < self.fire_rate).float()
            delta = delta * stochastic_mask

        x = x + delta * step_size

        post_alive = self.get_alive_mask(x)
        alive_mask = pre_alive * post_alive

        x = x * alive_mask
        x = self.apply_absorbing_boundary(x)
        return x
