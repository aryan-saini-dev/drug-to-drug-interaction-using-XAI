import os
import sys
import json
import argparse
import torch
import numpy as np
import pandas as pd

# Add src directory to system path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
from model import build_model
from utils import convert_tensor, evaluate_model


def load_pretrained_model(checkpoint_path='./savepoints/0/model_checkpoint', hparam_path='./data/hyperparameter.json'):
    """Loads hyperparameter config and pre-trained PyTorch model weights."""
    if not os.path.exists(hparam_path):
        raise FileNotFoundError(f"Hyperparameter file not found at: {hparam_path}")
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Model checkpoint not found at: {checkpoint_path}")

    with open(hparam_path, 'r') as f:
        hparams = json.load(f)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading pre-trained model on device: {device}")

    model = build_model(hparams)
    model.load_model(checkpoint_path)
    model.eval()
    
    return model, device, hparams


def evaluate_checkpoint(checkpoint_path, test_data_path='./savepoints/0/test_data.pkl', batch_size=4096):
    """Evaluates pre-trained checkpoint on test dataset partition using mini-batches."""
    print("=" * 60)
    print(" EVALUATING PRE-TRAINED DDI MODEL")
    print("=" * 60)

    model, device, hparams = load_pretrained_model(checkpoint_path)

    print(f"Loading test dataset from {test_data_path}...")
    x_test, y_test = pd.read_pickle(test_data_path)

    print("Loading bio-similarity matrices & label mappings...")
    SS_mat = pd.read_pickle('./data/structural_similarity_matrix.pkl')
    TS_mat = pd.read_pickle('./data/target_similarity_matrix.pkl')
    GS_mat = pd.read_pickle('./data/GO_similarity_matrix.pkl')
    mlb = pd.read_pickle('./data/mlb.pkl')
    idx2label = pd.read_pickle('./data/idx2label.pkl')

    num_samples = len(x_test)
    all_preds = []
    all_trues = []

    print(f"Running model forward pass across {num_samples:,} samples in mini-batches (batch_size={batch_size})...")
    threshold = hparams.get('threshold', 0.5)

    with torch.no_grad():
        for start_idx in range(0, num_samples, batch_size):
            end_idx = min(start_idx + batch_size, num_samples)
            x_batch = x_test[start_idx:end_idx]
            y_batch = y_test[start_idx:end_idx]

            SS, TS, GS, y_true = convert_tensor(x_batch, y_batch, SS_mat, TS_mat, GS_mat, mlb, idx2label)
            SS, TS, GS = SS.to(device), TS.to(device), GS.to(device)

            _, _, _, pred_logits = model(SS, TS, GS)
            pred_probs = torch.sigmoid(pred_logits)
            pred_bin = (pred_probs > threshold).int().cpu().numpy()

            all_preds.append(pred_bin)
            all_trues.append(y_true.int().numpy())

    y_true_np = np.vstack(all_trues)
    pred_bin_np = np.vstack(all_preds)

    acc, ma_rc, ma_pc, mi_rc, mi_pc = evaluate_model(y_true_np, pred_bin_np)

    print("\n" + "=" * 40)
    print(" TEST EVALUATION RESULTS")
    print("=" * 40)
    print(f"  Accuracy:        {acc * 100:.2f}% ({acc:.4f})")
    print(f"  Macro Precision: {ma_pc * 100:.2f}% ({ma_pc:.4f})")
    print(f"  Macro Recall:    {ma_rc * 100:.2f}% ({ma_rc:.4f})")
    print(f"  Micro Precision: {mi_pc * 100:.2f}% ({mi_pc:.4f})")
    print(f"  Micro Recall:    {mi_rc * 100:.2f}% ({mi_rc:.4f})")
    print("=" * 40)


def predict_sample_pairs(checkpoint_path, num_samples=5, test_data_path='./savepoints/0/test_data.pkl'):
    """Runs inference on a few sample test pairs and outputs predicted interaction labels."""
    print("=" * 60)
    print(f" PREDICTING DDI EFFECTS FOR SAMPLE DRUG PAIRS ({num_samples} pairs)")
    print("=" * 60)

    model, device, hparams = load_pretrained_model(checkpoint_path)

    x_test, y_test = pd.read_pickle(test_data_path)
    SS_mat = pd.read_pickle('./data/structural_similarity_matrix.pkl')
    TS_mat = pd.read_pickle('./data/target_similarity_matrix.pkl')
    GS_mat = pd.read_pickle('./data/GO_similarity_matrix.pkl')
    mlb = pd.read_pickle('./data/mlb.pkl')
    idx2label = pd.read_pickle('./data/idx2label.pkl')
    drug_name2idx = pd.read_pickle('./data/drugName2idx.pkl')
    idx2drug_name = {v: k for k, v in drug_name2idx.items()}

    # Limit to top N sample pairs
    x_sample = x_test[:num_samples]
    y_sample = y_test[:num_samples]

    SS, TS, GS, y_true = convert_tensor(x_sample, y_sample, SS_mat, TS_mat, GS_mat, mlb, idx2label)

    with torch.no_grad():
        _, _, _, pred_logits = model(SS, TS, GS)
        pred_probs = torch.sigmoid(pred_logits).cpu().numpy()

    threshold = hparams.get('threshold', 0.5)

    for i in range(num_samples):
        drug1_idx, drug2_idx = x_sample[i]
        d1_name = idx2drug_name.get(drug1_idx, f"Drug_{drug1_idx}")
        d2_name = idx2drug_name.get(drug2_idx, f"Drug_{drug2_idx}")

        true_effects = idx2label[y_sample[i]]
        if not isinstance(true_effects, (list, np.ndarray)):
            true_effects = [true_effects]

        pred_idx = np.where(pred_probs[i] > threshold)[0]
        pred_effects = mlb.classes_[pred_idx] if len(pred_idx) > 0 else []

        print(f"\n--- Sample Pair #{i + 1} ---")
        print(f" Drugs: {d1_name} (ID: {drug1_idx}) <---> {d2_name} (ID: {drug2_idx})")
        print(f" True Interactions:      {list(true_effects)}")
        print(f" Predicted Interactions: {list(pred_effects)}")


def main():
    parser = argparse.ArgumentParser(description="Use Pre-Trained Model for DDI Inference & Evaluation")
    parser.add_argument('--checkpoint', type=str, default='./savepoints/0/model_checkpoint',
                        help='Path to pre-trained model checkpoint file.')
    parser.add_argument('--eval', action='store_true',
                        help='Evaluate model performance on test dataset.')
    parser.add_argument('--sample-predictions', action='store_true',
                        help='Print DDI predictions for sample drug pairs.')
    parser.add_argument('--num-samples', type=int, default=5,
                        help='Number of sample drug pairs to predict (default: 5).')

    args = parser.parse_args()

    # If no flags passed, run both eval and sample predictions by default
    if not args.eval and not args.sample_predictions:
        args.eval = True
        args.sample_predictions = True

    if args.eval:
        evaluate_checkpoint(args.checkpoint)

    if args.sample_predictions:
        predict_sample_pairs(args.checkpoint, num_samples=args.num_samples)


if __name__ == '__main__':
    main()
