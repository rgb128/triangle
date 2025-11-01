'use strict';

const copyButton = document.getElementById('copy-button');
const downloadButton = document.getElementById('download-button');

// --- Constants for Watermark ---
const WATERMARK = {
    text: '#808080',
    font: '32px monospace',
    fillStyle: 'black',
    strokeStyle: 'white',
    lineWidth: 2,
    xPadding: 10,
    yPadding: 10,
};

// --- Constants for Button States ---
const COPY_TEXT = {
    default: 'copy',
    copying: 'copying...',
    copied: 'copied!',
    error: 'error!',
    delay: 3000, // 3 seconds
};

const FILENAME = 'rgb128_triangle.png';

/**
 * Calculates the current scale and translation of the virtual world,
 * which is needed to correctly capture only the visible area.
 */
const getViewportTransform = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportRatio = viewportWidth / viewportHeight;
    const virtualRatio = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;

    let scale, translateX, translateY;

    if (viewportRatio > virtualRatio) {
        scale = viewportWidth / VIRTUAL_WIDTH;
        translateX = 0;
        translateY = (viewportHeight - (VIRTUAL_HEIGHT * scale)) / 2;
    } else {
        scale = viewportHeight / VIRTUAL_HEIGHT;
        translateX = (viewportWidth - (VIRTUAL_WIDTH * scale)) / 2;
        translateY = 0;
    }
    return { scale, translateX, translateY };
};

/**
 * Creates a new, temporary canvas containing a snapshot of the visible area,
 * combining the background, foreground, and watermark.
 * @returns {HTMLCanvasElement} The composited canvas.
 */
const createExportCanvas = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const { scale } = getViewportTransform();

    // Determine the source rectangle (the visible part of the large canvases)
    const sourceX = Math.round((0 - getViewportTransform().translateX) / scale);
    const sourceY = Math.round((0 - getViewportTransform().translateY) / scale);
    const sourceWidth = Math.round(viewportWidth / scale);
    const sourceHeight = Math.round(viewportHeight / scale);

    // Create a temporary canvas matching the viewport size
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = viewportWidth;
    exportCanvas.height = viewportHeight;
    const exportCtx = exportCanvas.getContext('2d');

    // --- 1. Draw the ACCURATE, rotated background ---
    // Get the original pixel data for the visible area from the hidden canvas
    const originalPixels = gradientCtx.getImageData(sourceX, sourceY, sourceWidth, sourceHeight);
    // Create a new image data buffer to hold the rotated pixels
    const rotatedPixels = exportCtx.createImageData(sourceWidth, sourceHeight);
    
    // Manually loop through and rotate the hue for each pixel
    for (let i = 0; i < originalPixels.data.length; i += 4) {
        const [h, s, l] = rgbToHsl(originalPixels.data[i], originalPixels.data[i+1], originalPixels.data[i+2]);
        const newHue = (h + (currentHueRotation / 360)) % 1.0;
        const [newR, newG, newB] = hslToRgb(newHue, s, l);

        rotatedPixels.data[i] = newR;
        rotatedPixels.data[i + 1] = newG;
        rotatedPixels.data[i + 2] = newB;
        rotatedPixels.data[i + 3] = originalPixels.data[i + 3]; // Keep original alpha
    }

    // To properly draw this, we need another temporary canvas
    const tempBgCanvas = document.createElement('canvas');
    tempBgCanvas.width = sourceWidth;
    tempBgCanvas.height = sourceHeight;
    tempBgCanvas.getContext('2d').putImageData(rotatedPixels, 0, 0);

    // Now, draw the correctly colored (but potentially scaled) background to our export canvas
    exportCtx.drawImage(tempBgCanvas, 0, 0, sourceWidth, sourceHeight, 0, 0, viewportWidth, viewportHeight);

    // --- 2. Draw the visible part of the foreground canvas on top ---
    exportCtx.drawImage(foregroundCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, viewportWidth, viewportHeight);

    // --- 3. Add the watermark text ---
    exportCtx.font = WATERMARK.font;
    exportCtx.fillStyle = WATERMARK.fillStyle;
    exportCtx.strokeStyle = WATERMARK.strokeStyle;
    exportCtx.lineWidth = WATERMARK.lineWidth;
    exportCtx.textAlign = 'right';
    exportCtx.textBaseline = 'bottom';

    const textX = viewportWidth - WATERMARK.xPadding;
    const textY = viewportHeight - WATERMARK.yPadding;
    
    exportCtx.strokeText(WATERMARK.text, textX, textY);
    exportCtx.fillText(WATERMARK.text, textX, textY);

    return exportCanvas;
};


// --- Event Listeners for Buttons ---

downloadButton.addEventListener('click', () => {
    const canvas = createExportCanvas();
    const link = document.createElement('a');
    link.download = FILENAME;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// no awaits for stupid safari
copyButton.addEventListener('click', () => { // Note: no 'async' keyword
    copyButton.textContent = COPY_TEXT.copying;
    copyButton.disabled = true;

    const canvas = createExportCanvas();

    // 1. Create a Promise that will resolve with the blob.
    //    The canvas.toBlob() function is asynchronous itself.
    const blobPromise = new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    // 2. We call navigator.clipboard.write() IMMEDIATELY AND SYNCHRONOUSLY.
    //    This is the crucial step that satisfies Safari's security model.
    //    We give it a ClipboardItem that contains the PROMISE of the blob.
    navigator.clipboard.write([
        new ClipboardItem({
            'image/png': blobPromise
        })
    ]).then(() => {
        // SUCCESS CASE: This code runs if the user allows permission
        // and the blob is successfully created and copied.
        copyButton.textContent = COPY_TEXT.copied;

    }).catch(err => {
        // FAILURE CASE: This code runs if the user denies permission,
        // or if another error occurs.
        console.error('Failed to copy image. Error:', err);
        if (err.name === 'NotAllowedError') {
             // User explicitly denied the permission prompt.
             copyButton.textContent = 'Permission Denied';
        } else {
            // Another error occurred (e.g., browser doesn't support it),
            // so we show the manual copy fallback.
            showCopyFallback(canvas);
            copyButton.textContent = 'Manual Copy';
        }

    }).finally(() => {
        // ALWAYS RUNS: This code runs after success or failure to reset the button.
        setTimeout(() => {
            copyButton.textContent = COPY_TEXT.default;
            copyButton.disabled = false;
        }, COPY_TEXT.delay);
    });
});

