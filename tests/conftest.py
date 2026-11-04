"""Shared pytest fixtures for the Monte Carlo engine and the PyTorch surrogate."""

import pytest

from risk_engine.surrogate.generate_training_data import generate_dataset
from risk_engine.surrogate.train import TrainConfig, train_model


@pytest.fixture
def trained_artifacts(tmp_path):
    """Train a small surrogate on a tiny synthetic dataset."""
    csv_path = tmp_path / "data.csv"
    model_path = tmp_path / "surrogate_v1.pt"
    scaler_path = tmp_path / "scaler_v1.pkl"

    generate_dataset(n_samples=40, n_loans=5_000, output_path=csv_path, seed=11)
    train_model(
        TrainConfig(
            dataset_path=csv_path,
            model_path=model_path,
            scaler_path=scaler_path,
            epochs=30,
            batch_size=8,
            patience=10,
            seed=11,
        )
    )
    return model_path, scaler_path
