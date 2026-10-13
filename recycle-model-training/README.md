# Waste recycling model training

This workflow trains a 9-class waste-material classifier from TrashNet + RealWaste and derives recyclable/non-recyclable from the material class.

Datasets: TrashNet resized mirror (2,527 images) and RealWaste (4,752 images).

The workflow downloads the datasets itself, merges them, removes exact duplicates by SHA-256, creates stratified train/validation/test splits, fine-tunes ImageNet-pretrained ResNet-18, evaluates it, and uploads the model and metrics as a GitHub Actions artifact.

Final artifact: waste_recycling_resnet18.pt, metrics.json, class_map.json, README.txt.

Material classes: cardboard, glass, metal, paper, plastic, food_organics, miscellaneous_trash, textile_trash, vegetation.

Binary mapping: recyclable = cardboard, glass, metal, paper, plastic. non-recyclable = food_organics, miscellaneous_trash, textile_trash, vegetation.

Real-world recyclability varies by local rules and contamination.
