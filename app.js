'use strict';

const INITIAL_PARAMS = {
    colors: {
        topLeft: 'red',
        topRight: 'blue',
        bottomRight: 'yellow',
        bottomLeft: 'green',
    },
    borderColor: 'white',
    borderWidth: 10,
    minWidth: 100,
    maxWidth: 1000,
    minHeight: 100,
    maxHeight: 1000,
    minHueRotate: 5,
    maxHueRotate: 15,
};

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

// --- Canvas Setup ---
// The visible background canvas (bottom layer)
const backgroundCanvas = document.getElementById('background-canvas');
const backgroundCtx = backgroundCanvas.getContext('2d');

// The visible foreground canvas for rectangles (top layer)
const foregroundCanvas = document.getElementById('foreground-canvas');
const foregroundCtx = foregroundCanvas.getContext('2d');

// A hidden, in-memory canvas to hold the original, un-rotated gradient
const gradientCanvas = document.createElement('canvas');
const gradientCtx = gradientCanvas.getContext('2d');

// --- Global State ---
let currentHueRotation = 0;


const linearScale = (min, max) => {
    // Math.random() is implicitly to the power of 1
    const randomFactor = Math.random();
    return min + randomFactor * (max - min);
};
const quadraticScale = (min, max) => {
    const randomFactor = Math.random() ** 2;
    return min + randomFactor * (max - min);
};
const cubicScale = (min, max) => {
    const randomFactor = Math.random() ** 3;
    return min + randomFactor * (max - min);
};
const power5Scale = (min, max) => {
    const randomFactor = Math.random() ** 5;
    return min + randomFactor * (max - min);
};

/**
 * Generates a random number using a quadratic distribution.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} A random number between min and max.
 */
const scale = cubicScale;

/**
 * Initializes all canvases. The pure gradient is created in memory,
 * then drawn to the visible background canvas.
 */
const initializeCanvas = () => {
    // Set dimensions for all three canvases
    [backgroundCanvas, foregroundCanvas, gradientCanvas].forEach(c => {
        c.width = CANVAS_WIDTH;
        c.height = CANVAS_HEIGHT;
    });

    const cornerRadius = Math.sqrt(CANVAS_WIDTH ** 2 + CANVAS_HEIGHT ** 2);
    const gradients = [
        { x: 0, y: 0, color: INITIAL_PARAMS.colors.topLeft, radius: cornerRadius },
        { x: CANVAS_WIDTH, y: 0, color: INITIAL_PARAMS.colors.topRight, radius: cornerRadius },
        { x: CANVAS_WIDTH, y: CANVAS_HEIGHT, color: INITIAL_PARAMS.colors.bottomRight, radius: cornerRadius },
        { x: 0, y: CANVAS_HEIGHT, color: INITIAL_PARAMS.colors.bottomLeft, radius: cornerRadius },
    ];
    
    // Draw the pure gradient ONLY on the hidden gradient canvas
    gradientCtx.globalCompositeOperation = 'lighter';
    gradients.forEach(g => {
        const grad = gradientCtx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius);
        grad.addColorStop(0, g.color);
        grad.addColorStop(1, 'transparent');
        gradientCtx.fillStyle = grad;
        gradientCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    });
    gradientCtx.globalCompositeOperation = 'source-over';

    // Copy the pure gradient to the visible background to start
    backgroundCtx.drawImage(gradientCanvas, 0, 0);
};

// --- Event Listeners ---

foregroundCanvas.addEventListener('click', (event) => {
    const clickX = event.offsetX;
    const clickY = event.offsetY;

    // 1. Calculate the new background hue and apply it to the background canvas
    const rotationAmount = scale(INITIAL_PARAMS.minHueRotate, INITIAL_PARAMS.maxHueRotate);
    currentHueRotation += rotationAmount;
    
    // 2. Clear the background canvas and redraw the pure gradient with the filter applied.
    // This updates the actual pixel data so we can sample the correct color.
    backgroundCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    backgroundCtx.filter = `hue-rotate(${currentHueRotation}deg)`;
    backgroundCtx.drawImage(gradientCanvas, 0, 0);
    backgroundCtx.filter = 'none'; // Reset filter for future operations

    // 3. Get the color from the newly rotated BACKGROUND canvas
    const pixel = backgroundCtx.getImageData(clickX, clickY, 1, 1).data;
    const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

    // 4. Define the new rectangle's properties
    const width = scale(INITIAL_PARAMS.minWidth, INITIAL_PARAMS.maxWidth);
    const height = scale(INITIAL_PARAMS.minHeight, INITIAL_PARAMS.maxHeight);
    const rectX = clickX - width / 2;
    const rectY = clickY - height / 2;

    // 5. Draw the new rectangle ONLY on the FOREGROUND canvas.
    // The foreground is never cleared, so all previous rectangles remain untouched.
    foregroundCtx.fillStyle = color;
    foregroundCtx.strokeStyle = INITIAL_PARAMS.borderColor;
    foregroundCtx.lineWidth = INITIAL_PARAMS.borderWidth;
    foregroundCtx.fillRect(rectX, rectY, width, height);
    if (INITIAL_PARAMS.borderWidth) {
        foregroundCtx.strokeRect(rectX, rectY, width, height);
    }
});

// --- Initial Setup ---
initializeCanvas();
