#!/usr/bin/env bash
# Render build script — runs before the server starts.
set -e

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing Python dependencies (CPU-only PyTorch)..."
pip install -r requirements.txt

echo "==> Downloading pre-trained model checkpoint..."
python download_checkpoint.py

echo "==> Build complete."
