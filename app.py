import os
import time
import base64
from io import BytesIO

import numpy as np
from PIL import Image

from flask import Flask, render_template, request, jsonify
import tensorflow as tf
from tensorflow import keras


# ============================================================
# FLASK CONFIGURATION
# ============================================================

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

CLASSIFIER_MODEL_PATH = os.path.join(
    BASE_DIR,
    "autoencoder_classifier.keras"
)

AUTOENCODER_MODEL_PATH = os.path.join(
    BASE_DIR,
    "deep_autoencoder.keras"
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ============================================================
# PROJECT CONFIGURATION
# ============================================================

IMG_SIZE = (128, 128)

CLASS_LABELS = [
    "buildings",
    "forest",
    "glacier",
    "mountain",
    "sea",
    "street"
]

CLASS_EMOJIS = {
    "buildings": "🏢",
    "forest": "🌲",
    "glacier": "🏔️",
    "mountain": "⛰️",
    "sea": "🌊",
    "street": "🛣️"
}

CLASS_COLORS = {
    "buildings": "#6366f1",
    "forest": "#22c55e",
    "glacier": "#06b6d4",
    "mountain": "#f59e0b",
    "sea": "#3b82f6",
    "street": "#ec4899"
}


# ============================================================
# GLOBAL MODELS
# ============================================================

classifier_model = None
autoencoder_model = None


# ============================================================
# MODEL LOADING
# ============================================================

def load_model_safely(path, label):

    if not os.path.exists(path):

        print()
        print("=" * 70)
        print(f"[WARNING] {label} model NOT FOUND")
        print(f"Expected path:")
        print(path)
        print("=" * 70)

        return None

    try:

        print()
        print(f"[INFO] Loading {label}...")
        print(path)

        model = keras.models.load_model(
            path,
            compile=False
        )

        print(f"[SUCCESS] {label} loaded successfully")

        return model

    except Exception as e:

        print()
        print("=" * 70)
        print(f"[ERROR] Could not load {label}")
        print(f"Path: {path}")
        print(f"Error: {e}")
        print("=" * 70)

        return None


def load_all_models():

    global classifier_model
    global autoencoder_model

    print()
    print("=" * 70)
    print("LOADING DEEP LEARNING MODELS")
    print("=" * 70)

    classifier_model = load_model_safely(
        CLASSIFIER_MODEL_PATH,
        "Classifier"
    )

    autoencoder_model = load_model_safely(
        AUTOENCODER_MODEL_PATH,
        "Autoencoder"
    )

    print()
    print("=" * 70)
    print("MODEL STATUS")
    print("=" * 70)

    print(
        "Classifier :",
        classifier_model is not None
    )

    print(
        "Autoencoder:",
        autoencoder_model is not None
    )

    print(
        "Image Size :",
        IMG_SIZE
    )

    print(
        "Classes    :",
        CLASS_LABELS
    )

    print("=" * 70)
    print()


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

def preprocess_image(pil_img):

    img = pil_img.convert("RGB")

    img = img.resize(
        IMG_SIZE,
        Image.Resampling.LANCZOS
    )

    img_array = np.array(
        img,
        dtype=np.float32
    )

    img_array = img_array / 255.0

    img_array = np.expand_dims(
        img_array,
        axis=0
    )

    return img_array


# ============================================================
# IMAGE → BASE64
# ============================================================

def image_to_base64(pil_img):

    buffer = BytesIO()

    pil_img.save(
        buffer,
        format="JPEG",
        quality=90
    )

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")

    return "data:image/jpeg;base64," + encoded


# ============================================================
# AUTOENCODER RECONSTRUCTION
# ============================================================

def reconstruct_image(img_array, original_pil):

    if autoencoder_model is None:
        return None

    try:

        decoded = autoencoder_model.predict(
            img_array,
            verbose=0
        )

        reconstructed = decoded[0]

        reconstructed = np.clip(
            reconstructed,
            0,
            1
        )

        reconstructed = (
            reconstructed * 255
        ).astype(np.uint8)

        reconstructed_pil = Image.fromarray(
            reconstructed
        )

        reconstructed_pil = reconstructed_pil.resize(
            original_pil.size,
            Image.Resampling.LANCZOS
        )

        return image_to_base64(
            reconstructed_pil
        )

    except Exception as e:

        print(
            "[WARNING] Reconstruction failed:",
            e
        )

        return None


# ============================================================
# CLASSIFIER PREDICTION
# ============================================================

def predict_image(img_array):

    if classifier_model is None:

        raise RuntimeError(
            "Classifier model is not loaded. "
            "Please check autoencoder_classifier.keras."
        )

    predictions = classifier_model.predict(
        img_array,
        verbose=0
    )

    predictions = np.asarray(
        predictions
    )

    if predictions.ndim != 2:
        predictions = np.reshape(
            predictions,
            (1, -1)
        )

    scores = predictions[0]

    # --------------------------------------------------------
    # Handle models that output logits instead of probabilities
    # --------------------------------------------------------

    if (
        np.any(scores < 0)
        or
        not np.isclose(
            np.sum(scores),
            1.0,
            atol=1e-3
        )
    ):

        scores = tf.nn.softmax(
            scores
        ).numpy()

    else:

        scores = np.clip(
            scores,
            0,
            1
        )

        total = np.sum(scores)

        if total > 0:
            scores = scores / total

    # --------------------------------------------------------
    # Make sure there are exactly 6 outputs
    # --------------------------------------------------------

    if len(scores) != len(CLASS_LABELS):

        raise RuntimeError(
            f"Model returned {len(scores)} outputs, "
            f"but {len(CLASS_LABELS)} classes are expected."
        )

    predicted_index = int(
        np.argmax(scores)
    )

    predicted_class = CLASS_LABELS[
        predicted_index
    ]

    confidence = float(
        scores[predicted_index] * 100
    )

    probabilities = {}

    for label, score in zip(
        CLASS_LABELS,
        scores
    ):

        probabilities[label] = round(
            float(score * 100),
            2
        )

    return (
        predicted_class,
        confidence,
        probabilities
    )


# ============================================================
# HOME PAGE
# ============================================================

@app.route("/")
def home():

    return render_template(
        "index.html",
        model_loaded=classifier_model is not None,
        ae_loaded=autoencoder_model is not None,
        image_size=IMG_SIZE,
        class_labels=CLASS_LABELS
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health")
def health():

    return jsonify({
        "status": "ok",
        "classifier_loaded": classifier_model is not None,
        "autoencoder_loaded": autoencoder_model is not None,
        "image_size": list(IMG_SIZE),
        "classes": CLASS_LABELS
    })


# ============================================================
# MODEL INFORMATION
# ============================================================

@app.route("/model-info")
def model_info():

    result = {

        "classifier_loaded":
            classifier_model is not None,

        "autoencoder_loaded":
            autoencoder_model is not None,

        "image_size":
            list(IMG_SIZE),

        "classes":
            CLASS_LABELS
    }

    # --------------------------------------------------------
    # CLASSIFIER INFORMATION
    # --------------------------------------------------------

    if classifier_model is not None:

        layers_info = []

        for layer in classifier_model.layers:

            try:

                output_shape = str(
                    layer.output_shape
                )

            except Exception:

                try:

                    output_shape = str(
                        layer.compute_output_shape(
                            layer.input_shape
                        )
                    )

                except Exception:

                    output_shape = "—"

            layers_info.append({

                "name":
                    layer.name,

                "type":
                    layer.__class__.__name__,

                "output_shape":
                    output_shape
            })

        result["classifier"] = {

            "total_params":
                int(
                    classifier_model.count_params()
                ),

            "num_layers":
                len(
                    classifier_model.layers
                ),

            "input_shape":
                str(
                    classifier_model.input_shape
                ),

            "output_shape":
                str(
                    classifier_model.output_shape
                ),

            "layers":
                layers_info
        }

    # --------------------------------------------------------
    # AUTOENCODER INFORMATION
    # --------------------------------------------------------

    if autoencoder_model is not None:

        result["autoencoder"] = {

            "total_params":
                int(
                    autoencoder_model.count_params()
                ),

            "num_layers":
                len(
                    autoencoder_model.layers
                ),

            "input_shape":
                str(
                    autoencoder_model.input_shape
                ),

            "output_shape":
                str(
                    autoencoder_model.output_shape
                )
        }

    return jsonify(result)


# ============================================================
# PREDICTION API
# ============================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    start_time = time.time()

    # --------------------------------------------------------
    # CHECK CLASSIFIER
    # --------------------------------------------------------

    if classifier_model is None:

        return jsonify({

            "success": False,

            "error":
                "Classifier model is not loaded. "
                "Please check autoencoder_classifier.keras "
                "and restart Flask."
        }), 503

    # --------------------------------------------------------
    # CHECK FILE
    # --------------------------------------------------------

    if "image" not in request.files:

        return jsonify({

            "success": False,

            "error":
                "No image file was uploaded."
        }), 400

    file = request.files["image"]

    if file.filename == "":

        return jsonify({

            "success": False,

            "error":
                "Please select an image."
        }), 400

    # --------------------------------------------------------
    # PROCESS IMAGE
    # --------------------------------------------------------

    try:

        original_image = Image.open(
            file.stream
        ).convert("RGB")

        # Keep original image for display
        original_base64 = image_to_base64(
            original_image
        )

        # Prepare model input
        img_array = preprocess_image(
            original_image
        )

        # ----------------------------------------------------
        # CLASSIFICATION
        # ----------------------------------------------------

        (
            predicted_class,
            confidence,
            probabilities
        ) = predict_image(
            img_array
        )

        # ----------------------------------------------------
        # AUTOENCODER RECONSTRUCTION
        # ----------------------------------------------------

        reconstructed_base64 = (
            reconstruct_image(
                img_array,
                original_image
            )
        )

        # ----------------------------------------------------
        # INFERENCE TIME
        # ----------------------------------------------------

        inference_time = (
            time.time() - start_time
        ) * 1000

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success": True,

            "predicted_class":
                predicted_class,

            "emoji":
                CLASS_EMOJIS.get(
                    predicted_class,
                    "🖼️"
                ),

            "confidence":
                round(
                    confidence,
                    2
                ),

            "probabilities":
                probabilities,

            "class_colors":
                CLASS_COLORS,

            "original_image":
                original_base64,

            "reconstructed_image":
                reconstructed_base64,

            "inference_time_ms":
                round(
                    inference_time,
                    2
                ),

            "model_loaded":
                True,

            "ae_loaded":
                autoencoder_model is not None,

            "timestamp":
                time.strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
        })

    except Exception as e:

        print(
            "[ERROR] Prediction failed:",
            e
        )

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 500


# ============================================================
# APPLICATION START
# ============================================================

if __name__ == "__main__":

    load_all_models()

    print()
    print("Starting Flask server...")
    print("Open: http://127.0.0.1:5000")
    print()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )