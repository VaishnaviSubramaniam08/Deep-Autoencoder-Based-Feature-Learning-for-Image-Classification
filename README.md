# DeepVision — Deep Autoencoder Image Classifier

A premium web UI for **Deep Autoencoder-Based Feature Learning for Image Classification**.

## Project Structure

```
deep-autoencoder-ui/
├── app.py                        ← Flask backend + model inference
├── autoencoder_classifier.keras  ← YOUR trained model goes here
├── requirements.txt
├── templates/
│   └── index.html                ← Full UI template
├── static/
│   ├── style.css                 ← Dark glassmorphism design
│   └── script.js                 ← Interactive JS (drag&drop, charts, history)
└── uploads/                      ← Temp upload folder (auto-created)
```

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Add your model

Copy your trained model file into the project root:

```
autoencoder_classifier.keras   ← must match MODEL_PATH in app.py
```

### 3. Run the app

```bash
python app.py
```

Open your browser at: **http://localhost:5000**

---

## Features

| Feature | Description |
|---|---|
| 🖼️ Drag & Drop Upload | Drag or click to upload any PNG/JPG/WEBP scene image |
| ⚡ One-click Prediction | Calls your Keras model via Flask API |
| 📊 Probability Bars | Animated confidence bars for all 6 classes |
| 🔵 Confidence Meter | Radial gauge showing top-class confidence |
| 🔁 Autoencoder Reconstruction | Side-by-side original vs reconstructed image |
| 📜 Prediction History | Last 10 predictions stored per session |
| 🏗️ Model Info | Total parameters, layer count, architecture pipeline |
| 📱 Responsive | Works on desktop, tablet, and mobile |
| 🌑 Demo Mode | Works even without the .keras file (random demo output) |

## 6 Classes

| Emoji | Class |
|---|---|
| 🏢 | Buildings |
| 🌲 | Forest |
| 🧊 | Glacier |
| 🏔️ | Mountain |
| 🌊 | Sea |
| 🛣️ | Street |

## Configuration

Edit the top of `app.py` to match your model:

```python
MODEL_PATH = "autoencoder_classifier.keras"   # path to your .keras file
IMG_SIZE   = (64, 64)                          # match your model's input size
```

If your autoencoder has named sub-layers `"encoder"` and `"decoder"`, the UI will automatically show the **Original vs Reconstructed** image comparison.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Main web UI |
| `/predict` | POST | Classify an uploaded image |
| `/model-info` | GET | Model architecture info (JSON) |
| `/health` | GET | Health check |
