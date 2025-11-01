'use strict';

const copyButton = document.getElementById('copy-button');
const downloadButton = document.getElementById('download-button');

// --- Constants for Watermark ---
const WATERMARK = {
    text: '#808080',
    font: '16px monospace',
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
    // We can find the top-left corner by inverting the transform math.
    const sourceX = (0 - getViewportTransform().translateX) / scale;
    const sourceY = (0 - getViewportTransform().translateY) / scale;
    const sourceWidth = viewportWidth / scale;
    const sourceHeight = viewportHeight / scale;

    // Create a temporary canvas matching the viewport size
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = viewportWidth;
    exportCanvas.height = viewportHeight;
    const exportCtx = exportCanvas.getContext('2d');

    // 1. Draw the visible part of the background canvas
    exportCtx.drawImage(backgroundCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, viewportWidth, viewportHeight);

    // 2. Draw the visible part of the foreground canvas on top
    exportCtx.drawImage(foregroundCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, viewportWidth, viewportHeight);

    // 3. Add the watermark text
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

copyButton.addEventListener('click', async () => {
    copyButton.textContent = COPY_TEXT.copying;
    copyButton.disabled = true;

    const canvas = createExportCanvas();
    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        copyButton.textContent = COPY_TEXT.copied;
    } catch (err) {
        console.error('Failed to copy image:', err);
        copyButton.textContent = COPY_TEXT.error; // Or handle error differently
    }

    setTimeout(() => {
        copyButton.textContent = COPY_TEXT.default;
        copyButton.disabled = false;
    }, COPY_TEXT.delay);
});
