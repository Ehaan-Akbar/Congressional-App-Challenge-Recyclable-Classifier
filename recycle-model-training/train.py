import argparse
import hashlib
import json
import random
import shutil
import subprocess
import zipfile

from pathlib import Path
from collections import Counter

import numpy as np
from PIL import Image
from sklearn.model_selection import train_test_split

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import transforms, models


ROOT = Path(__file__).resolve().parent

RAW = ROOT / "data_raw"
DATA = ROOT / "merged"
OUT = ROOT / "output"

CLASSES = [
    "cardboard",
    "glass",
    "metal",
    "paper",
    "plastic",
    "food_organics",
    "miscellaneous_trash",
    "textile_trash",
    "vegetation",
]

RECYCLABLE = {
    "cardboard",
    "glass",
    "metal",
    "paper",
    "plastic",
}


def download(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)

    if dest.exists() and dest.stat().st_size > 1000000:
        return

    import urllib.request

    print("Downloading", url, flush=True)

    urllib.request.urlretrieve(url, dest)


def prepare():
    RAW.mkdir(exist_ok=True)
    DATA.mkdir(exist_ok=True)

    rw = RAW / "realwaste.zip"

    download(
        "https://archive.ics.uci.edu/static/public/908/realwaste.zip",
        rw,
    )

    rwdir = RAW / "realwaste"

    if not rwdir.exists():
        with zipfile.ZipFile(rw) as z:
            z.extractall(rwdir)

    td = RAW / "trashnet"

    if not td.exists():
        subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "https://github.com/Ebuka24Stephen/trashnet-dataset.git",
                str(td),
            ],
            check=True,
        )

    for c in CLASSES:
        (DATA / c).mkdir(parents=True, exist_ok=True)

    real_root = next(
        (p for p in rwdir.rglob("RealWaste") if p.is_dir()),
        None,
    )

    if real_root is None:
        raise RuntimeError("RealWaste folder not found")

    real_map = {
        "Cardboard": "cardboard",
        "Food Organics": "food_organics",
        "Glass": "glass",
        "Metal": "metal",
        "Miscellaneous Trash": "miscellaneous_trash",
        "Paper": "paper",
        "Plastic": "plastic",
        "Textile Trash": "textile_trash",
        "Vegetation": "vegetation",
    }

    seen = set()

    def add(src, cls):
        try:
            h = hashlib.sha256(src.read_bytes()).hexdigest()

            if h in seen:
                return

            seen.add(h)

            dst = DATA / cls / (
                h + (src.suffix.lower() or ".jpg")
            )

            if not dst.exists():
                shutil.copy2(src, dst)

        except Exception:
            pass

    for src in real_root.rglob("*"):
        if (
            src.is_file()
            and src.suffix.lower() in {
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
            }
            and src.parent.name in real_map
        ):
            add(src, real_map[src.parent.name])

    trash_map = {
        "cardboard": "cardboard",
        "glass": "glass",
        "metal": "metal",
        "paper": "paper",
        "plastic": "plastic",
        "trash": "miscellaneous_trash",
    }

    for src in td.rglob("*"):
        if (
            src.is_file()
            and src.suffix.lower() in {
                ".jpg",
                ".jpeg",
                ".png",
            }
            and src.parent.name.lower() in trash_map
        ):
            add(src, trash_map[src.parent.name.lower()])

    counts = {
        c: len(list((DATA / c).glob("*")))
        for c in CLASSES
    }

    print("Merged counts:", counts, flush=True)

    return counts


def split_data(seed=42):
    split = ROOT / "splits"
    split.mkdir(exist_ok=True)

    rows = []

    for i, c in enumerate(CLASSES):
        for p in (DATA / c).iterdir():
            if p.is_file():
                rows.append((str(p), i))

    paths = [x[0] for x in rows]
    labels = [x[1] for x in rows]

    tr, tp, try_, tpy = train_test_split(
        paths,
        labels,
        test_size=0.2,
        stratify=labels,
        random_state=seed,
    )

    va, te, vay, tey = train_test_split(
        tp,
        tpy,
        test_size=0.5,
        stratify=tpy,
        random_state=seed,
    )

    for n, ps, ys in [
        ("train", tr, try_),
        ("val", va, vay),
        ("test", te, tey),
    ]:
        with open(split / f"{n}.txt", "w") as f:
            for p, y in zip(ps, ys):
                f.write(f"{p}\t{y}\n")

    return split


class SplitDataset(torch.utils.data.Dataset):

    def __init__(self, file, transform):
        self.items = [
            x.rstrip("\n").split("\t")
            for x in open(file)
        ]

        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        p, y = self.items[i]

        return (
            self.transform(
                Image.open(p).convert("RGB")
            ),
            int(y),
        )


def main():
    ap = argparse.ArgumentParser()

    ap.add_argument(
        "--epochs",
        type=int,
        default=5,
    )

    ap.add_argument(
        "--batch-size",
        type=int,
        default=64,
    )

    a = ap.parse_args()

    torch.manual_seed(42)
    random.seed(42)
    np.random.seed(42)

    prepare()
    split = split_data()

    trf = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.RandomResizedCrop(
                224,
                scale=(0.75, 1),
            ),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(
                0.2,
                0.2,
                0.2,
                0.1,
            ),
            transforms.ToTensor(),
            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225],
            ),
        ]
    )

    evf = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225],
            ),
        ]
    )

    dtr = SplitDataset(
        split / "train.txt",
        trf,
    )

    dva = SplitDataset(
        split / "val.txt",
        evf,
    )

    dte = SplitDataset(
        split / "test.txt",
        evf,
    )

    tr = DataLoader(
        dtr,
        batch_size=a.batch_size,
        shuffle=True,
        num_workers=2,
    )

    va = DataLoader(
        dva,
        batch_size=a.batch_size,
        num_workers=2,
    )

    te = DataLoader(
        dte,
        batch_size=a.batch_size,
        num_workers=2,
    )

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    model = models.resnet18(
        weights=models.ResNet18_Weights.DEFAULT
    )

    model.fc = nn.Linear(
        model.fc.in_features,
        len(CLASSES),
    )

    model.to(device)

    counts = Counter(
        int(x[1])
        for x in dtr.items
    )

    weights = torch.tensor(
        [
            len(dtr) / (len(CLASSES) * counts[i])
            for i in range(len(CLASSES))
        ],
        dtype=torch.float32,
        device=device,
    )

    lossfn = nn.CrossEntropyLoss(
        weight=weights
    )

    opt = torch.optim.AdamW(
        model.parameters(),
        lr=2e-4,
        weight_decay=1e-4,
    )

    sched = torch.optim.lr_scheduler.CosineAnnealingLR(
        opt,
        T_max=a.epochs,
    )

    best = -1
    best_state = None

    for ep in range(a.epochs):
        model.train()

        total = 0
        correct = 0

        for x, y in tr:
            x, y = x.to(device), y.to(device)

            opt.zero_grad()

            z = model(x)
            loss = lossfn(z, y)

            loss.backward()
            opt.step()

            total += len(y)
            correct += (
                z.argmax(1) == y
            ).sum().item()

        model.eval()

        vt = 0
        vc = 0

        with torch.no_grad():
            for x, y in va:
                y = y.to(device)

                z = model(x.to(device))

                vt += len(y)
                vc += (
                    z.argmax(1) == y
                ).sum().item()

        acc = vc / vt

        print(
            f"epoch {ep + 1}/{a.epochs} "
            f"train_acc={correct / total:.4f} "
            f"val_acc={acc:.4f}",
            flush=True,
        )

        if acc > best:
            best = acc

            best_state = {
                k: v.detach().cpu().clone()
                for k, v in model.state_dict().items()
            }

        sched.step()

    model.load_state_dict(best_state)
    model.eval()

    pred = []
    ys = []

    with torch.no_grad():
        for x, y in te:
            pred += (
                model(x.to(device))
                .argmax(1)
                .cpu()
                .tolist()
            )

            ys += y.tolist()

    from sklearn.metrics import (
        accuracy_score,
        f1_score,
        confusion_matrix,
        classification_report,
    )

    acc = accuracy_score(ys, pred)

    f1 = f1_score(
        ys,
        pred,
        average="macro",
    )

    report = classification_report(
        ys,
        pred,
        target_names=CLASSES,
        output_dict=True,
        zero_division=0,
    )

    OUT.mkdir(exist_ok=True)

    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "classes": CLASSES,
            "recyclable_classes": sorted(RECYCLABLE),
            "architecture": "resnet18",
        },
        OUT / "waste_recycling_resnet18.pt",
    )

    json.dump(
        {
            "test_accuracy": acc,
            "test_macro_f1": f1,
            "best_validation_accuracy": best,
            "test_size": len(ys),
            "classification_report": report,
            "confusion_matrix": confusion_matrix(
                ys,
                pred,
            ).tolist(),
            "device": str(device),
        },
        open(OUT / "metrics.json", "w"),
        indent=2,
    )

    json.dump(
        {
            "classes": CLASSES,
            "recyclable_classes": sorted(RECYCLABLE),
        },
        open(OUT / "class_map.json", "w"),
        indent=2,
    )

    print(
        json.dumps(
            {
                "test_accuracy": acc,
                "test_macro_f1": f1,
                "best_validation_accuracy": best,
            },
            indent=2,
        )
    )

if __name__ == "__main__":
    main()
