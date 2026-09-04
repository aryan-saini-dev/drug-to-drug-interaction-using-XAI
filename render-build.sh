#!/usr/bin/env bash
# Render build script — runs before the server starts.
# Installs torch CPU-only FIRST (separate index URL), then other deps.
set -e

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing PyTorch (CPU-only)..."
# Use --index-url so pip ONLY looks at the CPU wheel index for torch.
# This prevents accidentally pulling the ~2GB CUDA wheel from PyPI.
pip install torch --index-url https://download.pytorch.org/whl/cpu

echo "==> Installing remaining Python dependencies..."
pip install -r requirements.txt

echo "==> Downloading pre-trained model checkpoint (~183 MB)..."
python download_checkpoint.py

echo "==> Build complete."
