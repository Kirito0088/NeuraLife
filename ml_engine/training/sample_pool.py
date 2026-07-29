import torch


class SamplePool:
    """Sample Pool manager (size 1024) for Backpropagation Through Time (BPTT) long-term persistence training.
    
    Prevents catastrophic forgetting, supports self-healing morphogenesis training via damage injection,
    and replaces degraded samples with fresh seed cells.
    """

    def __init__(self, pool_size: int = 1024, channels: int = 16, height: int = 64, width: int = 64):
        self.pool_size = pool_size
        self.channels = channels
        self.height = height
        self.width = width

        # Initialize pool tensor [pool_size, channels, H, W]
        self.pool = torch.zeros(pool_size, channels, height, width, dtype=torch.float32)

        # Seed cell setup in the center cell
        center_h, center_w = height // 2, width // 2
        # Alpha channel (channel 3) = 1.0
        self.pool[:, 3, center_h, center_w] = 1.0
        # Hidden state channels (4..15) = 1.0
        self.pool[:, 4:, center_h, center_w] = 1.0

    def make_seed(self, batch_size: int = 1) -> torch.Tensor:
        """Generates a fresh batch of seed state tensors."""
        seed = torch.zeros(batch_size, self.channels, self.height, self.width, dtype=torch.float32)
        center_h, center_w = self.height // 2, self.width // 2
        seed[:, 3, center_h, center_w] = 1.0
        seed[:, 4:, center_h, center_w] = 1.0
        return seed

    def sample(self, batch_size: int = 8) -> tuple[torch.Tensor, torch.Tensor]:
        """Samples a batch from the pool, replacing 1 sample with a fresh seed cell."""
        indices = torch.randperm(self.pool_size)[:batch_size]
        states = self.pool[indices].clone()

        # Always re-seed slot 0 of the batch to maintain continuous growth learning
        states[0] = self.make_seed(1)[0]
        return states, indices

    def commit(self, indices: torch.Tensor, states: torch.Tensor):
        """Commits updated states back into the pool at specified indices."""
        self.pool[indices] = states.detach().clone()

    def sample_with_damage(self, batch_size: int = 8, damage_radius: int = 4) -> torch.Tensor:
        """Samples a batch and applies circular damage to a subset of states for self-healing training."""
        states, _ = self.sample(batch_size)

        # Apply damage to half of the batch
        for i in range(batch_size // 2):
            cy = torch.randint(8, self.height - 8, (1,)).item()
            cx = torch.randint(8, self.width - 8, (1,)).item()

            y_grid, x_grid = torch.meshgrid(
                torch.arange(self.height), torch.arange(self.width), indexing="ij"
            )
            dist_sq = (y_grid - cy) ** 2 + (x_grid - cx) ** 2
            damage_mask = (dist_sq <= damage_radius ** 2).unsqueeze(0) # [1, H, W]

            # Zero out all state channels within damage radius
            states[i] = states[i] * (~damage_mask).float()

        return states
