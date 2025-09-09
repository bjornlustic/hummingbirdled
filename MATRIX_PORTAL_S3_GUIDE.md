# 🚀 Matrix Portal S3 Setup Guide

Convert your LED simulator animations to run on the **Adafruit Matrix Portal S3** with HUB-75 LED matrices!

## 📋 **What You Need**

### Hardware
- **Adafruit Matrix Portal S3** (the device you described)
- **HUB-75 RGB LED Matrix** (32x32 or 64x64 - matches your simulator settings)
- **USB-C cable** for programming and power
- **5V Power Supply** (for larger matrices - 32x32 needs ~2A, 64x64 needs ~4A)

### Software
- **CircuitPython** or **Arduino IDE**
- **Adafruit Libraries** (Protomatter for matrices)

---

## ⚙️ **Step 1: Hardware Setup**

### 🔌 Physical Connection
1. **Plug Matrix Portal S3** directly into the back of your HUB-75 matrix
   - The 2x10 connector fits snugly into 2x8 HUB-75 ports
   - No worries about "off by one" errors!

2. **Power Setup**:
   - **Small matrices (32x32)**: USB-C power might be sufficient
   - **Large matrices (64x64)**: Use separate 5V power adapter connected to matrix

3. **Address E Line** (for 64x64 matrices):
   - Check if your matrix uses Address E line
   - Matrix Portal S3 defaults to pin 8 - may need jumper adjustment

---

## ⚙️ **Step 2: Software Environment Setup**

### Option A: CircuitPython (Recommended for beginners)

```bash
# 1. Install CircuitPython on Matrix Portal S3
# Download from: https://circuitpython.org/board/adafruit_matrixportal_s3/

# 2. Install required libraries
# Copy these to CIRCUITPY/lib/:
# - adafruit_display_text/
# - adafruit_bitmap_font/
# - adafruit_displayio_ssd1306/
# - adafruit_matrixportal/
# - adafruit_esp32spi/
```

### Option B: Arduino IDE

```bash
# 1. Install ESP32 Arduino Core
# In Arduino IDE: File > Preferences
# Add: https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

# 2. Install Adafruit Protomatter Library
# Library Manager: Search "Protomatter" and install

# 3. Select Board: "Adafruit MatrixPortal S3"
```

---

## 🎨 **Step 3: Convert Your Simulator Data**

### Use Your Simulator's Export Feature

1. **In your browser simulator**:
   - Set up your desired animation (split, swarm, move, etc.)
   - Click **"Export Frame Data"** button
   - Copy the generated Arduino code

2. **Your exported data looks like this**:
```cpp
// Frame 1 - Generated at [timestamp]
// Matrix size: 64x64

const uint8_t frame1_data_64x64[64][64][3] = {
  // RGB data for each pixel
};
```

---

## 💻 **Step 4: CircuitPython Code**

Create `code.py` on your CIRCUITPY drive:

```python
import board
import displayio
import terminalio
import time
from adafruit_matrixportal.matrixportal import MatrixPortal

# Configure for your matrix size
MATRIX_WIDTH = 64  # or 32
MATRIX_HEIGHT = 64  # or 32

# Initialize Matrix Portal
matrixportal = MatrixPortal(
    width=MATRIX_WIDTH, 
    height=MATRIX_HEIGHT, 
    bit_depth=6
)

# Your exported frame data (convert to Python format)
frame1_data = [
    # Convert your exported C++ array to Python format
    # Each pixel: [R, G, B] values 0-255
]

frame2_data = [
    # Second frame data
]

frames = [frame1_data, frame2_data]
current_frame = 0

# Animation loop
while True:
    # Clear display
    matrixportal.graphics.fill(0x000000)
    
    # Draw current frame
    frame = frames[current_frame]
    for y in range(MATRIX_HEIGHT):
        for x in range(MATRIX_WIDTH):
            if y < len(frame) and x < len(frame[y]):
                r, g, b = frame[y][x]
                if r > 0 or g > 0 or b > 0:  # Skip black pixels
                    color = (r << 16) | (g << 8) | b
                    matrixportal.graphics.pixel(x, y, color)
    
    # Update display
    matrixportal.display.refresh()
    
    # Next frame
    current_frame = (current_frame + 1) % len(frames)
    time.sleep(0.1)  # Adjust animation speed
```

---

## 🔧 **Step 5: Arduino Code**

Create a new Arduino sketch:

```cpp
#include <Adafruit_Protomatter.h>

// Matrix configuration
#define MATRIX_WIDTH 64   // or 32
#define MATRIX_HEIGHT 64  // or 32

// Pin definitions for Matrix Portal S3
uint8_t rgbPins[]  = {42, 41, 40, 38, 39, 37};
uint8_t addrPins[] = {45, 36, 48, 35, 21, 14}; // Address E on pin 14
uint8_t clockPin   = 2;
uint8_t latchPin   = 47;
uint8_t oePin      = 13;

Adafruit_Protomatter matrix(
  MATRIX_WIDTH, 6, 1, rgbPins, 6, addrPins, clockPin, latchPin, oePin, false
);

// Paste your exported frame data here
// const uint8_t frame1_data_64x64[64][64][3] = { ... };
// const uint8_t frame2_data_64x64[64][64][3] = { ... };

int currentFrame = 0;
unsigned long lastFrameTime = 0;
const int FRAME_DELAY = 100; // milliseconds

void setup() {
  Serial.begin(115200);
  
  // Initialize matrix
  ProtomatterStatus status = matrix.begin();
  if(status != PROTOMATTER_OK) {
    Serial.printf("Protomatter init failed: %d\n", status);
    for(;;);
  }
  
  Serial.println("Matrix Portal S3 Hummingbird Display Ready!");
}

void loop() {
  if (millis() - lastFrameTime > FRAME_DELAY) {
    displayFrame(currentFrame);
    currentFrame = (currentFrame + 1) % 2; // Toggle between 2 frames
    lastFrameTime = millis();
  }
}

void displayFrame(int frameIndex) {
  matrix.fillScreen(0); // Clear screen
  
  // Choose frame data based on index
  const uint8_t (*frameData)[MATRIX_WIDTH][3];
  if (frameIndex == 0) {
    frameData = frame1_data_64x64;
  } else {
    frameData = frame2_data_64x64;
  }
  
  // Draw pixels
  for (int y = 0; y < MATRIX_HEIGHT; y++) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      uint8_t r = frameData[y][x][0];
      uint8_t g = frameData[y][x][1];
      uint8_t b = frameData[y][x][2];
      
      if (r > 0 || g > 0 || b > 0) { // Skip black pixels
        matrix.drawPixel(x, y, matrix.color565(r, g, b));
      }
    }
  }
  
  matrix.show(); // Update display
}
```

---

## 🔄 **Step 6: Data Conversion Workflow**

### Automated Conversion (Recommended)

Create a Python script to convert your exported data:

```python
# convert_frames.py
def convert_arduino_to_python(arduino_code):
    """Convert exported Arduino array to Python format"""
    # Parse the Arduino C++ array and convert to Python list
    # This script would process your exported frame data
    pass

def convert_arduino_to_circuitpython(arduino_code):
    """Convert to CircuitPython-friendly format"""
    # Smaller arrays, optimized for memory
    pass
```

### Manual Process
1. **Export frame** from simulator
2. **Copy RGB values** from generated code
3. **Paste into** Arduino sketch or convert to Python
4. **Upload** to Matrix Portal S3
5. **Test** on physical LED matrix

---

## 🎯 **Step 7: Advanced Features**

### WiFi Integration (CircuitPython)
```python
# Add WiFi to update animations remotely
matrixportal.network.connect()

# Fetch new frame data from your simulator server
# matrixportal.network.fetch(url)
```

### Real-time Updates (Arduino)
```cpp
// Add WiFi to receive live updates from simulator
#include <WiFi.h>
#include <HTTPClient.h>

// Poll your simulator for new frame data
// Update matrix in real-time
```

### Effects Translation
- **✅ Split into 4**: Works perfectly on 64x64
- **✅ Swarm mode**: Color modifications translate well
- **✅ Breathing**: Animate by changing brightness
- **✅ Movement**: Frame-by-frame animation

---

## 🚀 **Quick Start Checklist**

- [ ] Matrix Portal S3 connected to LED matrix
- [ ] Power supply adequate for matrix size
- [ ] CircuitPython or Arduino IDE setup
- [ ] Libraries installed (Protomatter/MatrixPortal)
- [ ] Frame data exported from simulator
- [ ] Code uploaded to Matrix Portal S3
- [ ] Animation running on physical LEDs!

---

## 🛠️ **Troubleshooting**

### Common Issues
1. **Matrix not lighting up**: Check power supply, connections
2. **Wrong colors**: Verify RGB pin mapping in code
3. **Flickering**: Increase bit depth or check refresh rate
4. **Memory issues**: Reduce frame data size or use compression

### Matrix Portal S3 Specific
- **Address E line**: Verify pin 14 connection for 64x64 matrices
- **Power**: Use separate 5V supply for large matrices
- **WiFi interference**: May affect matrix refresh, test without WiFi first

---

## 🎨 **Result**

Your browser simulator animations will now run on a physical LED matrix! The Matrix Portal S3 handles all the complex timing and driving, while your exported frame data provides the visual content.

Perfect for testing before building larger LED installations! 🚀✨
