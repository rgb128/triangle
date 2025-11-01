'use strict';

document.addEventListener("DOMContentLoaded", function() {
    const virtualWorld = document.querySelector('.virtual-world');

    // --- The constants for your virtual space ---
    const VIRTUAL_WIDTH = 1000;
    const VIRTUAL_HEIGHT = 1000;

    function updateTransform() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const viewportRatio = viewportWidth / viewportHeight;
        const virtualRatio = VIRTUAL_WIDTH / VIRTUAL_HEIGHT;

        let scale, translateX, translateY;

        // --- THIS IS THE CORRECTED "COVER" LOGIC ---
        if (viewportRatio > virtualRatio) {
            // Viewport is WIDER than the virtual space.
            // We must scale by width to ensure it fills the space.
            scale = viewportWidth / VIRTUAL_WIDTH;
            // Center vertically
            translateX = 0;
            translateY = (viewportHeight - (VIRTUAL_HEIGHT * scale)) / 2;
        } else {
            // Viewport is TALLER or same ratio as the virtual space.
            // We must scale by height to ensure it fills the space.
            scale = viewportHeight / VIRTUAL_HEIGHT;
            // Center horizontally
            translateX = (viewportWidth - (VIRTUAL_WIDTH * scale)) / 2;
            translateY = 0;
        }
        
        // Apply the final calculated transformation in one go
        virtualWorld.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    // Update on initial load and on every resize
    window.addEventListener('resize', updateTransform);
    updateTransform(); // Initial call
});


document.querySelector('img').addEventListener('click', e => {
    // This correctly reports the click position on the UN-SCALED element.
    const virtualX = e.offsetX;
    const virtualY = e.offsetY;

    console.log(`Virtual Coords: X=${virtualX.toFixed(0)}, Y=${virtualY.toFixed(0)}`);
});
