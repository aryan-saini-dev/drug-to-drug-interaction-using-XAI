"""
Download script for the pre-trained model checkpoint.
Runs during Render build step to fetch weights from Google Drive.
"""
import os
import sys
import hashlib
import urllib.request

CHECKPOINT_PATH = "./savepoints/0/model_checkpoint"
GDRIVE_ID = "13mc5u2DxLC5NmHdC4H0qCvJztei7PvkU"
GDRIVE_URL = f"https://drive.usercontent.google.com/download?id={GDRIVE_ID}&export=download&confirm=t"
EXPECTED_SHA256 = "f39e011ceeb81a0fef40d94f50fc7d343a456094b1e84b164f51499c04d55a61"
EXPECTED_SIZE = 183575616  # bytes


def sha256_of_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def checkpoint_is_valid(path: str) -> bool:
    if not os.path.exists(path):
        return False
    size = os.path.getsize(path)
    if size != EXPECTED_SIZE:
        print(f"  Size mismatch: expected {EXPECTED_SIZE}, got {size}. Re-downloading...")
        return False
    print("  Verifying SHA256 checksum...")
    digest = sha256_of_file(path)
    if digest != EXPECTED_SHA256:
        print(f"  Checksum mismatch: expected {EXPECTED_SHA256}, got {digest}. Re-downloading...")
        return False
    return True


def download_checkpoint():
    os.makedirs(os.path.dirname(CHECKPOINT_PATH), exist_ok=True)

    print(f"Checking model checkpoint at {CHECKPOINT_PATH} ...")
    if checkpoint_is_valid(CHECKPOINT_PATH):
        print("  Checkpoint is valid. Skipping download.")
        return

    print(f"Downloading model checkpoint from Google Drive (~183 MB)...")
    tmp_path = CHECKPOINT_PATH + ".tmp"
    req = urllib.request.Request(GDRIVE_URL, headers={"User-Agent": "Mozilla/5.0"})

    with urllib.request.urlopen(req) as response:
        total = int(response.headers.get("Content-Length", 0))
        downloaded = 0
        with open(tmp_path, "wb") as f:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    print(f"\r  Progress: {pct:.1f}% ({downloaded}/{total} bytes)", end="", flush=True)
        print()

    print("  Verifying downloaded file...")
    digest = sha256_of_file(tmp_path)
    if digest != EXPECTED_SHA256:
        os.remove(tmp_path)
        print(f"ERROR: Downloaded file checksum mismatch! Got {digest}")
        sys.exit(1)

    os.replace(tmp_path, CHECKPOINT_PATH)
    print(f"  Checkpoint saved and verified at {CHECKPOINT_PATH}")


if __name__ == "__main__":
    download_checkpoint()
