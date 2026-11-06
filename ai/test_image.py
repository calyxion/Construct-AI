"""
test_image.py — Test any image or dataset against CONSTRUCTAI PPE Detection Engine.

Usage:
    python test_image.py --image path/to/image.jpg
"""

import argparse
import os
import sys
from pathlib import Path

import cv2
from detection import load_model, run_inference, draw_detections, analyse_ppe_compliance


def main():
    parser = argparse.ArgumentParser(description="Test PPE Detection on an Image")
    parser.add_argument("--image", type=str, required=True, help="Path to test image")
    parser.add_argument("--conf",  type=float, default=0.35, help="Confidence threshold")
    parser.add_argument("--save",  type=str, default="../screenshots/test_output.jpg", help="Path to save annotated image")
    args = parser.parse_args()

    img_path = Path(args.image)
    if not img_path.exists():
        print(f"[ERROR] Image not found: {img_path}")
        sys.exit(1)

    print(f"Loading image: {img_path} ...")
    img = cv2.imread(str(img_path))
    if img is None:
        print("[ERROR] Failed to decode image.")
        sys.exit(1)

    print(f"Image Resolution: {img.shape[1]}x{img.shape[0]}")
    
    # Run detector
    detector = load_model()
    detections = run_inference(detector, img, conf_threshold=args.conf)
    violations = analyse_ppe_compliance(detections)

    print("\n==========================================")
    print("       DETECTION TEST RESULTS            ")
    print("==========================================")
    print(f"Workers Detected    : {len([d for d in detections if d['label'] == 'person'])}")
    print(f"Helmets Detected    : {len([d for d in detections if d['label'] == 'helmet'])}")
    print(f"Vests Detected      : {len([d for d in detections if d['label'] == 'safety-vest'])}")
    print(f"Total Violations    : {len(violations)}")
    print("------------------------------------------")

    for idx, d in enumerate(detections, 1):
        print(f" [{idx}] {d['label'].upper():<12} | Confidence: {d['confidence']:.1%} | BBox: {d['bbox']}")

    if violations:
        print("\n[!] PPE VIOLATIONS DETECTED:")
        for v in violations:
            print(f"   • {v['violation']} (Worker BBox: {v['person_bbox']})")
    else:
        print("\n[✓] 100% PPE COMPLIANT (Safe Site Parameters)")

    # Save output
    save_path = Path(args.save)
    save_path.parent.mkdir(parents=True, exist_ok=True)
    annotated = draw_detections(img.copy(), detections)
    cv2.imwrite(str(save_path), annotated)
    print(f"\nAnnotated preview image saved to: {save_path.resolve()}")
    print("==========================================\n")


if __name__ == "__main__":
    main()
