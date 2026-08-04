import torch
import math


def generate_procedural_target(
    height: int = 64,
    width: int = 64,
    pattern_type: str = "circle"
) -> torch.Tensor:
    """Generates an RGBA target tensor of shape [1, 4, H, W] with values in [0.0, 1.0].
    
    Args:
        height: Grid height
        width: Grid width
        pattern_type: "circle", "square", or "emblem"
    Returns:
        Target RGBA tensor [1, 4, H, W]
    """
    target = torch.zeros(1, 4, height, width, dtype=torch.float32)
    center_y, center_x = height / 2.0, width / 2.0
    radius = min(height, width) / 3.0

    y_grid, x_grid = torch.meshgrid(
        torch.arange(height, dtype=torch.float32),
        torch.arange(width, dtype=torch.float32),
        indexing="ij"
    )
    dist = torch.sqrt((y_grid - center_y) ** 2 + (x_grid - center_x) ** 2)

    if pattern_type == "circle":
        # Multi-ring glowing emblem target
        mask = (dist <= radius).float()
        
        # Color channels based on distance from center
        r = torch.clamp(1.0 - dist / radius, 0.0, 1.0)
        g = torch.clamp(torch.sin((dist / radius) * math.pi), 0.0, 1.0)
        b = torch.clamp((dist / radius), 0.0, 1.0)
        
        target[0, 0] = r * mask
        target[0, 1] = g * mask
        target[0, 2] = b * mask
        target[0, 3] = mask

    elif pattern_type == "square":
        half_side = radius * 0.8
        mask = ((torch.abs(y_grid - center_y) <= half_side) & (torch.abs(x_grid - center_x) <= half_side)).float()
        target[0, 0] = 0.2 * mask
        target[0, 1] = 0.8 * mask
        target[0, 2] = 0.9 * mask
        target[0, 3] = mask

    else:
        # Emblem default
        ring_mask = ((dist <= radius) & (dist >= radius * 0.4)).float()
        core_mask = (dist <= radius * 0.3).float()
        full_mask = ring_mask + core_mask
        
        target[0, 0] = (1.0 * ring_mask + 0.1 * core_mask)
        target[0, 1] = (0.4 * ring_mask + 0.9 * core_mask)
        target[0, 2] = (0.8 * ring_mask + 0.3 * core_mask)
        target[0, 3] = full_mask

    return target


def load_target_image(
    image_path: str,
    height: int = 64,
    width: int = 64
) -> torch.Tensor:
    """Loads a PNG image and converts it into a normalized RGBA target tensor [1, 4, H, W]."""
    try:
        from PIL import Image
        import numpy as np

        img = Image.open(image_path).convert("RGBA")
        img = img.resize((width, height), Image.Resampling.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0  # [H, W, 4]
        tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)  # [1, 4, H, W]
        return tensor
    except Exception as e:
        print(f"Warning: Failed to load target image from {image_path}: {e}. Falling back to procedural circle.")
        return generate_procedural_target(height=height, width=width, pattern_type="circle")
