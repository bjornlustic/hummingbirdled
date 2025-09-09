// LED Matrix Simulator for 64x64 Panel
class LEDMatrixSimulator {
    constructor() {
        this.matrixSize = 64;
        this.matrix = [];
        this.currentFrame = 0;
        this.frames = [];
        this.isPlaying = false;
        this.animationSpeed = 50;
        this.animationId = null;
        this.lastFrameTime = 0;
        this.effects = {
            split: false,
            swarm: false,
            move: false,
            breathing: false,
            pollination: false
        };
        this.scale = 1.0;
        this.position = { x: 32, y: 32 };
        this.moveData = {
            currentPos: { x: 32, y: 32 },
            targetPos: { x: 32, y: 32 },
            moveTimer: 0,
            pauseTimer: 0,
            isMoving: false
        };

        // Pollination animation state
        this.pollinationData = {
            timer: 0,
            flowerPos: { x: 21, y: 22 }, // Flower positioned further left and higher
            flowerScale: 0.9, // Static at final size
            flowerWiggle: { x: 0, y: 0 }, // For subtle movement during pollination
            currentBirdIndex: 0,
            birds: [], // Will hold multiple birds
            maxBirds: 4, // Number of birds in rotation
            animationDuration: {
                flyIn: 40,      // 40 frames flying in from left
                pollinate: 80,  // 80 frames pollinating 
                flyOut: 40      // 40 frames flying out to right
            },
            birdCycleDuration: 160, // Total time for one bird cycle
            totalCycleDuration: 640, // Total time for all birds (160 * 4)
            pollinationActive: false // Track if any bird is currently pollinating
        };

        // Individual bird data for swarm mode
        this.swarmBirds = null;
        this.swarmMinSpeed = 0.1;
        this.swarmMaxSpeed = 1.2;
        this.swarmMinSize = 0.2;
        this.swarmMaxSize = 2.5;
        this.maxSwarmBirds = 12; // Default max birds

        this.init();
    }

    init() {
        this.createMatrix();
        this.loadImages();
        this.setupEventListeners();
        this.updateControls();
        this.initializePollinationBirds();
    }

    initializePollinationBirds() {
        this.pollinationData.birds = [];
        const hueStep = 360 / this.pollinationData.maxBirds; // Distribute hues evenly

        for (let i = 0; i < this.pollinationData.maxBirds; i++) {
            this.pollinationData.birds.push({
                phase: 'waiting', // waiting, flyIn, pollinate, flyOut
                timer: 0,
                position: { x: -15, y: 22 },
                scale: 0.8,
                hue: i * hueStep, // 0°, 90°, 180°, 270° for 4 birds
                saturation: 0.8 + (i * 0.05), // Slight saturation variation
                brightness: 0.9 + (i * 0.025), // Slight brightness variation
                startDelay: i * this.pollinationData.birdCycleDuration // Stagger bird starts
            });
        }
    }

    createMatrix() {
        const matrixElement = document.getElementById('ledMatrix');
        matrixElement.innerHTML = '';

        // Update CSS grid for current matrix size
        this.updateMatrixCSS();

        // Initialize matrix data structure
        this.matrix = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        // Create LED elements
        for (let y = 0; y < this.matrixSize; y++) {
            for (let x = 0; x < this.matrixSize; x++) {
                const led = document.createElement('div');
                led.className = 'led';
                led.dataset.x = x;
                led.dataset.y = y;
                matrixElement.appendChild(led);
            }
        }
    }

    updateMatrixCSS() {
        const matrixElement = document.getElementById('ledMatrix');
        const ledSize = this.matrixSize === 64 ? '10px' : '20px'; // Much larger LEDs to fill the space
        const gap = this.matrixSize === 64 ? '1px' : '2px';

        matrixElement.style.gridTemplateColumns = `repeat(${this.matrixSize}, ${ledSize})`;
        matrixElement.style.gridTemplateRows = `repeat(${this.matrixSize}, ${ledSize})`;
        matrixElement.style.gap = gap;

        // Update individual LED sizes
        const leds = matrixElement.querySelectorAll('.led');
        leds.forEach(led => {
            led.style.width = ledSize;
            led.style.height = ledSize;
        });
    }

    changeMatrixSize(newSize) {
        this.pause(); // Stop animation during size change

        this.matrixSize = newSize;

        // Reset position to center
        this.position = { x: newSize / 2, y: newSize / 2 };

        // Reset move data
        this.moveData = {
            currentPos: { x: newSize / 2, y: newSize / 2 },
            targetPos: { x: newSize / 2, y: newSize / 2 },
            moveTimer: 0,
            pauseTimer: 0,
            isMoving: false
        };

        // Recreate matrix and reload images
        this.createMatrix();
        this.loadImages();

        console.log(`Matrix size changed to ${newSize}x${newSize}`);
    }

    async loadImages() {
        try {
            const frame1 = await this.loadImageToMatrix('./hummingbird/hummingbird1.png');
            const frame2 = await this.loadImageToMatrix('./hummingbird/hummingbird2.png');
            const flowerFrame = await this.loadImageToMatrix('./flower/flower1.png');
            this.frames = [frame1, frame2];
            this.flowerFrame = flowerFrame;
            this.displayFrame(0);
            console.log('Images loaded successfully');
        } catch (error) {
            console.error('Error loading images:', error);
            this.createTestPattern();
        }
    }

    loadImageToMatrix(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.getElementById('imageCanvas');
                const ctx = canvas.getContext('2d');

                // Set canvas size to matrix size
                canvas.width = this.matrixSize;
                canvas.height = this.matrixSize;

                // Calculate aspect ratio and positioning
                const aspectRatio = img.width / img.height;
                let drawWidth, drawHeight, drawX, drawY;

                if (aspectRatio > 1) {
                    // Wider than tall
                    drawWidth = this.matrixSize;
                    drawHeight = this.matrixSize / aspectRatio;
                    drawX = 0;
                    drawY = (this.matrixSize - drawHeight) / 2;
                } else {
                    // Taller than wide or square
                    drawWidth = this.matrixSize * aspectRatio;
                    drawHeight = this.matrixSize;
                    drawX = (this.matrixSize - drawWidth) / 2;
                    drawY = 0;
                }

                // Clear canvas with black background
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, this.matrixSize, this.matrixSize);

                // Draw scaled image
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

                // Extract pixel data
                const imageData = ctx.getImageData(0, 0, this.matrixSize, this.matrixSize);
                const pixelData = imageData.data;

                const frameData = Array(this.matrixSize).fill().map(() =>
                    Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
                );

                for (let y = 0; y < this.matrixSize; y++) {
                    for (let x = 0; x < this.matrixSize; x++) {
                        const index = (y * this.matrixSize + x) * 4;
                        const r = pixelData[index];
                        const g = pixelData[index + 1];
                        const b = pixelData[index + 2];

                        // Skip white pixels (background)
                        if (r > 240 && g > 240 && b > 240) {
                            frameData[y][x] = { r: 0, g: 0, b: 0 };
                        } else {
                            frameData[y][x] = { r, g, b };
                        }
                    }
                }

                resolve(frameData);
            };

            img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
            img.src = imagePath;
        });
    }

    createTestPattern() {
        // Create a simple test pattern if images fail to load
        const frame1 = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );
        const frame2 = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        // Draw a simple bird-like pattern
        for (let y = 25; y < 40; y++) {
            for (let x = 25; x < 40; x++) {
                frame1[y][x] = { r: 255, g: 100, b: 0 };
                frame2[y][x] = { r: 255, g: 150, b: 50 };
            }
        }

        this.frames = [frame1, frame2];
        this.displayFrame(0);
        console.log('Using test pattern');
    }

    displayFrame(frameIndex) {
        if (!this.frames || this.frames.length === 0) return;

        this.currentFrame = frameIndex % this.frames.length;
        const frame = this.frames[this.currentFrame];

        let displayFrame = frame;

        // Apply effects
        if (this.effects.pollination) {
            displayFrame = this.applyPollinationEffect(frame);
        } else if (this.effects.split && this.effects.swarm) {
            displayFrame = this.applySplitSwarmEffect(frame);
        } else if (this.effects.split && this.effects.move) {
            displayFrame = this.applySplitMoveEffect(frame);
        } else if (this.effects.split) {
            displayFrame = this.applySplitEffect(frame);
        } else if (this.effects.swarm) {
            displayFrame = this.applySwarmEffect(frame);
        } else if (this.effects.move) {
            displayFrame = this.applyMoveEffect(frame);
        } else {
            displayFrame = this.applyScaleAndPosition(frame);
        }

        // Update matrix
        this.matrix = displayFrame;
        this.renderMatrix();

        // Frame counter removed
    }

    applyScaleAndPosition(frame) {
        const newFrame = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        // Apply breathing effect by modulating scale
        let currentScale = this.scale;
        if (this.effects.breathing) {
            const time = Date.now() / 1000;
            const breathScale = 0.8 + Math.sin(time * 2) * 0.3; // Scale between 0.5 and 1.1
            currentScale = this.scale * breathScale;
        }

        const scaledSize = Math.floor(this.matrixSize * currentScale);
        const offsetX = this.position.x - scaledSize / 2;
        const offsetY = this.position.y - scaledSize / 2;

        for (let y = 0; y < scaledSize; y++) {
            for (let x = 0; x < scaledSize; x++) {
                const sourceX = Math.floor(x / currentScale);
                const sourceY = Math.floor(y / currentScale);
                const targetX = Math.floor(offsetX + x);
                const targetY = Math.floor(offsetY + y);

                if (sourceX >= 0 && sourceX < this.matrixSize &&
                    sourceY >= 0 && sourceY < this.matrixSize &&
                    targetX >= 0 && targetX < this.matrixSize &&
                    targetY >= 0 && targetY < this.matrixSize) {
                    newFrame[targetY][targetX] = frame[sourceY][sourceX];
                }
            }
        }

        return newFrame;
    }

    applySplitEffect(frame) {
        const newFrame = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        const quadrantSize = this.matrixSize / 2; // 32x32 for each quadrant

        // Define the 4 quadrant positions
        const quadrants = [
            { offsetX: 0, offsetY: 0 },                    // Top-left
            { offsetX: quadrantSize, offsetY: 0 },         // Top-right
            { offsetX: 0, offsetY: quadrantSize },         // Bottom-left
            { offsetX: quadrantSize, offsetY: quadrantSize } // Bottom-right
        ];

        // Color modification types for each quadrant
        const colorMods = [0, 1, 4, 5]; // Red shift, blue shift, enhanced saturation, channel swap

        // Place a scaled-down version of the bird in each quadrant with different colors
        quadrants.forEach((quadrant, quadIndex) => {
            const modType = colorMods[quadIndex];

            // Apply breathing effect with different timing for each quadrant
            let effectiveQuadrantSize = quadrantSize;
            let offsetQuadrantX = 0;
            let offsetQuadrantY = 0;

            if (this.effects.breathing) {
                const time = Date.now() / 1000;
                // Different phase and speed for each quadrant
                const phase = (quadIndex * Math.PI) / 2; // 0, π/2, π, 3π/2
                const speed = 1.5 + (quadIndex * 0.4); // Different speeds: 1.5, 1.9, 2.3, 2.7
                const breathScale = 0.7 + Math.sin(time * speed + phase) * 0.25; // Scale between 0.45 and 0.95

                effectiveQuadrantSize = Math.floor(quadrantSize * breathScale);
                offsetQuadrantX = (quadrantSize - effectiveQuadrantSize) / 2;
                offsetQuadrantY = (quadrantSize - effectiveQuadrantSize) / 2;
            }

            for (let qy = 0; qy < effectiveQuadrantSize; qy++) {
                for (let qx = 0; qx < effectiveQuadrantSize; qx++) {
                    // Map quadrant coordinates to original image coordinates
                    const sourceX = Math.floor((qx / effectiveQuadrantSize) * this.matrixSize);
                    const sourceY = Math.floor((qy / effectiveQuadrantSize) * this.matrixSize);

                    // Target position in the new frame (centered in quadrant)
                    const targetX = Math.floor(quadrant.offsetX + offsetQuadrantX + qx);
                    const targetY = Math.floor(quadrant.offsetY + offsetQuadrantY + qy);

                    if (sourceX < this.matrixSize && sourceY < this.matrixSize &&
                        targetX < this.matrixSize && targetY < this.matrixSize &&
                        targetX >= 0 && targetY >= 0) {

                        const sourcePixel = frame[sourceY][sourceX];

                        // Only process non-black pixels
                        if (sourcePixel.r > 0 || sourcePixel.g > 0 || sourcePixel.b > 0) {
                            let r = sourcePixel.r;
                            let g = sourcePixel.g;
                            let b = sourcePixel.b;

                            // Apply color modification based on quadrant
                            if (modType === 0) {
                                // Hue shift towards red
                                r = Math.min(255, Math.max(30, r * 1.3));
                                g = Math.max(20, Math.floor(g * 0.7));
                                b = Math.max(20, Math.floor(b * 0.6));
                            } else if (modType === 1) {
                                // Hue shift towards blue  
                                r = Math.max(20, Math.floor(r * 0.6));
                                g = Math.max(20, Math.floor(g * 0.8));
                                b = Math.min(255, Math.max(30, b * 1.4));
                            } else if (modType === 4) {
                                // Increase saturation and brightness
                                r = Math.min(240, Math.max(25, r * 1.2));
                                g = Math.min(240, Math.max(25, g * 1.2));
                                b = Math.min(240, Math.max(25, b * 1.2));
                            } else if (modType === 5) {
                                // Swap color channels (ensure minimum values)
                                const temp = Math.max(20, r);
                                r = Math.max(20, b);
                                b = Math.max(20, g);
                                g = temp;
                            }

                            newFrame[targetY][targetX] = {
                                r: Math.floor(r),
                                g: Math.floor(g),
                                b: Math.floor(b)
                            };
                        } else {
                            newFrame[targetY][targetX] = sourcePixel;
                        }
                    }
                }
            }
        });

        return newFrame;
    }

    applySplitMoveEffect(frame) {
        const newFrame = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        const quadrantSize = this.matrixSize / 2;

        // Define the 4 quadrant positions with separate move data for each
        const quadrants = [
            { offsetX: 0, offsetY: 0 },                    // Top-left
            { offsetX: quadrantSize, offsetY: 0 },         // Top-right
            { offsetX: 0, offsetY: quadrantSize },         // Bottom-left
            { offsetX: quadrantSize, offsetY: quadrantSize } // Bottom-right
        ];

        // Initialize quadrant move data if not exists
        if (!this.quadrantMoveData) {
            this.quadrantMoveData = quadrants.map((_, index) => ({
                currentPos: { x: quadrantSize / 2, y: quadrantSize / 2 },
                targetPos: { x: quadrantSize / 2, y: quadrantSize / 2 },
                moveTimer: 0,
                pauseTimer: index * 5, // Stagger the movement
                isMoving: false
            }));
        }

        // Color modification types for each quadrant
        const colorMods = [0, 1, 4, 5]; // Red shift, blue shift, enhanced saturation, channel swap

        quadrants.forEach((quadrant, quadIndex) => {
            const moveData = this.quadrantMoveData[quadIndex];
            this.updateQuadrantMovement(moveData, quadrantSize);
            const modType = colorMods[quadIndex];

            // Use the same size as static split effect (fills entire quadrant)
            let birdSize = quadrantSize;

            // Apply breathing effect to size if active
            if (this.effects.breathing) {
                const time = Date.now() / 1000;
                // Different phase and speed for each quadrant (same as static split effect)
                const phase = (quadIndex * Math.PI) / 2; // 0, π/2, π, 3π/2
                const speed = 1.5 + (quadIndex * 0.4); // Different speeds: 1.5, 1.9, 2.3, 2.7
                const breathScale = 0.7 + Math.sin(time * speed + phase) * 0.25; // Scale between 0.45 and 0.95
                birdSize = Math.floor(quadrantSize * breathScale);
            }

            // Get current position within the quadrant (from moveData)
            const currentPos = moveData.currentPos;

            // Calculate offset to center the bird at the current position
            const offsetX = quadrant.offsetX + currentPos.x - birdSize / 2;
            const offsetY = quadrant.offsetY + currentPos.y - birdSize / 2;

            // Iterate through each pixel in the quadrant
            for (let qy = 0; qy < quadrantSize; qy++) {
                for (let qx = 0; qx < quadrantSize; qx++) {
                    const targetX = quadrant.offsetX + qx;
                    const targetY = quadrant.offsetY + qy;

                    // Check if this pixel is within the bounds of our scaled hummingbird
                    if (targetX >= offsetX && targetX < offsetX + birdSize &&
                        targetY >= offsetY && targetY < offsetY + birdSize) {

                        // Map back to original image coordinates
                        const relativeX = targetX - offsetX; // Position within the scaled bird
                        const relativeY = targetY - offsetY;

                        // Map to source coordinates (scale up to original image size)
                        const sourceX = Math.floor((relativeX / birdSize) * this.matrixSize);
                        const sourceY = Math.floor((relativeY / birdSize) * this.matrixSize);

                        // Ensure we're within bounds and target is within our quadrant
                        if (sourceX >= 0 && sourceX < this.matrixSize &&
                            sourceY >= 0 && sourceY < this.matrixSize &&
                            targetX >= 0 && targetX < this.matrixSize &&
                            targetY >= 0 && targetY < this.matrixSize) {

                            const sourcePixel = frame[sourceY][sourceX];

                            // Only process non-black pixels
                            if (sourcePixel.r > 0 || sourcePixel.g > 0 || sourcePixel.b > 0) {
                                let r = sourcePixel.r;
                                let g = sourcePixel.g;
                                let b = sourcePixel.b;

                                // Apply color modification based on quadrant
                                if (modType === 0) {
                                    // Hue shift towards red
                                    r = Math.min(255, Math.max(30, r * 1.3));
                                    g = Math.max(20, Math.floor(g * 0.7));
                                    b = Math.max(20, Math.floor(b * 0.6));
                                } else if (modType === 1) {
                                    // Hue shift towards blue  
                                    r = Math.max(20, Math.floor(r * 0.6));
                                    g = Math.max(20, Math.floor(g * 0.8));
                                    b = Math.min(255, Math.max(30, b * 1.4));
                                } else if (modType === 4) {
                                    // Increase saturation and brightness
                                    r = Math.min(240, Math.max(25, r * 1.2));
                                    g = Math.min(240, Math.max(25, g * 1.2));
                                    b = Math.min(240, Math.max(25, b * 1.2));
                                } else if (modType === 5) {
                                    // Swap color channels (ensure minimum values)
                                    const temp = Math.max(20, r);
                                    r = Math.max(20, b);
                                    b = Math.max(20, g);
                                    g = temp;
                                }

                                newFrame[targetY][targetX] = {
                                    r: Math.floor(r),
                                    g: Math.floor(g),
                                    b: Math.floor(b)
                                };
                            }
                        }
                    }
                }
            }
        });

        return newFrame;
    }

    updateQuadrantMovement(moveData, quadrantSize) {
        if (moveData.isMoving) {
            // Moving towards target
            moveData.moveTimer++;

            moveData.currentPos.x = moveData.currentPos.x +
                (moveData.targetPos.x - moveData.currentPos.x) * 0.8;
            moveData.currentPos.y = moveData.currentPos.y +
                (moveData.targetPos.y - moveData.currentPos.y) * 0.8;

            const distance = Math.abs(moveData.currentPos.x - moveData.targetPos.x) +
                Math.abs(moveData.currentPos.y - moveData.targetPos.y);

            if (distance < 1) {
                moveData.currentPos.x = moveData.targetPos.x;
                moveData.currentPos.y = moveData.targetPos.y;
                moveData.isMoving = false;
                moveData.moveTimer = 0;
                moveData.pauseTimer = 0;
            }
        } else {
            // Pausing/hovering
            moveData.pauseTimer++;

            // Add slight hovering motion
            const hover = Math.sin(moveData.pauseTimer * 0.3) * 1.5;
            moveData.currentPos.y = moveData.targetPos.y + hover;

            // Random pause duration between 10-30 frames
            const pauseDuration = 15 + Math.random() * 15;

            if (moveData.pauseTimer > pauseDuration) {
                // Choose new random target position within quadrant
                const margin = Math.floor(quadrantSize * this.scale * 0.4) + 5;
                moveData.targetPos = {
                    x: margin + Math.random() * (quadrantSize - 2 * margin),
                    y: margin + Math.random() * (quadrantSize - 2 * margin)
                };
                moveData.isMoving = true;
                moveData.moveTimer = 0;
            }
        }
    }

    applyMoveEffect(frame) {
        const newFrame = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        this.updateHummingbirdMovement();

        // Use current position from move data
        const currentPos = this.moveData.currentPos;

        // Apply scale and position based on movement
        const scaledSize = Math.floor(this.matrixSize * this.scale);
        const offsetX = currentPos.x - scaledSize / 2;
        const offsetY = currentPos.y - scaledSize / 2;

        for (let y = 0; y < scaledSize; y++) {
            for (let x = 0; x < scaledSize; x++) {
                const sourceX = Math.floor(x / this.scale);
                const sourceY = Math.floor(y / this.scale);
                const targetX = Math.floor(offsetX + x);
                const targetY = Math.floor(offsetY + y);

                if (sourceX >= 0 && sourceX < this.matrixSize &&
                    sourceY >= 0 && sourceY < this.matrixSize &&
                    targetX >= 0 && targetX < this.matrixSize &&
                    targetY >= 0 && targetY < this.matrixSize) {
                    newFrame[targetY][targetX] = frame[sourceY][sourceX];
                }
            }
        }

        return newFrame;
    }

    applyPollinationEffect(frame) {
        const newFrame = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        this.updatePollinationAnimation();

        const data = this.pollinationData;

        // Calculate flower position with wiggle effect
        const flowerX = data.flowerPos.x + data.flowerWiggle.x;
        const flowerY = data.flowerPos.y + data.flowerWiggle.y;

        // Draw static flower at final size
        this.drawFlowerAtPosition(newFrame, flowerX, flowerY, data.flowerScale);

        // Draw all active birds
        data.birds.forEach((bird, index) => {
            if (bird.phase !== 'waiting') {
                let drawOrder = 'normal'; // hummingbird on top

                if (bird.phase === 'flyIn' || bird.phase === 'pollinate') {
                    drawOrder = 'behind'; // hummingbird behind flower during fly in and pollination
                }

                if (drawOrder === 'behind') {
                    // Draw hummingbird first, then flower on top
                    this.drawColoredHummingbirdAtPosition(newFrame, frame, bird.position.x, bird.position.y, bird.scale, bird);
                    this.drawFlowerAtPosition(newFrame, flowerX, flowerY, data.flowerScale);
                } else {
                    // Draw hummingbird on top of flower
                    this.drawColoredHummingbirdAtPosition(newFrame, frame, bird.position.x, bird.position.y, bird.scale, bird);
                }
            }
        });

        return newFrame;
    }

    updatePollinationAnimation() {
        const data = this.pollinationData;
        data.timer++;

        // Reset timer if cycle is complete
        if (data.timer >= data.totalCycleDuration) {
            data.timer = 0;
            // Reset all birds
            data.birds.forEach(bird => {
                bird.phase = 'waiting';
                bird.timer = 0;
                bird.position.x = -15;
                bird.position.y = 22;
                bird.scale = 0.8; // Fix: Reset scale to prevent small birds
            });
        }

        // Update flower wiggle effect based on pollination activity
        data.pollinationActive = false;

        // Update each bird
        data.birds.forEach((bird, index) => {
            // Check if this bird should start its cycle
            if (bird.phase === 'waiting' && data.timer >= bird.startDelay) {
                bird.phase = 'flyIn';
                bird.timer = 0;
                bird.scale = 0.8; // Ensure proper scale when starting new cycle
            }

            if (bird.phase !== 'waiting') {
                bird.timer++;
                this.updateBirdPhase(bird, data);

                // Check if any bird is pollinating for flower wiggle
                if (bird.phase === 'pollinate') {
                    data.pollinationActive = true;
                }
            }
        });

        // Update flower wiggle based on pollination activity
        this.updateFlowerWiggle(data);
    }

    updateBirdPhase(bird, data) {
        const phaseDuration = data.animationDuration;

        if (bird.phase === 'flyIn') {
            // Bird flies in from left to flower
            const progress = bird.timer / phaseDuration.flyIn;
            bird.position.x = -15 + (43 + 15) * progress; // From -15 to pollination position (43, adjusted for flower move)
            bird.position.y = 44 + Math.sin(progress * Math.PI) * 3; // Slight arc to pollination position (44)

            if (bird.timer >= phaseDuration.flyIn) {
                bird.phase = 'pollinate';
                bird.timer = 0;
            }
        } else if (bird.phase === 'pollinate') {
            // Bird pollinates at flower with gentle movement
            const progress = bird.timer / phaseDuration.pollinate;
            bird.position.x = 43 + Math.sin(progress * Math.PI * 8) * 1.5; // Gentle side movement (adjusted for flower move)
            bird.position.y = 44 + Math.cos(progress * Math.PI * 10) * 0.8; // Gentle up/down movement

            if (bird.timer >= phaseDuration.pollinate) {
                bird.phase = 'flyOut';
                bird.timer = 0;
            }
        } else if (bird.phase === 'flyOut') {
            // Bird flies out to the top right middle
            const progress = bird.timer / phaseDuration.flyOut;
            const startX = 43; // Adjusted for flower move
            const startY = 44;
            const endX = this.matrixSize + 15; // Off screen right
            const endY = this.matrixSize * 0.25; // Top right middle area

            bird.position.x = startX + (endX - startX) * progress;
            bird.position.y = startY + (endY - startY) * progress; // Straight line to top right middle
            bird.scale = 0.8 * (1 - progress * 0.6); // Shrink as it flies away

            if (bird.timer >= phaseDuration.flyOut) {
                bird.phase = 'waiting';
                bird.timer = 0;
                bird.scale = 0.8; // Reset scale for next cycle
            }
        }
    }

    updateFlowerWiggle(data) {
        if (data.pollinationActive) {
            // Subtle wiggle when being pollinated
            const wiggleIntensity = 0.8;
            data.flowerWiggle.x = Math.sin(data.timer * 0.3) * wiggleIntensity;
            data.flowerWiggle.y = Math.cos(data.timer * 0.4) * (wiggleIntensity * 0.5);
        } else {
            // Very gentle movement when not being pollinated
            data.flowerWiggle.x = Math.sin(data.timer * 0.1) * 0.2;
            data.flowerWiggle.y = Math.cos(data.timer * 0.08) * 0.15;
        }
    }

    drawFlowerAtPosition(targetFrame, centerX, centerY, scale = 0.6) {
        if (!this.flowerFrame) return;

        const scaledSize = Math.floor(this.matrixSize * scale);
        const offsetX = centerX - scaledSize / 2;
        const offsetY = centerY - scaledSize / 2;

        for (let y = 0; y < scaledSize; y++) {
            for (let x = 0; x < scaledSize; x++) {
                const sourceX = Math.floor(x / scale);
                const sourceY = Math.floor(y / scale);
                const targetX = Math.floor(offsetX + x);
                const targetY = Math.floor(offsetY + y);

                if (sourceX >= 0 && sourceX < this.matrixSize &&
                    sourceY >= 0 && sourceY < this.matrixSize &&
                    targetX >= 0 && targetX < this.matrixSize &&
                    targetY >= 0 && targetY < this.matrixSize) {

                    const sourcePixel = this.flowerFrame[sourceY][sourceX];
                    if (sourcePixel.r > 0 || sourcePixel.g > 0 || sourcePixel.b > 0) {
                        targetFrame[targetY][targetX] = sourcePixel;
                    }
                }
            }
        }
    }


    drawHummingbirdAtPosition(targetFrame, sourceFrame, centerX, centerY, scale) {
        const scaledSize = Math.floor(this.matrixSize * scale);
        const offsetX = centerX - scaledSize / 2;
        const offsetY = centerY - scaledSize / 2;

        for (let y = 0; y < scaledSize; y++) {
            for (let x = 0; x < scaledSize; x++) {
                const sourceX = Math.floor(x / scale);
                const sourceY = Math.floor(y / scale);
                const targetX = Math.floor(offsetX + x);
                const targetY = Math.floor(offsetY + y);

                if (sourceX >= 0 && sourceX < this.matrixSize &&
                    sourceY >= 0 && sourceY < this.matrixSize &&
                    targetX >= 0 && targetX < this.matrixSize &&
                    targetY >= 0 && targetY < this.matrixSize) {

                    const sourcePixel = sourceFrame[sourceY][sourceX];
                    if (sourcePixel.r > 0 || sourcePixel.g > 0 || sourcePixel.b > 0) {
                        targetFrame[targetY][targetX] = sourcePixel;
                    }
                }
            }
        }
    }

    drawColoredHummingbirdAtPosition(targetFrame, sourceFrame, centerX, centerY, scale, bird) {
        const scaledSize = Math.floor(this.matrixSize * scale);
        const offsetX = centerX - scaledSize / 2;
        const offsetY = centerY - scaledSize / 2;

        for (let y = 0; y < scaledSize; y++) {
            for (let x = 0; x < scaledSize; x++) {
                const sourceX = Math.floor(x / scale);
                const sourceY = Math.floor(y / scale);
                const targetX = Math.floor(offsetX + x);
                const targetY = Math.floor(offsetY + y);

                if (sourceX >= 0 && sourceX < this.matrixSize &&
                    sourceY >= 0 && sourceY < this.matrixSize &&
                    targetX >= 0 && targetX < this.matrixSize &&
                    targetY >= 0 && targetY < this.matrixSize) {

                    const sourcePixel = sourceFrame[sourceY][sourceX];
                    if (sourcePixel.r > 0 || sourcePixel.g > 0 || sourcePixel.b > 0) {
                        // Apply color transformation based on bird's hue
                        const coloredPixel = this.applyHueShift(sourcePixel, bird.hue, bird.saturation, bird.brightness);
                        targetFrame[targetY][targetX] = coloredPixel;
                    }
                }
            }
        }
    }

    applyHueShift(pixel, hue, saturation, brightness) {
        // Convert RGB to HSL, apply hue shift, convert back to RGB
        const r = pixel.r / 255;
        const g = pixel.g / 255;
        const b = pixel.b / 255;

        // Convert RGB to HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = 0;
        if (delta !== 0) {
            if (max === r) h = ((g - b) / delta) % 6;
            else if (max === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
        }
        h = (h * 60 + hue) % 360;
        if (h < 0) h += 360;

        const l = (max + min) / 2;
        const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

        // Apply saturation and brightness modifications
        const finalS = Math.min(1, s * saturation);
        const finalL = Math.min(1, l * brightness);

        // Convert HSL back to RGB
        const c = (1 - Math.abs(2 * finalL - 1)) * finalS;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = finalL - c / 2;

        let newR, newG, newB;
        if (h < 60) { newR = c; newG = x; newB = 0; }
        else if (h < 120) { newR = x; newG = c; newB = 0; }
        else if (h < 180) { newR = 0; newG = c; newB = x; }
        else if (h < 240) { newR = 0; newG = x; newB = c; }
        else if (h < 300) { newR = x; newG = 0; newB = c; }
        else { newR = c; newG = 0; newB = x; }

        return {
            r: Math.floor((newR + m) * 255),
            g: Math.floor((newG + m) * 255),
            b: Math.floor((newB + m) * 255)
        };
    }

    updateHummingbirdMovement() {
        if (this.moveData.isMoving) {
            // Moving towards target
            this.moveData.moveTimer++;
            const progress = Math.min(this.moveData.moveTimer / 3, 1); // 3 frames to complete move

            // Ease-out interpolation for quick movement
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            this.moveData.currentPos.x = this.moveData.currentPos.x +
                (this.moveData.targetPos.x - this.moveData.currentPos.x) * 0.8;
            this.moveData.currentPos.y = this.moveData.currentPos.y +
                (this.moveData.targetPos.y - this.moveData.currentPos.y) * 0.8;

            if (progress >= 1) {
                this.moveData.currentPos.x = this.moveData.targetPos.x;
                this.moveData.currentPos.y = this.moveData.targetPos.y;
                this.moveData.isMoving = false;
                this.moveData.moveTimer = 0;
                this.moveData.pauseTimer = 0;
            }
        } else {
            // Pausing/hovering
            this.moveData.pauseTimer++;

            // Add slight hovering motion
            const hover = Math.sin(this.moveData.pauseTimer * 0.3) * 1.5;
            this.moveData.currentPos.y = this.moveData.targetPos.y + hover;

            // Random pause duration between 10-30 frames
            const pauseDuration = 15 + Math.random() * 15;

            if (this.moveData.pauseTimer > pauseDuration) {
                // Choose new random target position
                const margin = Math.floor(this.matrixSize * this.scale / 2) + 5;
                this.moveData.targetPos = {
                    x: margin + Math.random() * (this.matrixSize - 2 * margin),
                    y: margin + Math.random() * (this.matrixSize - 2 * margin)
                };
                this.moveData.isMoving = true;
                this.moveData.moveTimer = 0;
            }
        }
    }


    resetMoveData() {
        this.moveData = {
            currentPos: { x: 32, y: 32 },
            targetPos: { x: 32, y: 32 },
            moveTimer: 0,
            pauseTimer: 0,
            isMoving: false
        };
    }

    applySwarmEffect(frame) {
        const newFrame = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        const time = Date.now() / 1000;
        const numBirds = Math.min(this.maxSwarmBirds, this.matrixSize === 32 ? this.maxSwarmBirds : this.maxSwarmBirds);
        const extendedSize = this.matrixSize * 1.5; // Extended area for entering/exiting

        // Initialize bird data if not exists
        if (!this.swarmBirds) {
            this.initializeSwarmBirds(numBirds, extendedSize);
        }

        for (let bird = 0; bird < numBirds; bird++) {
            const birdData = this.swarmBirds[bird];
            this.updateBirdMovement(birdData, time, extendedSize);

            // Scale varies with distance simulation and individual properties
            const baseScale = 0.2 + Math.sin(time * 3 + birdData.phase) * 0.15;
            const scale = (this.matrixSize === 32) ? baseScale * 1.3 : baseScale;

            this.drawBirdWithColorMod(frame, newFrame, birdData.x, birdData.y, scale * birdData.sizeVariation, bird, time);
        }

        return newFrame;
    }

    initializeSwarmBirds(numBirds, extendedSize) {
        this.swarmBirds = [];

        for (let i = 0; i < numBirds; i++) {
            // Create a good spread of speeds across the range for dramatic visual differences
            let birdSpeed;
            if (numBirds === 1) {
                birdSpeed = (this.swarmMinSpeed + this.swarmMaxSpeed) / 2; // Middle speed for single bird
            } else {
                // Distribute birds evenly across speed range for maximum visual contrast
                const speedRange = this.swarmMaxSpeed - this.swarmMinSpeed;
                birdSpeed = this.swarmMinSpeed + (i / (numBirds - 1)) * speedRange;
            }
            const clampedSpeed = Math.max(this.swarmMinSpeed, Math.min(this.swarmMaxSpeed, birdSpeed));

            // Debug bird speed assignment
            console.log(`🐦 Creating bird ${i}: baseSpeed=${clampedSpeed.toFixed(3)}, sliderRange=${this.swarmMinSpeed.toFixed(2)}-${this.swarmMaxSpeed.toFixed(2)}`);

            this.swarmBirds.push({
                // Movement properties
                direction: i % 4, // 0=L→R, 1=R→L, 2=T→B, 3=B→T
                baseSpeed: clampedSpeed, // Properly clamped speed
                currentSpeed: 1.0,
                phase: (i / numBirds) * Math.PI * 2 + Math.random() * Math.PI,

                // Position
                x: 0,
                y: 0,

                // Lingering behavior
                canLinger: Math.random() < 0.4, // 40% of birds can linger
                isLingering: false,
                lingerTimer: 0,
                lingerDuration: 2 + Math.random() * 4, // 2-6 seconds
                lingerCooldown: 0,

                // Visual properties
                sizeVariation: this.swarmMinSize + Math.random() * (this.swarmMaxSize - this.swarmMinSize), // Random size between min and max

                // Trajectory variations
                wobbleAmount: 0.2 + Math.random() * 0.3, // 0.2-0.5
                wobbleSpeed: 1.0 + Math.random() * 1.5,  // 1.0-2.5

                // Cycle tracking
                cycleStartTime: Math.random() * 100, // Random start offset
            });
        }
    }

    initializeSplitSwarmBirds(totalBirds) {
        this.splitSwarmBirds = [];

        for (let i = 0; i < totalBirds; i++) {
            // Create dramatic speed spread for split swarm as well
            let birdSpeed;
            if (totalBirds === 1) {
                birdSpeed = (this.swarmMinSpeed + this.swarmMaxSpeed) / 2;
            } else {
                const speedRange = this.swarmMaxSpeed - this.swarmMinSpeed;
                birdSpeed = this.swarmMinSpeed + (i / (totalBirds - 1)) * speedRange;
            }
            const clampedSpeed = Math.max(this.swarmMinSpeed, Math.min(this.swarmMaxSpeed, birdSpeed));

            this.splitSwarmBirds.push({
                // Movement properties
                direction: i % 4, // 0=L→R, 1=R→L, 2=T→B, 3=B→T
                baseSpeed: clampedSpeed,
                phase: (i / totalBirds) * Math.PI * 2 + Math.random() * Math.PI,

                // Visual properties
                sizeVariation: this.swarmMinSize + Math.random() * (this.swarmMaxSize - this.swarmMinSize),

                // Cycle tracking
                cycleStartTime: Math.random() * 100,
            });
        }
    }

    updateBirdMovement(bird, time, extendedSize) {
        // Initialize continuous tracking if not exists
        if (bird.continuousProgress === undefined) {
            bird.continuousProgress = Math.random(); // 0 to 1 progress through trajectory
            bird.totalDistance = 0; // Track total distance for debugging
        }

        // Handle lingering behavior
        if (bird.isLingering) {
            bird.lingerTimer += 0.016; // Approximate frame time
            // Lingering speed should be much slower than normal, but relative to speed range
            const lingerBase = this.swarmMinSpeed * 0.3; // 30% of minimum speed
            bird.currentSpeed = lingerBase + Math.sin(bird.lingerTimer * 2) * lingerBase * 0.5; // Gentle variation

            if (bird.lingerTimer >= bird.lingerDuration) {
                bird.isLingering = false;
                bird.lingerTimer = 0;
                bird.lingerCooldown = 3 + Math.random() * 5; // 3-8 second cooldown
            }
        } else {
            // Normal movement speed - ensure it stays within bounds
            bird.currentSpeed = Math.max(this.swarmMinSpeed, Math.min(this.swarmMaxSpeed, bird.baseSpeed));

            // Check if bird should start lingering (only when in visible area)
            if (bird.canLinger && bird.lingerCooldown <= 0) {
                const inVisibleArea = (bird.x >= -this.matrixSize * 0.2 && bird.x <= this.matrixSize * 1.2 &&
                    bird.y >= -this.matrixSize * 0.2 && bird.y <= this.matrixSize * 1.2);

                if (inVisibleArea && Math.random() < 0.002) { // Small chance each frame
                    bird.isLingering = true;
                    bird.lingerTimer = 0;
                }
            }

            if (bird.lingerCooldown > 0) {
                bird.lingerCooldown -= 0.016;
            }
        }

        // Calculate truly smooth continuous movement
        const effectiveSpeed = Math.max(0.01, Math.min(4.0, bird.currentSpeed)); // Hard clamp speed - allow very slow speeds
        const trajectoryRange = extendedSize + extendedSize / 2;

        // Convert speed to progress increment with slower baseline speed
        const speedMultiplier = 0.5; // User requested slower baseline speed (was 8.0)
        const progressPerFrame = (effectiveSpeed * speedMultiplier) / trajectoryRange;

        // Enhanced debug logging to identify slider issues
        if (Math.random() < 0.01) { // More frequent logging during debugging
            console.log(`🐦 Speed Debug: baseSpeed=${bird.baseSpeed.toFixed(3)}, currentSpeed=${bird.currentSpeed.toFixed(3)}, effectiveSpeed=${effectiveSpeed.toFixed(3)}, progressPerFrame=${progressPerFrame.toFixed(6)}, sliderRange=${this.swarmMinSpeed.toFixed(2)}-${this.swarmMaxSpeed.toFixed(2)}`);
        }

        // Update continuous progress (always smooth, no jumps possible)
        bird.continuousProgress += progressPerFrame;

        // Wrap progress smoothly (this never causes jumps since we use it directly)
        if (bird.continuousProgress >= 1.0) {
            bird.continuousProgress -= 1.0;
        }

        // Calculate smooth position using continuous progress (0 to 1)
        const smoothPosition = bird.continuousProgress * trajectoryRange;

        const cycleTime = time + bird.cycleStartTime;

        // Generate wobble based on controlled time values
        const wobble = Math.sin(cycleTime * bird.wobbleSpeed) * bird.wobbleAmount * this.matrixSize;

        if (bird.direction === 0) {
            // Left to right sweep - smooth continuous position
            bird.x = -extendedSize / 4 + smoothPosition;
            bird.y = this.matrixSize * 0.2 + Math.sin(cycleTime * 1.8 + bird.phase) * this.matrixSize * 0.5 + wobble * 0.3;
        } else if (bird.direction === 1) {
            // Right to left sweep
            bird.x = extendedSize + extendedSize / 4 - smoothPosition;
            bird.y = this.matrixSize * 0.3 + Math.cos(cycleTime * 1.6 + bird.phase) * this.matrixSize * 0.4 + wobble * 0.4;
        } else if (bird.direction === 2) {
            // Top to bottom dive
            bird.y = -extendedSize / 4 + smoothPosition;
            bird.x = this.matrixSize * 0.4 + Math.sin(cycleTime * 1.4 + bird.phase) * this.matrixSize * 0.3 + wobble * 0.2;
        } else {
            // Bottom to top rise
            bird.y = extendedSize + extendedSize / 4 - smoothPosition;
            bird.x = this.matrixSize * 0.6 + Math.cos(cycleTime * 2.0 + bird.phase) * this.matrixSize * 0.25 + wobble * 0.3;
        }

        // Track total distance for debugging
        bird.totalDistance += effectiveSpeed * speedMultiplier;

        // Debug position changes occasionally
        if (Math.random() < 0.005) { // Log position changes
            console.log(`🎯 Bird movement: dir=${bird.direction}, progress=${bird.continuousProgress.toFixed(4)}, x=${bird.x.toFixed(1)}, y=${bird.y.toFixed(1)}, speed=${effectiveSpeed.toFixed(3)}`);
        }
    }

    applySplitSwarmEffect(frame) {
        const newFrame = Array(this.matrixSize).fill().map(() =>
            Array(this.matrixSize).fill({ r: 0, g: 0, b: 0 })
        );

        const time = Date.now() / 1000;
        const quadrantSize = this.matrixSize / 2;
        const numBirdsPerQuadrant = Math.max(1, Math.floor(this.maxSwarmBirds / 4));
        const totalBirds = numBirdsPerQuadrant * 4;

        // Initialize split swarm birds if not exists
        if (!this.splitSwarmBirds) {
            this.initializeSplitSwarmBirds(totalBirds);
        }

        // Define the 4 quadrant offsets
        const quadrants = [
            { offsetX: 0, offsetY: 0 },                    // Top-left
            { offsetX: quadrantSize, offsetY: 0 },         // Top-right
            { offsetX: 0, offsetY: quadrantSize },         // Bottom-left
            { offsetX: quadrantSize, offsetY: quadrantSize } // Bottom-right
        ];

        quadrants.forEach((quadrant, quadIndex) => {
            for (let bird = 0; bird < numBirdsPerQuadrant; bird++) {
                const birdId = quadIndex * numBirdsPerQuadrant + bird;
                const birdData = this.splitSwarmBirds[birdId];

                // Use conservative base speed multiplier that respects user settings
                const baseSpeedMultiplier = 1.2; // Slightly increased for visibility

                let centerX, centerY;

                // Edge-to-edge movement within each quadrant using persistent bird data
                const speed = Math.max(this.swarmMinSpeed, Math.min(this.swarmMaxSpeed, birdData.baseSpeed));
                const phase = birdData.phase;

                // Initialize continuous progress tracking if not exists
                if (birdData.continuousProgress === undefined) {
                    birdData.continuousProgress = Math.random(); // 0 to 1 progress
                }

                // Update continuous progress with controlled speed
                const effectiveSpeed = Math.max(0.01, Math.min(4.0, speed));

                let trajectoryRange;
                if (bird % 4 === 0 || bird % 4 === 1) {
                    // Horizontal movement
                    trajectoryRange = quadrantSize + 20;
                } else {
                    // Vertical movement
                    trajectoryRange = quadrantSize + 16;
                }

                // Convert speed to progress increment with dramatic speed differences  
                const speedMultiplier = 0.5; // Match the regular swarm speed
                const progressPerFrame = (effectiveSpeed * speedMultiplier) / trajectoryRange;

                // Update continuous progress (always smooth)
                birdData.continuousProgress += progressPerFrame;

                // Wrap progress smoothly
                if (birdData.continuousProgress >= 1.0) {
                    birdData.continuousProgress -= 1.0;
                }

                // Calculate smooth position using continuous progress
                const smoothPosition = birdData.continuousProgress * trajectoryRange;

                if (bird % 4 === 0) {
                    // Left to right within quadrant
                    centerX = quadrant.offsetX - 10 + smoothPosition;
                    centerY = quadrant.offsetY + quadrantSize * 0.3 + Math.sin(time * 2 + phase) * quadrantSize * 0.4;
                } else if (bird % 4 === 1) {
                    // Right to left within quadrant
                    centerX = quadrant.offsetX + quadrantSize + 10 - smoothPosition;
                    centerY = quadrant.offsetY + quadrantSize * 0.7 + Math.cos(time * 1.8 + phase) * quadrantSize * 0.2;
                } else if (bird % 4 === 2) {
                    // Top to bottom within quadrant
                    centerY = quadrant.offsetY - 8 + smoothPosition;
                    centerX = quadrant.offsetX + quadrantSize * 0.5 + Math.sin(time * 1.5 + phase) * quadrantSize * 0.3;
                } else {
                    // Bottom to top within quadrant
                    centerY = quadrant.offsetY + quadrantSize + 8 - smoothPosition;
                    centerX = quadrant.offsetX + quadrantSize * 0.3 + Math.cos(time * 2.2 + phase) * quadrantSize * 0.4;
                }

                const scale = (0.15 + Math.sin(time * 3 + phase) * 0.08) * birdData.sizeVariation;
                if (this.matrixSize === 32) scale *= 1.2;

                // Clip to quadrant and draw
                this.drawBirdClippedToQuadrant(frame, newFrame, centerX, centerY, scale, birdId, time, quadrant, quadrantSize);
            }
        });

        return newFrame;
    }

    drawBirdWithColorMod(sourceFrame, targetFrame, centerX, centerY, scale, birdId, time) {
        for (let y = 0; y < this.matrixSize; y++) {
            for (let x = 0; x < this.matrixSize; x++) {
                const sourceX = Math.floor((x - centerX) / scale + this.matrixSize / 2);
                const sourceY = Math.floor((y - centerY) / scale + this.matrixSize / 2);

                if (sourceX >= 0 && sourceX < this.matrixSize &&
                    sourceY >= 0 && sourceY < this.matrixSize &&
                    sourceFrame[sourceY][sourceX].r > 0) {

                    // Only overwrite if target pixel is empty to avoid overlapping
                    if (targetFrame[y][x].r === 0 && targetFrame[y][x].g === 0 && targetFrame[y][x].b === 0) {
                        let r = sourceFrame[sourceY][sourceX].r;
                        let g = sourceFrame[sourceY][sourceX].g;
                        let b = sourceFrame[sourceY][sourceX].b;

                        // Apply different color modifications based on bird ID
                        const modType = birdId % 6;

                        if (modType === 0) {
                            // Hue shift towards red
                            r = Math.min(255, Math.max(30, r * 1.3));
                            g = Math.max(20, Math.floor(g * 0.7));
                            b = Math.max(20, Math.floor(b * 0.6));
                        } else if (modType === 1) {
                            // Hue shift towards blue  
                            r = Math.max(20, Math.floor(r * 0.6));
                            g = Math.max(20, Math.floor(g * 0.8));
                            b = Math.min(255, Math.max(30, b * 1.4));
                        } else if (modType === 2) {
                            // Hue shift towards purple/magenta
                            r = Math.min(255, Math.max(30, r * 1.2));
                            g = Math.max(20, Math.floor(g * 0.7));
                            b = Math.min(255, Math.max(30, b * 1.3));
                        } else if (modType === 3) {
                            // Hue shift towards green/yellow
                            r = Math.min(240, Math.max(25, r * 1.1));
                            g = Math.min(255, Math.max(30, g * 1.3));
                            b = Math.max(20, Math.floor(b * 0.6));
                        } else if (modType === 4) {
                            // Increase saturation and brightness
                            r = Math.min(240, Math.max(25, r * 1.2));
                            g = Math.min(240, Math.max(25, g * 1.2));
                            b = Math.min(240, Math.max(25, b * 1.2));
                        } else {
                            // Swap color channels (ensure minimum values)
                            const temp = Math.max(20, r);
                            r = Math.max(20, b);
                            b = Math.max(20, g);
                            g = temp;
                        }

                        targetFrame[y][x] = { r: Math.floor(r), g: Math.floor(g), b: Math.floor(b) };
                    }
                }
            }
        }
    }

    drawBirdClippedToQuadrant(sourceFrame, targetFrame, centerX, centerY, scale, birdId, time, quadrant, quadrantSize) {
        for (let y = 0; y < this.matrixSize; y++) {
            for (let x = 0; x < this.matrixSize; x++) {
                // Only draw within this quadrant
                if (x >= quadrant.offsetX && x < quadrant.offsetX + quadrantSize &&
                    y >= quadrant.offsetY && y < quadrant.offsetY + quadrantSize) {

                    const sourceX = Math.floor((x - centerX) / scale + this.matrixSize / 2);
                    const sourceY = Math.floor((y - centerY) / scale + this.matrixSize / 2);

                    if (sourceX >= 0 && sourceX < this.matrixSize &&
                        sourceY >= 0 && sourceY < this.matrixSize &&
                        sourceFrame[sourceY][sourceX].r > 0) {

                        // Only overwrite if target pixel is empty
                        if (targetFrame[y][x].r === 0 && targetFrame[y][x].g === 0 && targetFrame[y][x].b === 0) {
                            let r = sourceFrame[sourceY][sourceX].r;
                            let g = sourceFrame[sourceY][sourceX].g;
                            let b = sourceFrame[sourceY][sourceX].b;

                            // Apply color modifications
                            const modType = birdId % 6;
                            if (modType === 0) {
                                r = Math.min(255, r * 1.3); g = Math.floor(g * 0.7); b = Math.floor(b * 0.6);
                            } else if (modType === 1) {
                                r = Math.floor(r * 0.6); g = Math.floor(g * 0.8); b = Math.min(255, b * 1.4);
                            } else if (modType === 2) {
                                // Hue shift towards purple/magenta
                                r = Math.min(255, r * 1.2); g = Math.floor(g * 0.7); b = Math.min(255, b * 1.3);
                            } else if (modType === 3) {
                                // Hue shift towards green/yellow
                                r = Math.min(255, r * 1.1); g = Math.min(255, g * 1.3); b = Math.floor(b * 0.6);
                            } else if (modType === 4) {
                                r = Math.min(255, r * 1.2); g = Math.min(255, g * 1.2); b = Math.min(255, b * 1.2);
                            } else {
                                const temp = r; r = b; b = g; g = temp;
                            }

                            targetFrame[y][x] = { r: Math.floor(r), g: Math.floor(g), b: Math.floor(b) };
                        }
                    }
                }
            }
        }
    }

    drawBirdAtPosition(sourceFrame, targetFrame, centerX, centerY, scale, birdId, time) {
        // Use the color modification version for consistency
        this.drawBirdWithColorMod(sourceFrame, targetFrame, centerX, centerY, scale, birdId, time);
    }

    renderMatrix() {
        const leds = document.querySelectorAll('.led');

        leds.forEach((led, index) => {
            const x = index % this.matrixSize;
            const y = Math.floor(index / this.matrixSize);
            const pixel = this.matrix[y][x];

            if (pixel.r > 0 || pixel.g > 0 || pixel.b > 0) {
                led.classList.add('on');
                let color = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`;

                led.style.backgroundColor = color;
                led.style.color = color;
            } else {
                led.classList.remove('on');
                led.style.backgroundColor = '#000';
                led.style.color = '#000';
            }
        });

        // Note: Breathing effect is now handled through scale changes in applyScaleAndPosition
    }

    hslToRgb(h, s, l) {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h * 12) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color);
        };
        return { r: f(0), g: f(8), b: f(4) };
    }

    setupEventListeners() {
        // Animation controls
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());

        // Panel size control
        const panelSizeSelect = document.getElementById('panelSize');
        panelSizeSelect.addEventListener('change', (e) => {
            this.changeMatrixSize(parseInt(e.target.value));
            const sizeText = `${e.target.value}x${e.target.value}`;
            document.getElementById('panelSizeValue').textContent = sizeText;
            document.title = `${sizeText} LED Panel Simulator - Hummingbird`;
        });

        // Speed control
        const speedSlider = document.getElementById('speedSlider');
        speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = `${this.animationSpeed}ms`;
            // Reset timing to prevent glitches when changing speed
            if (this.isPlaying) {
                this.lastFrameTime = performance.now();
            }
        });

        // Size control
        const sizeSlider = document.getElementById('sizeSlider');
        sizeSlider.addEventListener('change', (e) => {
            this.scale = parseInt(e.target.value) / 100;
            document.getElementById('sizeValue').textContent = `${e.target.value}%`;
            this.displayFrame(this.currentFrame);
        });

        // Swarm speed controls
        const swarmMinSpeedSlider = document.getElementById('swarmMinSpeed');
        swarmMinSpeedSlider.addEventListener('input', (e) => {
            this.swarmMinSpeed = parseFloat(e.target.value);
            document.getElementById('swarmMinSpeedValue').textContent = `${this.swarmMinSpeed}x`;

            // Ensure min speed doesn't exceed max speed
            if (this.swarmMinSpeed >= this.swarmMaxSpeed) {
                this.swarmMaxSpeed = this.swarmMinSpeed + 0.01;
                document.getElementById('swarmMaxSpeed').value = this.swarmMaxSpeed;
                document.getElementById('swarmMaxSpeedValue').textContent = `${this.swarmMaxSpeed}x`;
            }

            // Force complete regeneration of birds with new speeds for immediate visual feedback
            if (this.effects.swarm) {
                console.log(`🔄 SLIDER CHANGE: Min speed changed to ${this.swarmMinSpeed}x! Range now: ${this.swarmMinSpeed}x to ${this.swarmMaxSpeed}x`);
                console.log(`🔄 Forcing bird regeneration...`);
                this.swarmBirds = null; // Force regeneration
                // Also reset split swarm birds if split+swarm is active
                if (this.effects.split) {
                    this.splitSwarmBirds = null;
                }
            }
        });

        const swarmMaxSpeedSlider = document.getElementById('swarmMaxSpeed');
        swarmMaxSpeedSlider.addEventListener('input', (e) => {
            this.swarmMaxSpeed = parseFloat(e.target.value);
            document.getElementById('swarmMaxSpeedValue').textContent = `${this.swarmMaxSpeed}x`;

            // Ensure max speed doesn't go below min speed
            if (this.swarmMaxSpeed <= this.swarmMinSpeed) {
                this.swarmMinSpeed = Math.max(0.01, this.swarmMaxSpeed - 0.01);
                document.getElementById('swarmMinSpeed').value = this.swarmMinSpeed;
                document.getElementById('swarmMinSpeedValue').textContent = `${this.swarmMinSpeed}x`;
            }

            // Force complete regeneration of birds with new speeds for immediate visual feedback
            if (this.effects.swarm) {
                console.log(`🔄 SLIDER CHANGE: Max speed changed to ${this.swarmMaxSpeed}x! Range now: ${this.swarmMinSpeed}x to ${this.swarmMaxSpeed}x`);
                console.log(`🔄 Forcing bird regeneration...`);
                this.swarmBirds = null; // Force regeneration
                // Also reset split swarm birds if split+swarm is active
                if (this.effects.split) {
                    this.splitSwarmBirds = null;
                }
            }
        });

        // Swarm size controls
        const swarmMinSizeSlider = document.getElementById('swarmMinSize');
        swarmMinSizeSlider.addEventListener('input', (e) => {
            this.swarmMinSize = parseFloat(e.target.value);
            document.getElementById('swarmMinSizeValue').textContent = `${this.swarmMinSize}x`;

            // Ensure min size doesn't exceed max size
            if (this.swarmMinSize >= this.swarmMaxSize) {
                this.swarmMaxSize = this.swarmMinSize + 0.1;
                document.getElementById('swarmMaxSize').value = this.swarmMaxSize;
                document.getElementById('swarmMaxSizeValue').textContent = `${this.swarmMaxSize}x`;
            }

            // Regenerate swarm birds with new sizes if swarm is active
            if (this.effects.swarm) {
                this.swarmBirds = null;
                // Also reset split swarm birds if split+swarm is active
                if (this.effects.split) {
                    this.splitSwarmBirds = null;
                }
            }
        });

        const swarmMaxSizeSlider = document.getElementById('swarmMaxSize');
        swarmMaxSizeSlider.addEventListener('input', (e) => {
            this.swarmMaxSize = parseFloat(e.target.value);
            document.getElementById('swarmMaxSizeValue').textContent = `${this.swarmMaxSize}x`;

            // Ensure max size doesn't go below min size
            if (this.swarmMaxSize <= this.swarmMinSize) {
                this.swarmMinSize = this.swarmMaxSize - 0.1;
                document.getElementById('swarmMinSize').value = this.swarmMinSize;
                document.getElementById('swarmMinSizeValue').textContent = `${this.swarmMinSize}x`;
            }

            // Regenerate swarm birds with new sizes if swarm is active
            if (this.effects.swarm) {
                this.swarmBirds = null;
                // Also reset split swarm birds if split+swarm is active
                if (this.effects.split) {
                    this.splitSwarmBirds = null;
                }
            }
        });

        // Max birds control
        const maxSwarmBirdsSlider = document.getElementById('maxSwarmBirds');
        maxSwarmBirdsSlider.addEventListener('input', (e) => {
            this.maxSwarmBirds = parseInt(e.target.value);
            document.getElementById('maxSwarmBirdsValue').textContent = `${this.maxSwarmBirds}`;

            // Regenerate swarm birds with new count if swarm is active
            if (this.effects.swarm) {
                this.swarmBirds = null;
                // Also reset split swarm birds if split+swarm is active
                if (this.effects.split) {
                    this.splitSwarmBirds = null;
                }
            }
        });

        // Effect buttons
        document.getElementById('splitBtn').addEventListener('click', () => this.toggleEffect('split'));
        document.getElementById('swarmBtn').addEventListener('click', () => this.toggleEffect('swarm'));
        document.getElementById('moveBtn').addEventListener('click', () => this.toggleEffect('move'));
        document.getElementById('breatheBtn').addEventListener('click', () => this.toggleEffect('breathing'));
        document.getElementById('pollinationBtn').addEventListener('click', () => this.toggleEffect('pollination'));

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => this.exportFrameData());
    }

    updateControls() {
        const container = document.querySelector('.control-panel');
        if (this.isPlaying) {
            container.className = 'control-panel status-playing';
        } else {
            container.className = 'control-panel status-paused';
        }
    }

    play() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this.updateControls();

        const animate = (currentTime) => {
            if (!this.isPlaying) return;

            // Check if enough time has passed for the next frame
            const deltaTime = currentTime - this.lastFrameTime;

            if (deltaTime >= this.animationSpeed) {
                this.displayFrame(this.currentFrame);
                this.currentFrame = (this.currentFrame + 1) % this.frames.length;
                this.lastFrameTime = currentTime;
            }

            this.animationId = requestAnimationFrame(animate);
        };

        this.animationId = requestAnimationFrame(animate);
    }

    pause() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.updateControls();
    }

    reset() {
        this.pause();
        this.currentFrame = 0;
        this.displayFrame(0);
        this.updateControls();
    }

    toggleEffect(effectName) {
        // Handle effect combinations
        if (effectName === 'pollination') {
            // Pollination is exclusive - disable other effects
            this.effects.split = false;
            this.effects.swarm = false;
            this.effects.move = false;
            this.effects[effectName] = !this.effects[effectName];
            if (this.effects.pollination) {
                // Reset pollination animation to start from beginning
                this.pollinationData.timer = 0;
                this.pollinationData.birds.forEach(bird => {
                    bird.phase = 'waiting';
                    bird.timer = 0;
                    bird.position.x = -15;
                    bird.position.y = 22;
                    bird.scale = 0.8;
                });
            }
        } else if (effectName === 'move') {
            // Move can work with split, but not with swarm or pollination
            this.effects.swarm = false;
            this.effects.pollination = false;
            this.effects[effectName] = !this.effects[effectName];
            if (this.effects.move) {
                this.resetMoveData();
            }
        } else if (effectName === 'swarm') {
            // Swarm can work with split, but not with move or pollination
            this.effects.move = false;
            this.effects.pollination = false;
            this.effects[effectName] = !this.effects[effectName];
            // Reset swarm birds to get new random speeds/behaviors
            this.swarmBirds = null;
            // Also reset split swarm birds if split is active
            if (this.effects.split) {
                this.splitSwarmBirds = null;
            }
        } else {
            // Split and breathing can combine with any effect except pollination
            if (effectName === 'split' || effectName === 'breathing') {
                this.effects.pollination = false;
            }
            this.effects[effectName] = !this.effects[effectName];

            // Reset split swarm birds when split effect is toggled and swarm is active
            if (effectName === 'split' && this.effects.swarm) {
                this.splitSwarmBirds = null;
            }
        }

        // Reset quadrant move data when enabling split + move
        if (effectName === 'split' && this.effects.split && this.effects.move) {
            this.quadrantMoveData = null;
        }

        // Update button states
        const buttons = document.querySelectorAll('.effect-btn');
        buttons.forEach(btn => {
            const effect = btn.id.replace('Btn', '');
            if (this.effects[effect]) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.displayFrame(this.currentFrame);
    }

    exportFrameData() {
        const frameData = {
            frame: this.currentFrame,
            timestamp: Date.now(),
            matrix: this.matrix.map(row =>
                row.map(pixel => ({
                    r: pixel.r,
                    g: pixel.g,
                    b: pixel.b,
                    on: pixel.r > 0 || pixel.g > 0 || pixel.b > 0
                }))
            )
        };

        // Arduino-compatible format
        let arduinoCode = `// Frame ${this.currentFrame + 1} - Generated at ${new Date().toLocaleString()}\n`;
        arduinoCode += `// Matrix size: ${this.matrixSize}x${this.matrixSize}\n\n`;

        arduinoCode += `const uint8_t frame${this.currentFrame + 1}_data_${this.matrixSize}x${this.matrixSize}[${this.matrixSize}][${this.matrixSize}][3] = {\n`;

        for (let y = 0; y < this.matrixSize; y++) {
            arduinoCode += '  {\n';
            for (let x = 0; x < this.matrixSize; x++) {
                const pixel = this.matrix[y][x];
                arduinoCode += `    {${pixel.r}, ${pixel.g}, ${pixel.b}}`;
                if (x < this.matrixSize - 1) arduinoCode += ',';
                arduinoCode += '\n';
            }
            arduinoCode += '  }';
            if (y < this.matrixSize - 1) arduinoCode += ',';
            arduinoCode += '\n';
        }

        arduinoCode += '};\n';

        document.getElementById('exportData').value = arduinoCode;
        console.log('Frame data exported', frameData);
    }

    // Debug method to monitor bird speeds (available in console)
    debugBirdSpeeds() {
        if (!this.effects.swarm) {
            console.log('❌ Swarm mode is not active - enable swarm mode first!');
            return;
        }

        console.log('\\n🐦 BIRD SPEED DEBUG REPORT:');
        console.log('============================');
        console.log(`⚙️ Settings: Min=${this.swarmMinSpeed}x, Max=${this.swarmMaxSpeed}x, Max Birds=${this.maxSwarmBirds}`);
        console.log('');

        if (this.swarmBirds && this.swarmBirds.length > 0) {
            console.log('🔍 Regular swarm birds:');
            this.swarmBirds.forEach((bird, i) => {
                const pixelsPerSec = bird.currentSpeed ? ((bird.currentSpeed * 0.5) / 144) * 144 * 60 : 0;
                console.log(`  Bird ${i}: baseSpeed=${bird.baseSpeed.toFixed(3)}, currentSpeed=${bird.currentSpeed.toFixed(3)}, ~${pixelsPerSec.toFixed(1)}px/s, pos=(${bird.x ? bird.x.toFixed(1) : 'N/A'},${bird.y ? bird.y.toFixed(1) : 'N/A'})`);
            });

            // Calculate expected speed differences
            const speeds = this.swarmBirds.map(bird => bird.baseSpeed);
            const minSpeed = Math.min(...speeds);
            const maxSpeed = Math.max(...speeds);
            const ratio = maxSpeed / minSpeed;
            console.log('');
            console.log(`📊 Speed Analysis:`);
            console.log(`   Slowest bird: ${minSpeed.toFixed(3)}x`);
            console.log(`   Fastest bird: ${maxSpeed.toFixed(3)}x`);
            console.log(`   Speed ratio: ${ratio.toFixed(1)}x (should be >2 for visible differences)`);

            if (ratio < 2) {
                console.log('⚠️  Speed differences may be too subtle - try wider slider range!');
            } else {
                console.log('✅ Speed differences should be clearly visible');
            }
        } else {
            console.log('❌ No swarm birds found - they may not be initialized yet');
        }

        if (this.splitSwarmBirds && this.effects.split) {
            console.log('\\n🔍 Split swarm birds:');
            this.splitSwarmBirds.forEach((bird, i) => {
                console.log(`  Split Bird ${i}: baseSpeed=${bird.baseSpeed.toFixed(3)}, progress=${bird.continuousProgress ? bird.continuousProgress.toFixed(3) : 'N/A'}`);
            });
        }

        console.log('\\n💡 To test slider functionality:');
        console.log('   1. Move speed sliders and watch for regeneration messages');
        console.log('   2. Call debugBirdSpeeds() again to see new speeds');
        console.log('   3. Look for speed differences in bird movement');
    }

    // Additional debug method to track bird movements over time
    debugBirdMovement() {
        if (!this.effects.swarm || !this.swarmBirds) {
            console.log('Swarm mode is not active or no birds exist');
            return;
        }

        console.log('🔍 Detailed Bird Movement Tracking:');
        const extendedSize = this.matrixSize * 1.5;
        const time = Date.now() / 1000;

        // Store original positions
        const originalPositions = this.swarmBirds.map(bird => ({ x: bird.x, y: bird.y }));

        // Update birds once
        this.swarmBirds.forEach(bird => {
            this.updateBirdMovement(bird, time, extendedSize);
        });

        // Calculate and report movements
        this.swarmBirds.forEach((bird, i) => {
            const deltaX = bird.x - originalPositions[i].x;
            const deltaY = bird.y - originalPositions[i].y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            console.log(`Bird ${i}: Δx=${deltaX.toFixed(2)}, Δy=${deltaY.toFixed(2)}, distance=${distance.toFixed(2)}, progress=${bird.continuousProgress.toFixed(3)}`);

            if (distance > 10) {
                console.log(`  ⚠️ Large movement detected for Bird ${i}!`);
            }
        });
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const simulator = new LEDMatrixSimulator();

    // Make simulator globally accessible for debugging
    window.ledSimulator = simulator;

    // Add debug functions to window for easy console access
    window.debugBirdSpeeds = () => simulator.debugBirdSpeeds();
    window.debugBirdMovement = () => simulator.debugBirdMovement();
    window.testSliders = () => {
        console.log('🧪 TESTING SPEED SLIDERS:');
        console.log('1. Setting speed range to 0.1 - 1.0...');
        document.getElementById('swarmMinSpeed').value = 0.1;
        document.getElementById('swarmMinSpeed').dispatchEvent(new Event('input'));
        document.getElementById('swarmMaxSpeed').value = 1.0;
        document.getElementById('swarmMaxSpeed').dispatchEvent(new Event('input'));

        setTimeout(() => {
            console.log('2. Checking bird speeds...');
            simulator.debugBirdSpeeds();

            console.log('\\n3. Setting extreme range 0.01 - 0.05...');
            document.getElementById('swarmMinSpeed').value = 0.01;
            document.getElementById('swarmMinSpeed').dispatchEvent(new Event('input'));
            document.getElementById('swarmMaxSpeed').value = 0.05;
            document.getElementById('swarmMaxSpeed').dispatchEvent(new Event('input'));

            setTimeout(() => {
                console.log('4. Checking new bird speeds...');
                simulator.debugBirdSpeeds();
            }, 500);
        }, 500);
    };

    console.log('LED Matrix Simulator initialized');
    console.log('💡 Debug Commands:');
    console.log('  - debugBirdSpeeds() - Monitor bird speeds and slider settings');
    console.log('  - debugBirdMovement() - Track bird movements in real-time');
    console.log('  - testSliders() - Automatically test slider functionality');
    console.log('\\n🚨 To troubleshoot speed sliders:');
    console.log('  1. Enable swarm mode first');
    console.log('  2. Set max birds to 4');
    console.log('  3. Run testSliders() or manually move sliders');
    console.log('  4. Watch console for regeneration messages');
});
