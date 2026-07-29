import torch
import torch.nn as nn
import torch.nn.functional as F


class SobelPerception(nn.Module):
    """3x3 Sobel Perception Filter for 16-channel Neural Cellular Automata state vectors.
    
    Produces 48 output channels: [Identity (16), Grad_X (16), Grad_Y (16)].
    Uses depthwise convolution with zero padding to preserve spatial dimensions [H, W].
    """

    def __init__(self, channels: int = 16):
        super().__init__()
        self.channels = channels

        # 3x3 Sobel kernels
        sobel_x = torch.tensor([[-1.0, 0.0, 1.0],
                                [-2.0, 0.0, 2.0],
                                [-1.0, 0.0, 1.0]], dtype=torch.float32) / 8.0

        sobel_y = torch.tensor([[-1.0, -2.0, -1.0],
                                [ 0.0,  0.0,  0.0],
                                [ 1.0,  2.0,  1.0]], dtype=torch.float32) / 8.0

        identity = torch.tensor([[0.0, 0.0, 0.0],
                                 [0.0, 1.0, 0.0],
                                 [0.0, 0.0, 0.0]], dtype=torch.float32)

        # Stack kernels: [3, 1, 3, 3] per channel group
        kernels = torch.stack([identity, sobel_x, sobel_y], dim=0) # [3, 3, 3]
        # Reshape to depthwise conv format [3 * C, 1, 3, 3]
        kernels = kernels.repeat(channels, 1, 1).unsqueeze(1) # [48, 1, 3, 3]

        self.register_buffer("weight", kernels)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Args:
            x: Tensor of shape [B, C, H, W]
        Returns:
            Perception vector of shape [B, 3 * C, H, W]
        """
        return F.conv2d(x, self.weight, padding=1, groups=self.channels)
