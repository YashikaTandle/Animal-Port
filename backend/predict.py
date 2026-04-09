import sys
import json
import os
from PIL import Image

import torch
import torch.nn as nn
from torchvision import transforms, models

if len(sys.argv) < 2:
    print(json.dumps({"error": "No image provided"}))
    sys.exit(1)

img_path = sys.argv[1]

if not os.path.exists(img_path):
    print(json.dumps({"error": "Image file not found"}))
    sys.exit(1)

MODEL_PATH = "skin_disease_model.pth"
CLASSES_PATH = "classes.json"

if not os.path.exists(MODEL_PATH) or not os.path.exists(CLASSES_PATH):
    print(json.dumps({"error": "Model or classes.json not found. Please run train_model.py first."}))
    sys.exit(1)

try:
    # Load class names
    with open(CLASSES_PATH, "r") as f:
        class_names = json.load(f)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

    # Load Model structure
    model = models.mobilenet_v2(weights=None)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.5, inplace=False),
        nn.Linear(num_ftrs, len(class_names))
    )
    
    # Load weights
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model = model.to(device)
    model.eval()

    # Preprocessing
    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    # Predict
    img = Image.open(img_path).convert('RGB')
    input_tensor = preprocess(img)
    input_batch = input_tensor.unsqueeze(0).to(device)

    # --- Verification Step: ImageNet Dog Check ---
    is_dog = False
    try:
        from torchvision.models import mobilenet_v2
        # Try loading with default weights or fallback to pretrained=True
        try:
            from torchvision.models import MobileNet_V2_Weights
            verifier = mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)
        except Exception:
            verifier = mobilenet_v2(pretrained=True)
            
        verifier = verifier.to(device)
        verifier.eval()
        with torch.no_grad():
            verify_out = verifier(input_batch)
        verify_prob = torch.nn.functional.softmax(verify_out[0], dim=0)
        
        # ImageNet dog classes range from 151 to 268 inclusive. Cats are 281 to 285 inclusive.
        dog_prob = torch.sum(verify_prob[151:269]).item()
        cat_prob = torch.sum(verify_prob[281:286]).item()
        top_prob, top_class = torch.max(verify_prob, 0)
        
        is_dog_top = (151 <= top_class.item() <= 268)
        is_cat_top = (281 <= top_class.item() <= 285)
        
        # Check if the top prediction is a dog, or if the sum of dog probabilities is prominent and dominating cat probabilities
        if is_dog_top or (dog_prob > 0.20 and dog_prob > cat_prob * 2):
            is_dog = True
            
        # Strongly reject if it's explicitly identified as a cat
        if is_cat_top or (cat_prob > dog_prob):
            is_dog = False
            
    except Exception:
        # If it fails to load the model (e.g. no internet), we fallback to trusting the primary model's confidence.
        is_dog = True
    # ---------------------------------------------
    # Rejection Filters
    if not is_dog:
        print(json.dumps({
             "error": "Image rejected: The AI could not recognize a dog in the image. Please upload a clear photo of a dog or affected dog skin."
        }))
        sys.exit(0)

    # Now that we know it's a dog, run the primary model
    with torch.no_grad():
        output = model(input_batch)
    
    probabilities = torch.nn.functional.softmax(output[0], dim=0)
    confidence, predicted_idx = torch.max(probabilities, 0)
    
    class_name = class_names[predicted_idx.item()]
        
    if confidence.item() < 0.40:
        print(json.dumps({
            "error": f"Image rejected: Confidence too low ({round(confidence.item()*100, 1)}%). The AI is unsure if this displays a recognizable disease pattern."
        }))
        sys.exit(0)
    
    print(json.dumps({
        "disease": class_name,
        "confidence": round(confidence.item(), 4)
    }))

except Exception as e:
    print(json.dumps({"error": str(e)}))
