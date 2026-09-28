// ============================================================
// ELEMENT REFERENCES  (IDs match index.html exactly)
// ============================================================

const fileInput         = document.getElementById("file-input");
const dropZone          = document.getElementById("drop-zone");
const dzIdle            = document.getElementById("dz-idle");
const dzPreview         = document.getElementById("dz-preview");
const previewImg        = document.getElementById("preview-img");
const changeBtn         = document.getElementById("change-btn");
const removeBtn         = document.getElementById("remove-btn");
const fileInfo          = document.getElementById("file-info");
const fileNameEl        = document.getElementById("file-name");
const fileSizeEl        = document.getElementById("file-size");
const predictBtn        = document.getElementById("predict-btn");
const predictBtnText    = document.querySelector(".predict-btn-text");
const predictBtnLoading = document.querySelector(".predict-btn-loading");

const resultsSection    = document.getElementById("results-section");
const historySection    = document.getElementById("history-section");

const rhEmoji           = document.getElementById("rh-emoji");
const rhClass           = document.getElementById("rh-class");
const rhConf            = document.getElementById("rh-conf");
const rhTime            = document.getElementById("rh-time");
const rhMode            = document.getElementById("rh-mode");
const resultTimestamp   = document.getElementById("result-timestamp");

const probBars          = document.getElementById("prob-bars");

const originalImg       = document.getElementById("original-img");
const reconImg          = document.getElementById("recon-img");
const reconNa           = document.getElementById("recon-na");

const radialFg          = document.getElementById("radial-fg");
const radialPct         = document.getElementById("radial-pct");
const radialClass       = document.getElementById("radial-class");

const historyList       = document.getElementById("history-list");
const clearHistoryBtn   = document.getElementById("clear-history-btn");

const icParams          = document.getElementById("ic-params");
const icLayers          = document.getElementById("ic-layers");
const icInput           = document.getElementById("ic-input");
const layerTableWrap    = document.getElementById("layer-table-wrap");
const layerTbody        = document.getElementById("layer-tbody");

let selectedFile  = null;
let historyItems  = [];


// ============================================================
// TOAST  (created dynamically — no static element needed)
// ============================================================

let toastContainer = document.getElementById("toast-container");

if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText =
        "position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;"
        + "display:flex;flex-direction:column;gap:.5rem;";
    document.body.appendChild(toastContainer);
}

function showToast(message, type) {
    type = type || "info";
    const colors = { success: "#22c55e", error: "#ef4444", info: "#6366f1" };
    const toast = document.createElement("div");
    toast.style.cssText =
        "background:" + (colors[type] || colors.info) + ";color:#fff;"
        + "padding:.75rem 1.25rem;border-radius:.75rem;font-size:.875rem;"
        + "box-shadow:0 4px 20px rgba(0,0,0,.35);max-width:320px;";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 4000);
}


// ============================================================
// FILE INPUT
// ============================================================

if (fileInput) {
    fileInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) handleFile(file);
    });
}


// ============================================================
// DRAG AND DROP
// ============================================================

if (dropZone) {

    dropZone.addEventListener("dragover", function (event) {
        event.preventDefault();
        dropZone.classList.add("drag-over");
    });

    dropZone.addEventListener("dragleave", function () {
        dropZone.classList.remove("drag-over");
    });

    dropZone.addEventListener("drop", function (event) {
        event.preventDefault();
        dropZone.classList.remove("drag-over");
        const file = event.dataTransfer.files[0];
        if (file) handleFile(file);
    });
}


// ============================================================
// CHANGE / REMOVE BUTTONS
// ============================================================

if (changeBtn) {
    changeBtn.addEventListener("click", function () {
        if (fileInput) fileInput.click();
    });
}

if (removeBtn) {
    removeBtn.addEventListener("click", function () {
        resetUpload();
    });
}


// ============================================================
// HANDLE FILE
// ============================================================

function handleFile(file) {

    if (!file.type.startsWith("image/")) {
        showToast("Please upload an image file.", "error");
        return;
    }

    selectedFile = file;

    const reader = new FileReader();

    reader.onload = function (event) {
        if (previewImg) previewImg.src = event.target.result;
        if (dzIdle)    dzIdle.style.display    = "none";
        if (dzPreview) dzPreview.style.display = "flex";
    };

    reader.readAsDataURL(file);

    if (fileInfo)   fileInfo.style.display   = "flex";
    if (fileNameEl) fileNameEl.textContent   = file.name;
    if (fileSizeEl) fileSizeEl.textContent   = formatBytes(file.size);
    if (predictBtn) predictBtn.disabled      = false;

    showToast("Image selected successfully.", "success");
}


function resetUpload() {
    selectedFile = null;
    if (fileInput)   fileInput.value            = "";
    if (previewImg)  previewImg.src             = "";
    if (dzIdle)      dzIdle.style.display       = "flex";
    if (dzPreview)   dzPreview.style.display    = "none";
    if (fileInfo)    fileInfo.style.display     = "none";
    if (predictBtn)  predictBtn.disabled        = true;
}


// ============================================================
// PREDICT BUTTON
// ============================================================

if (predictBtn) {
    predictBtn.addEventListener("click", runPrediction);
}


// ============================================================
// PREDICTION
// ============================================================

async function runPrediction() {

    if (!selectedFile) {
        showToast("Please select an image first.", "error");
        return;
    }

    // Loading state
    predictBtn.disabled = true;
    if (predictBtnText)    predictBtnText.style.display    = "none";
    if (predictBtnLoading) predictBtnLoading.style.display = "flex";

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {

        const response = await fetch("/predict", { method: "POST", body: formData });
        const data     = await response.json();

        if (!response.ok || data.success === false) {
            showToast(data.error || "Prediction failed.", "error");
            return;
        }

        renderResults(data);
        addToHistory(data);
        showToast("Prediction completed successfully.", "success");

    } catch (err) {

        console.error("Prediction error:", err);
        showToast("Unable to connect to Flask server.", "error");

    } finally {

        predictBtn.disabled = false;
        if (predictBtnText)    predictBtnText.style.display    = "flex";
        if (predictBtnLoading) predictBtnLoading.style.display = "none";
    }
}


// ============================================================
// RENDER RESULTS
// ============================================================

function renderResults(data) {

    // Show results section
    if (resultsSection) {
        resultsSection.style.display = "block";
        resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Hero card
    if (rhEmoji) rhEmoji.textContent = data.emoji || "🖼️";
    if (rhClass) rhClass.textContent = capitalize(data.predicted_class);
    if (rhConf)  rhConf.textContent  = data.confidence.toFixed(2) + "% confidence";
    if (rhTime)  rhTime.textContent  = data.inference_time_ms.toFixed(1) + " ms";
    if (rhMode)  rhMode.textContent  = data.ae_loaded
        ? "Full (AE + Classifier)"
        : "Classifier only";

    if (resultTimestamp) {
        resultTimestamp.textContent = data.timestamp || new Date().toLocaleString();
    }

    // Probability bars
    renderProbabilities(data.probabilities, data.class_colors);

    // Images
    if (originalImg) originalImg.src = data.original_image;

    if (reconImg && data.reconstructed_image) {
        reconImg.src           = data.reconstructed_image;
        reconImg.style.display = "block";
        if (reconNa) reconNa.style.display = "none";
    } else if (reconNa) {
        reconNa.style.display  = "block";
        if (reconImg) reconImg.style.display = "none";
    }

    // Radial confidence meter
    renderRadial(data.confidence, data.predicted_class, data.class_colors);
}


// ============================================================
// PROBABILITY BARS
// ============================================================

function renderProbabilities(probabilities, classColors) {

    if (!probBars) return;

    probBars.innerHTML = "";

    const entries = Object.entries(probabilities);
    entries.sort(function (a, b) { return b[1] - a[1]; });

    entries.forEach(function (entry) {

        const label = entry[0];
        const value = entry[1];
        const color = (classColors && classColors[label]) || "#6366f1";

        const row = document.createElement("div");
        row.className = "pb-row";

        row.innerHTML =
            "<div class=\"pb-top\">"
            + "<span class=\"pb-label\">" + capitalize(label) + "</span>"
            + "<span class=\"pb-pct\">" + Number(value).toFixed(2) + "%</span>"
            + "</div>"
            + "<div class=\"pb-track\">"
            + "<div class=\"pb-fill\" style=\"width:" + value + "%;background:" + color + ";\"></div>"
            + "</div>";

        probBars.appendChild(row);
    });
}


// ============================================================
// RADIAL CONFIDENCE METER
// ============================================================

function renderRadial(confidence, predictedClass, classColors) {

    if (!radialFg) return;

    const circumference = 2 * Math.PI * 50;   // r = 50
    const offset = circumference * (1 - confidence / 100);

    radialFg.style.strokeDasharray  = circumference + " " + circumference;
    radialFg.style.strokeDashoffset = offset;
    radialFg.style.stroke = (classColors && classColors[predictedClass]) || "#6366f1";

    if (radialPct)   radialPct.textContent   = Math.round(confidence) + "%";
    if (radialClass) radialClass.textContent = capitalize(predictedClass);
}


// ============================================================
// HISTORY
// ============================================================

function addToHistory(data) {

    historyItems.unshift({
        class      : data.predicted_class,
        confidence : data.confidence,
        emoji      : data.emoji,
        time       : new Date().toLocaleTimeString()
    });

    if (historyItems.length > 10) historyItems.pop();

    renderHistory();

    if (historySection) historySection.style.display = "block";
}


function renderHistory() {

    if (!historyList) return;

    historyList.innerHTML = "";

    if (historyItems.length === 0) {
        historyList.innerHTML = "<div class=\"empty-history\">No predictions yet.</div>";
        return;
    }

    historyItems.forEach(function (item) {

        const el = document.createElement("div");
        el.className = "history-item";

        el.innerHTML =
            "<div class=\"hi-emoji\">" + item.emoji + "</div>"
            + "<div class=\"hi-info\">"
            + "<div class=\"hi-class\">" + capitalize(item.class) + "</div>"
            + "<div class=\"hi-conf\">" + item.confidence.toFixed(1) + "% confidence &nbsp;·&nbsp; <span class=\"hi-time\">" + item.time + "</span></div>"
            + "</div>";

        historyList.appendChild(el);
    });
}


// ============================================================
// CLEAR HISTORY
// ============================================================

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", function () {
        historyItems = [];
        renderHistory();
        if (historySection) historySection.style.display = "none";
        showToast("History cleared.", "info");
    });
}


// ============================================================
// LOAD MODEL INFORMATION  (called on page load)
// ============================================================

async function loadModelInfo() {

    try {

        const response = await fetch("/model-info");
        const data     = await response.json();
        updateModelInfo(data);

    } catch (err) {
        console.error("Model info error:", err);
    }
}


function updateModelInfo(data) {

    if (icInput && data.image_size) {
        icInput.textContent = data.image_size[0] + "×" + data.image_size[1];
    }

    if (data.classifier) {

        if (icParams) icParams.textContent = formatNumber(data.classifier.total_params);
        if (icLayers) icLayers.textContent = data.classifier.num_layers;

        if (layerTbody && data.classifier.layers) {

            layerTbody.innerHTML = "";

            data.classifier.layers.forEach(function (layer, idx) {

                const row = document.createElement("tr");
                row.innerHTML =
                    "<td>" + (idx + 1) + "</td>"
                    + "<td>" + layer.name + "</td>"
                    + "<td>" + layer.type + "</td>"
                    + "<td>" + layer.output_shape + "</td>";

                layerTbody.appendChild(row);
            });

            if (layerTableWrap) layerTableWrap.style.display = "block";
        }
    }
}


// ============================================================
// HELPERS
// ============================================================

function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatNumber(n) {
    return Number(n).toLocaleString();
}

function formatBytes(bytes) {
    if (bytes < 1024)    return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
    loadModelInfo();
    renderHistory();
});