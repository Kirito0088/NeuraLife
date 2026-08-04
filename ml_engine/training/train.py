import argparse
import os
import random
import torch
import torch.nn as nn
import torch.optim as optim

from ml_engine.models.nca import NCAModel
from ml_engine.training.sample_pool import SamplePool
from ml_engine.training.targets import generate_procedural_target, load_target_image
from ml_engine.export.export_onnx import export_nca_to_onnx, verify_onnx_model


class NCATrainer:
    """Trainer for 16-channel Neural Cellular Automata models using BPTT and Sample Pool persistence."""

    def __init__(
        self,
        model: NCAModel,
        target_tensor: torch.Tensor,
        pool: SamplePool,
        lr: float = 1e-3,
        device: str = "cpu"
    ):
        self.device = torch.device(device if torch.cuda.is_available() and device != "cpu" else "cpu")
        self.model = model.to(self.device)
        self.target = target_tensor.to(self.device)
        self.pool = pool
        self.lr = lr

        self.optimizer = optim.Adam(self.model.parameters(), lr=self.lr, weight_decay=1e-6)
        self.scheduler = optim.lr_scheduler.CosineAnnealingLR(self.optimizer, T_max=2000, eta_min=1e-4)

    def train_step(
        self,
        batch_size: int = 8,
        min_steps: int = 64,
        max_steps: int = 96
    ) -> float:
        self.model.train()
        self.optimizer.zero_grad()

        # Sample states from sample pool with damage injection for 50% of batch
        x, pool_indices = self.pool.sample(batch_size)
        x = x.to(self.device)

        # Apply damage to half of batch
        for i in range(batch_size // 2):
            cy = random.randint(8, self.pool.height - 8)
            cx = random.randint(8, self.pool.width - 8)
            y_grid, x_grid = torch.meshgrid(
                torch.arange(self.pool.height, device=self.device),
                torch.arange(self.pool.width, device=self.device),
                indexing="ij"
            )
            dist_sq = (y_grid - cy) ** 2 + (x_grid - cx) ** 2
            damage_mask = (dist_sq <= 4 ** 2).unsqueeze(0) # [1, H, W]
            x[i] = x[i] * (~damage_mask).float()

        # Sample random BPTT rollouts
        num_steps = random.randint(min_steps, max_steps)
        for _ in range(num_steps):
            x = self.model(x)

        # Loss: RGBA channel MSE vs target + L2 penalty on hidden states
        rgba_out = x[:, :4, :, :]
        hidden_out = x[:, 4:, :, :]

        target_expanded = self.target.expand(batch_size, -1, -1, -1)
        loss_rgba = nn.functional.mse_loss(rgba_out, target_expanded)
        loss_hidden = 0.001 * torch.mean(hidden_out ** 2)
        total_loss = loss_rgba + loss_hidden

        total_loss.backward()

        # Gradient norm clipping to prevent BPTT gradient explosion
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
        self.optimizer.step()
        self.scheduler.step()

        # Update sample pool with detached final states
        self.pool.commit(pool_indices, x.detach().cpu())

        return total_loss.item()

    def train(
        self,
        num_iterations: int = 500,
        batch_size: int = 8,
        min_steps: int = 64,
        max_steps: int = 96,
        log_interval: int = 50
    ) -> list[float]:
        losses = []
        for it in range(1, num_iterations + 1):
            loss = self.train_step(batch_size=batch_size, min_steps=min_steps, max_steps=max_steps)
            losses.append(loss)

            if it % log_interval == 0 or it == 1:
                lr = self.optimizer.param_groups[0]["lr"]
                print(f"[Iter {it}/{num_iterations}] Loss: {loss:.6f} | LR: {lr:.6f}")

        return losses


def run_training(
    iterations: int = 500,
    target_pattern: str = "circle",
    target_image: str = None,
    output_onnx_path: str = None
) -> str:
    print(f"--- Starting NeuraLife NCA Training ({iterations} iterations) ---")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training Device: {device}")

    # Load target
    if target_image and os.path.exists(target_image):
        target = load_target_image(target_image)
    else:
        target = generate_procedural_target(pattern_type=target_pattern)

    model = NCAModel()
    pool = SamplePool(pool_size=1024)
    trainer = NCATrainer(model=model, target_tensor=target, pool=pool, device=device)

    trainer.train(num_iterations=iterations)

    if output_onnx_path is None:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        output_onnx_path = os.path.join(base_dir, "ml_engine", "export", "nca_model.onnx")

    exported_path = export_nca_to_onnx(trainer.model.cpu(), output_onnx_path)
    print(f"Successfully exported ONNX model to: {exported_path.encode('ascii', 'backslashreplace').decode('ascii')}")

    # Also sync copy to frontend assets directory
    frontend_asset_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "assets", "nca_model.onnx")
    )
    os.makedirs(os.path.dirname(frontend_asset_path), exist_ok=True)
    import shutil
    shutil.copyfile(exported_path, frontend_asset_path)
    print(f"Synced ONNX model to frontend asset path: {frontend_asset_path}")

    valid, msg = verify_onnx_model(exported_path)
    print(f"ONNX Validation: {msg}")

    return exported_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NeuraLife NCA Training Pipeline")
    parser.add_argument("--iters", type=int, default=100, help="Number of training iterations")
    parser.add_argument("--pattern", type=str, default="circle", help="Target pattern type (circle, square, emblem)")
    parser.add_argument("--image", type=str, default=None, help="Path to target image file")
    args = parser.parse_args()

    run_training(iterations=args.iters, target_pattern=args.pattern, target_image=args.image)
