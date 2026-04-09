import json
import os
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms, models
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

# --- Initialization: Load Models Once into Memory ---
print("Initializing AI Models... This may take a moment.")

CLASSES_PATH = "classes.json"
MODEL_PATH = "skin_disease_model.pth"

with open(CLASSES_PATH, "r") as f:
    class_names = json.load(f)

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

# Load Primary Disease Model
model = models.mobilenet_v2(weights=None)
num_ftrs = model.classifier[1].in_features
model.classifier[1] = nn.Sequential(
    nn.Dropout(p=0.5, inplace=False),
    nn.Linear(num_ftrs, len(class_names))
)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model = model.to(device)
model.eval()

# Load Verifier Model
try:
    from torchvision.models import MobileNet_V2_Weights
    verifier = models.mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)
except Exception:
    verifier = models.mobilenet_v2(pretrained=True)
verifier = verifier.to(device)
verifier.eval()

preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

print("Models loaded successfully! Starting AI Worker Server on port 5001...")

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        req = json.loads(post_data.decode('utf-8'))
        img_path = req.get('image_path')
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        if not img_path or not os.path.exists(img_path):
            self.wfile.write(json.dumps({"error": "Image file not found"}).encode('utf-8'))
            return
            
        try:
            img = Image.open(img_path).convert('RGB')
            input_tensor = preprocess(img)
            input_batch = input_tensor.unsqueeze(0).to(device)
            
            # Verifier
            is_dog = False
            with torch.no_grad():
                verify_out = verifier(input_batch)
            verify_prob = torch.nn.functional.softmax(verify_out[0], dim=0)
            
            dog_prob = torch.sum(verify_prob[151:269]).item()
            cat_prob = torch.sum(verify_prob[281:286]).item()
            top_prob, top_class = torch.max(verify_prob, 0)
            
            is_dog_top = (151 <= top_class.item() <= 268)
            is_cat_top = (281 <= top_class.item() <= 285)
            
            if is_dog_top or (dog_prob > 0.20 and dog_prob > cat_prob * 2):
                is_dog = True
                
            if is_cat_top or (cat_prob > dog_prob):
                is_dog = False
                
            if not is_dog:
                self.wfile.write(json.dumps({
                    "error": "Image rejected: The AI could not recognize a dog in the image. Please upload a clear photo of a dog or affected dog skin."
                }).encode('utf-8'))
                return

            # Primary Model
            with torch.no_grad():
                output = model(input_batch)
            
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            confidence, predicted_idx = torch.max(probabilities, 0)
            
            class_name = class_names[predicted_idx.item()]
            
            if confidence.item() < 0.40:
                self.wfile.write(json.dumps({
                    "error": f"Image rejected: Confidence too low ({round(confidence.item()*100, 1)}%). The AI is unsure if this displays a recognizable disease pattern."
                }).encode('utf-8'))
                return
            
            self.wfile.write(json.dumps({
                "disease": class_name,
                "confidence": round(confidence.item(), 4)
            }).encode('utf-8'))
            
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    # Suppress HTTP logging for performance
    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 5001), RequestHandler)
    server.serve_forever()
