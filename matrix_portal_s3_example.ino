/*
 * LED Simulator to Matrix Portal S3 - Hummingbird Animation
 * 
 * This sketch displays your exported LED simulator animations on a physical
 * HUB-75 RGB LED matrix using the Adafruit Matrix Portal S3.
 * 
 * Hardware Requirements:
 * - Adafruit Matrix Portal S3
 * - HUB-75 RGB LED Matrix (32x32 or 64x64)
 * - Appropriate power supply
 * 
 * Libraries Required:
 * - Adafruit Protomatter
 * 
 * Setup Instructions:
 * 1. Install Adafruit Protomatter library via Library Manager
 * 2. Select "Adafruit MatrixPortal S3" as your board
 * 3. Export frame data from your LED simulator
 * 4. Replace the frame data arrays below with your exported data
 * 5. Upload to Matrix Portal S3
 */

#include <Adafruit_Protomatter.h>

// ========================
// CONFIGURATION
// ========================

// Matrix size - change these to match your matrix and simulator settings
#define MATRIX_WIDTH 64   // 32 or 64
#define MATRIX_HEIGHT 64  // 32 or 64
#define NUM_FRAMES 2      // Number of animation frames

// Animation timing
#define FRAME_DELAY_MS 100  // Milliseconds between frames (matches simulator speed)

// Matrix Portal S3 pin definitions
uint8_t rgbPins[]  = {42, 41, 40, 38, 39, 37};  // R1, G1, B1, R2, G2, B2
uint8_t addrPins[] = {45, 36, 48, 35, 21, 14};  // A, B, C, D, E (E on pin 14)
uint8_t clockPin   = 2;   // Clock
uint8_t latchPin   = 47;  // Latch
uint8_t oePin      = 13;  // Output Enable

// Initialize Protomatter
Adafruit_Protomatter matrix(
  MATRIX_WIDTH,     // Matrix width in pixels
  6,                // Bit depth (3-6, higher = more colors but slower refresh)
  1,                // Number of matrix chains
  rgbPins,          // RGB pins
  6,                // Number of address pins
  addrPins,         // Address pins
  clockPin,         // Clock pin
  latchPin,         // Latch pin
  oePin,            // Output enable pin
  false             // Doublebuffer (false = single buffer)
);

// ========================
// FRAME DATA
// ========================

/*
 * PASTE YOUR EXPORTED FRAME DATA HERE
 * 
 * From your LED simulator:
 * 1. Set up your animation (split, swarm, move, breathing, etc.)
 * 2. Click "Export Frame Data" 
 * 3. Copy the generated frame arrays
 * 4. Replace the example data below
 */

// Example frame data - replace with your exported data
const uint8_t frame1_data[MATRIX_HEIGHT][MATRIX_WIDTH][3] = {
  // Row 0
  {
    {0, 0, 0}, {0, 0, 0}, {0, 0, 0}, /* ... continue for all 64 columns ... */
    // Add your exported frame 1 data here
  },
  // Continue for all 64 rows...
  // Your exported data will have the complete array
};

const uint8_t frame2_data[MATRIX_HEIGHT][MATRIX_WIDTH][3] = {
  // Row 0
  {
    {0, 0, 0}, {0, 0, 0}, {0, 0, 0}, /* ... continue for all 64 columns ... */
    // Add your exported frame 2 data here
  },
  // Continue for all 64 rows...
  // Your exported data will have the complete array
};

// Array of frame pointers for easy cycling
const uint8_t (*frames[NUM_FRAMES])[MATRIX_WIDTH][3] = {
  frame1_data,
  frame2_data
};

// ========================
// ANIMATION VARIABLES
// ========================

int currentFrame = 0;
unsigned long lastFrameTime = 0;
bool animationEnabled = true;

// ========================
// SETUP
// ========================

void setup() {
  Serial.begin(115200);
  Serial.println("🐦 Hummingbird LED Matrix - Matrix Portal S3");
  Serial.println("Generated from LED Simulator Export");
  Serial.println("=====================================");
  
  // Initialize matrix
  ProtomatterStatus status = matrix.begin();
  
  if (status != PROTOMATTER_OK) {
    Serial.printf("❌ Protomatter initialization failed: %d\n", status);
    Serial.println("Check connections and power supply!");
    while(1); // Stop here
  }
  
  Serial.println("✅ Matrix initialized successfully");
  Serial.printf("📐 Matrix size: %dx%d\n", MATRIX_WIDTH, MATRIX_HEIGHT);
  Serial.printf("🎬 Animation frames: %d\n", NUM_FRAMES);
  Serial.printf("⏱️  Frame delay: %dms\n", FRAME_DELAY_MS);
  
  // Clear matrix and show first frame
  matrix.fillScreen(0);
  displayFrame(0);
  matrix.show();
  
  Serial.println("🚀 Animation starting!");
}

// ========================
// MAIN LOOP
// ========================

void loop() {
  // Check if it's time for the next frame
  if (animationEnabled && (millis() - lastFrameTime >= FRAME_DELAY_MS)) {
    // Display current frame
    displayFrame(currentFrame);
    
    // Move to next frame
    currentFrame = (currentFrame + 1) % NUM_FRAMES;
    lastFrameTime = millis();
    
    // Optional: Print frame info to serial
    if (currentFrame == 0) {
      Serial.printf("🔄 Animation loop completed at %lu ms\n", millis());
    }
  }
  
  // Check for serial commands
  handleSerialCommands();
}

// ========================
// DISPLAY FUNCTIONS
// ========================

void displayFrame(int frameIndex) {
  // Clear the matrix
  matrix.fillScreen(0);
  
  // Get the frame data
  const uint8_t (*frameData)[MATRIX_WIDTH][3] = frames[frameIndex];
  
  // Draw each pixel
  for (int y = 0; y < MATRIX_HEIGHT; y++) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      uint8_t r = frameData[y][x][0];
      uint8_t g = frameData[y][x][1];
      uint8_t b = frameData[y][x][2];
      
      // Only draw non-black pixels (optimization)
      if (r > 0 || g > 0 || b > 0) {
        // Convert RGB888 to RGB565 for the matrix
        uint16_t color = matrix.color565(r, g, b);
        matrix.drawPixel(x, y, color);
      }
    }
  }
  
  // Update the display
  matrix.show();
}

// ========================
// UTILITY FUNCTIONS
// ========================

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "pause") {
      animationEnabled = false;
      Serial.println("⏸️  Animation paused");
    }
    else if (command == "play") {
      animationEnabled = true;
      Serial.println("▶️  Animation resumed");
    }
    else if (command == "next") {
      currentFrame = (currentFrame + 1) % NUM_FRAMES;
      displayFrame(currentFrame);
      Serial.printf("⏭️  Next frame: %d\n", currentFrame);
    }
    else if (command == "prev") {
      currentFrame = (currentFrame - 1 + NUM_FRAMES) % NUM_FRAMES;
      displayFrame(currentFrame);
      Serial.printf("⏮️  Previous frame: %d\n", currentFrame);
    }
    else if (command == "info") {
      printSystemInfo();
    }
    else if (command == "help") {
      printHelp();
    }
    else {
      Serial.println("❓ Unknown command. Type 'help' for available commands.");
    }
  }
}

void printSystemInfo() {
  Serial.println("\n📊 System Information");
  Serial.println("====================");
  Serial.printf("Matrix Size: %dx%d\n", MATRIX_WIDTH, MATRIX_HEIGHT);
  Serial.printf("Current Frame: %d/%d\n", currentFrame + 1, NUM_FRAMES);
  Serial.printf("Animation: %s\n", animationEnabled ? "Running" : "Paused");
  Serial.printf("Frame Delay: %dms\n", FRAME_DELAY_MS);
  Serial.printf("Uptime: %lu ms\n", millis());
  Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.println();
}

void printHelp() {
  Serial.println("\n🆘 Available Commands");
  Serial.println("====================");
  Serial.println("play   - Resume animation");
  Serial.println("pause  - Pause animation");
  Serial.println("next   - Show next frame");
  Serial.println("prev   - Show previous frame");
  Serial.println("info   - Show system information");
  Serial.println("help   - Show this help message");
  Serial.println();
}

// ========================
// ADVANCED FEATURES
// ========================

/*
 * Add your custom effects here!
 * 
 * Examples:
 * - Brightness control
 * - Color temperature adjustment
 * - Real-time effect modifications
 * - WiFi updates from your simulator
 */

void setBrightness(float brightness) {
  // Brightness control (0.0 to 1.0)
  // Note: Protomatter handles this differently than simple LED strips
  // You may need to modify pixel values before sending to matrix
}

void applyColorFilter(uint8_t &r, uint8_t &g, uint8_t &b, int filterType) {
  // Apply color filters similar to your simulator effects
  switch (filterType) {
    case 0: // Normal
      break;
    case 1: // Red boost
      r = min(255, r * 1.3);
      g = g * 0.7;
      b = b * 0.7;
      break;
    case 2: // Blue boost
      r = r * 0.7;
      g = g * 0.8;
      b = min(255, b * 1.3);
      break;
    // Add more filters as needed
  }
}

/*
 * 🎯 NEXT STEPS
 * 
 * 1. Export your frame data from the LED simulator
 * 2. Replace the example frame arrays above
 * 3. Adjust MATRIX_WIDTH, MATRIX_HEIGHT, and NUM_FRAMES
 * 4. Upload to your Matrix Portal S3
 * 5. Connect to a HUB-75 matrix and power up!
 * 
 * 🔧 Troubleshooting:
 * - If colors look wrong, check RGB pin connections
 * - If matrix flickers, try lower bit depth (4 instead of 6)
 * - For 64x64 matrices, ensure Address E is connected to pin 14
 * - Use adequate power supply (5V, 4A+ for 64x64)
 * 
 * 🌐 WiFi Integration:
 * Add WiFi code to receive live updates from your browser simulator!
 */
