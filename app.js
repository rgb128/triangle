'use strict';


const colorSchemes = [
    // 0: Sunday - "Mint & Coral"
    { topLeft: '#a8e6cf', topRight: '#ffb3ba', bottomRight: '#f9f871', bottomLeft: '#bde0fe' },
    // 1: Monday - "Twilight Lavender"
    { topLeft: '#845ec2', topRight: '#ffc7c7', bottomRight: '#00c9a7', bottomLeft: '#f3d29c' },
    // 2: Tuesday - "Deep Sea Jewels"
    { topLeft: '#008080', topRight: '#d43790', bottomRight: '#ffc947', bottomLeft: '#4b0082' },
    // 3: Wednesday - "Earthy Forest"
    { topLeft: '#2c5d3d', topRight: '#ffb833', bottomRight: '#a52a2a', bottomLeft: '#87ceeb' },
    // 4: Thursday - "Vibrant Citrus"
    { topLeft: '#ff8b2d', topRight: '#ffef96', bottomRight: '#c1fba4', bottomLeft: '#4a8cff' },
    // 5: Friday - "Cotton Candy Sky"
    { topLeft: '#ff7b9c', topRight: '#a2d2ff', bottomRight: '#fff3b0', bottomLeft: '#c7bfff' },
    // 6: Saturday - "Sunset Peach"
    { topLeft: '#ff6f61', topRight: '#ffdab9', bottomRight: '#c56cf0', bottomLeft: '#ffda79' },
];
const initialParams = {
    // colors: colorSchemes[6],
    colors: colorSchemes[new Date().getDay()], // Based on the day of the week
    borderColor: 'white',
    borderWidth: 10,
    minWidth: 100,
    maxWidth: 2000,
    minHeight: 100,
    maxHeight: 2000,
    minHueRotate: 5,
    maxHueRotate: 15,
};

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

// --- Canvas Setup ---
// The visible background canvas (bottom layer)
const backgroundCanvas = document.getElementById('background-canvas');
const backgroundCtx = backgroundCanvas.getContext('2d', { willReadFrequently: true });

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
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r * 255, g * 255, b * 255];
}

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
        { x: 0, y: 0, color: initialParams.colors.topLeft, radius: cornerRadius },
        { x: CANVAS_WIDTH, y: 0, color: initialParams.colors.topRight, radius: cornerRadius },
        { x: CANVAS_WIDTH, y: CANVAS_HEIGHT, color: initialParams.colors.bottomRight, radius: cornerRadius },
        { x: 0, y: CANVAS_HEIGHT, color: initialParams.colors.bottomLeft, radius: cornerRadius },
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

    // This ensures the initial CSS filter matches the canvas state.
    backgroundCanvas.style.filter = `hue-rotate(0deg)`; 
};

// --- Event Listeners ---

foregroundCanvas.addEventListener('click', (event) => {
    const clickX = event.offsetX;
    const clickY = event.offsetY;

    // 1. Calculate the new cumulative hue rotation
    const rotationAmount = scale(initialParams.minHueRotate, initialParams.maxHueRotate);
    currentHueRotation += rotationAmount;

    // 2. FOR VISUALS: Instantly update the background canvas using the fast CSS filter.
    // This is for the user to see and works in all browsers, including Safari.
    backgroundCanvas.style.filter = `hue-rotate(${currentHueRotation}deg)`;

    // 3. FOR DATA: Get the TRUE rotated color for the single pixel under the cursor.
    // We do this by getting the ORIGINAL color from the hidden canvas and rotating it manually.

    // a) Sample the original, un-rotated color from the hidden gradient canvas.
    const originalPixel = gradientCtx.getImageData(clickX, clickY, 1, 1).data;
    const [r, g, b] = [originalPixel[0], originalPixel[1], originalPixel[2]];

    // b) Convert to HSL, apply our rotation, and convert back to RGB. This is instant for one pixel.
    const [h, s, l] = rgbToHsl(r, g, b);
    const newHue = (h + (currentHueRotation / 360)) % 1.0;
    const [newR, newG, newB] = hslToRgb(newHue, s, l);

    const color = `rgb(${newR}, ${newG}, ${newB})`;

    // 4. Define the new rectangle's properties
    const width = scale(initialParams.minWidth, initialParams.maxWidth);
    const height = scale(initialParams.minHeight, initialParams.maxHeight);
    const rectX = clickX - width / 2;
    const rectY = clickY - height / 2;

    // 5. Draw the new rectangle on the FOREGROUND canvas with the correct color.
    foregroundCtx.fillStyle = color;
    foregroundCtx.strokeStyle = initialParams.borderColor;
    foregroundCtx.lineWidth = initialParams.borderWidth;
    foregroundCtx.fillRect(rectX, rectY, width, height);
    if (initialParams.borderWidth) {
        foregroundCtx.strokeRect(rectX, rectY, width, height);
    }
});


// --- Initial Setup ---
initializeCanvas();
