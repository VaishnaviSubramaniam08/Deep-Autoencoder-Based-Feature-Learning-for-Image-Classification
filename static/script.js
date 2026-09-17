// ============================================================
// GLOBAL STATE
// ============================================================

let selectedFile = null;
let historyItems = [];


// ============================================================
// DOM ELEMENTS
// ============================================================

const fileInput = document.getElementById("fileInput");
const uploadArea = document.getElementById("uploadArea");
const previewImage = document.getElementById("previewImage");
const previewContainer = document.getElementById("previewContainer");

const predictBtn = document.getElementById("predictBtn");

const resultSection = document.getElementById("resultSection");

const predictionClass = document.getElementById("predictionClass");
const predictionEmoji = document.getElementById("predictionEmoji");
const confidenceValue = document.getElementById("confidenceValue");

const inferenceTime = document.getElementById("inferenceTime");

const probabilityContainer =
    document.getElementById("probabilityContainer");

const originalImage =
    document.getElementById("originalImage");

const reconstructedImage =
    document.getElementById("reconstructedImage");

const historyContainer =
    document.getElementById("historyContainer");

const toastContainer =
    document.getElementById("toastContainer");

const modelStatus =
    document.getElementById("modelStatus");


// ============================================================
// FILE INPUT
// ============================================================

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function (event) {

            const file =
                event.target.files[0];

            if (file) {

                handleFile(file);
            }
        }
    );
}


// ============================================================
// DRAG AND DROP
// ============================================================

if (uploadArea) {

    uploadArea.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            uploadArea.classList.add(
                "drag-over"
            );
        }
    );

    uploadArea.addEventListener(
        "dragleave",
        function () {

            uploadArea.classList.remove(
                "drag-over"
            );
        }
    );

    uploadArea.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            uploadArea.classList.remove(
                "drag-over"
            );

            const file =
                event.dataTransfer.files[0];

            if (file) {

                handleFile(file);
            }
        }
    );
}


// ============================================================
// HANDLE FILE
// ============================================================

function handleFile(file) {

    if (!file.type.startsWith("image/")) {

        showToast(
            "Please upload an image file.",
            "error"
        );

        return;
    }

    selectedFile = file;

    const reader =
        new FileReader();

    reader.onload = function (event) {

        if (previewImage) {

            previewImage.src =
                event.target.result;
        }

        if (previewContainer) {

            previewContainer.style.display =
                "block";
        }
    };

    reader.readAsDataURL(file);

    if (predictBtn) {

        predictBtn.disabled = false;
    }

    showToast(
        "Image selected successfully.",
        "success"
    );
}


// ============================================================
// PREDICT BUTTON
// ============================================================

if (predictBtn) {

    predictBtn.addEventListener(
        "click",
        predictImage
    );
}


// ============================================================
// PREDICT IMAGE
// ============================================================

async function predictImage() {

    if (!selectedFile) {

        showToast(
            "Please select an image first.",
            "error"
        );

        return;
    }

    const formData =
        new FormData();

    formData.append(
        "image",
        selectedFile
    );

    predictBtn.disabled = true;

    const originalText =
        predictBtn.innerHTML;

    predictBtn.innerHTML =
        "Analyzing...";

    try {

        const response =
            await fetch(
                "/predict",
                {
                    method: "POST",
                    body: formData
                }
            );

        const data =
            await response.json();

        // ----------------------------------------------------
        // HANDLE BACKEND ERRORS
        // ----------------------------------------------------

        if (
            !response.ok ||
            data.success === false
        ) {

            showToast(
                data.error ||
                "Prediction failed.",
                "error"
            );

            return;
        }

        // ----------------------------------------------------
        // DISPLAY RESULT
        // ----------------------------------------------------

        renderResults(data);

        addToHistory(data);

        showToast(
            "Prediction completed successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Prediction error:",
            error
        );

        showToast(
            "Unable to connect to Flask server.",
            "error"
        );

    } finally {

        predictBtn.disabled = false;

        predictBtn.innerHTML =
            originalText;
    }
}


// ============================================================
// RENDER RESULTS
// ============================================================

function renderResults(data) {

    if (resultSection) {

        resultSection.style.display =
            "block";
    }

    // --------------------------------------------------------
    // CLASS
    // --------------------------------------------------------

    if (predictionClass) {

        predictionClass.textContent =
            capitalize(
                data.predicted_class
            );
    }

    // --------------------------------------------------------
    // EMOJI
    // --------------------------------------------------------

    if (predictionEmoji) {

        predictionEmoji.textContent =
            data.emoji || "🖼️";
    }

    // --------------------------------------------------------
    // CONFIDENCE
    // --------------------------------------------------------

    if (confidenceValue) {

        confidenceValue.textContent =
            `${data.confidence.toFixed(2)}%`;
    }

    // --------------------------------------------------------
    // INFERENCE TIME
    // --------------------------------------------------------

    if (inferenceTime) {

        inferenceTime.textContent =
            `${data.inference_time_ms.toFixed(2)} ms`;
    }

    // --------------------------------------------------------
    // ORIGINAL IMAGE
    // --------------------------------------------------------

    if (originalImage) {

        originalImage.src =
            data.original_image;
    }

    // --------------------------------------------------------
    // RECONSTRUCTED IMAGE
    // --------------------------------------------------------

    if (
        reconstructedImage &&
        data.reconstructed_image
    ) {

        reconstructedImage.src =
            data.reconstructed_image;

        reconstructedImage.style.display =
            "block";
    }

    // --------------------------------------------------------
    // PROBABILITY BARS
    // --------------------------------------------------------

    renderProbabilities(
        data.probabilities,
        data.class_colors
    );

    // --------------------------------------------------------
    // SCROLL TO RESULT
    // --------------------------------------------------------

    if (resultSection) {

        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// ============================================================
// PROBABILITY BARS
// ============================================================

function renderProbabilities(
    probabilities,
    classColors
) {

    if (!probabilityContainer) {
        return;
    }

    probabilityContainer.innerHTML = "";

    const entries =
        Object.entries(
            probabilities
        );

    entries.sort(
        (a, b) => b[1] - a[1]
    );

    entries.forEach(
        ([label, value]) => {

            const color =
                classColors?.[label] ||
                "#6366f1";

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "probability-row";

            row.innerHTML = `

                <div class="probability-header">

                    <span>
                        ${capitalize(label)}
                    </span>

                    <span>
                        ${Number(value).toFixed(2)}%
                    </span>

                </div>

                <div class="probability-bar">

                    <div
                        class="probability-fill"
                        style="
                            width: ${value}%;
                            background: ${color};
                        "
                    ></div>

                </div>
            `;

            probabilityContainer.appendChild(
                row
            );
        }
    );
}


// ============================================================
// HISTORY
// ============================================================

function addToHistory(data) {

    const item = {

        class:
            data.predicted_class,

        confidence:
            data.confidence,

        emoji:
            data.emoji,

        time:
            new Date().toLocaleTimeString()
    };

    historyItems.unshift(
        item
    );

    if (historyItems.length > 10) {

        historyItems.pop();
    }

    renderHistory();
}


function renderHistory() {

    if (!historyContainer) {
        return;
    }

    historyContainer.innerHTML = "";

    if (historyItems.length === 0) {

        historyContainer.innerHTML = `
            <div class="empty-history">
                No predictions yet.
            </div>
        `;

        return;
    }

    historyItems.forEach(
        function (item) {

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "history-item";

            element.innerHTML = `

                <div class="history-icon">
                    ${item.emoji}
                </div>

                <div class="history-info">

                    <strong>
                        ${capitalize(item.class)}
                    </strong>

                    <span>
                        ${item.time}
                    </span>

                </div>

                <div class="history-confidence">
                    ${item.confidence.toFixed(1)}%
                </div>
            `;

            historyContainer.appendChild(
                element
            );
        }
    );
}


// ============================================================
// LOAD MODEL INFORMATION
// ============================================================

async function loadModelInfo() {

    try {

        const response =
            await fetch(
                "/model-info"
            );

        const data =
            await response.json();

        updateModelStatus(
            data
        );

        updateModelInformation(
            data
        );

    } catch (error) {

        console.error(
            "Model info error:",
            error
        );
    }
}


// ============================================================
// MODEL STATUS
// ============================================================

function updateModelStatus(data) {

    if (!modelStatus) {
        return;
    }

    if (data.classifier_loaded) {

        modelStatus.textContent =
            data.autoencoder_loaded
                ? "Classifier Ready · AE Ready"
                : "Classifier Ready";

        modelStatus.classList.add(
            "model-ready"
        );

    } else {

        modelStatus.textContent =
            "Classifier Not Loaded";

        modelStatus.classList.add(
            "model-error"
        );
    }
}


// ============================================================
// MODEL INFORMATION UI
// ============================================================

function updateModelInformation(data) {

    const inputElement =
        document.getElementById(
            "ic-input"
        );

    if (inputElement) {

        inputElement.textContent =
            `${data.image_size[0]}×${data.image_size[1]}`;
    }

    if (data.classifier) {

        const paramsElement =
            document.getElementById(
                "modelParams"
            );

        if (paramsElement) {

            paramsElement.textContent =
                formatNumber(
                    data.classifier.total_params
                );
        }

        const layersElement =
            document.getElementById(
                "modelLayers"
            );

        if (layersElement) {

            layersElement.textContent =
                data.classifier.num_layers;
        }
    }

    // --------------------------------------------------------
    // LAYER TABLE
    // --------------------------------------------------------

    const layerTable =
        document.getElementById(
            "layerTableBody"
        );

    if (
        layerTable &&
        data.classifier &&
        data.classifier.layers
    ) {

        layerTable.innerHTML = "";

        data.classifier.layers.forEach(
            function (layer) {

                const row =
                    document.createElement(
                        "tr"
                    );

                row.innerHTML = `

                    <td>
                        ${layer.name}
                    </td>

                    <td>
                        ${layer.type}
                    </td>

                    <td>
                        ${layer.output_shape}
                    </td>
                `;

                layerTable.appendChild(
                    row
                );
            }
        );
    }
}


// ============================================================
// TOAST
// ============================================================

function showToast(
    message,
    type = "info"
) {

    if (!toastContainer) {

        alert(message);

        return;
    }

    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast toast-${type}`;

    toast.textContent =
        message;

    toastContainer.appendChild(
        toast
    );

    setTimeout(
        function () {

            toast.remove();

        },
        4000
    );
}


// ============================================================
// HELPERS
// ============================================================

function capitalize(text) {

    if (!text) {
        return "";
    }

    return text.charAt(0).toUpperCase()
        + text.slice(1);
}


function formatNumber(number) {

    return Number(
        number
    ).toLocaleString();
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadModelInfo();

        renderHistory();
    }
);