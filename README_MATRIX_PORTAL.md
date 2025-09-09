# 🚀 Matrix Portal S3 Integration

Transform your browser-based LED simulator animations into physical LED matrix displays using the **Adafruit Matrix Portal S3**!

## 📁 Files Created

| File | Purpose |
|------|---------|
| `MATRIX_PORTAL_S3_GUIDE.md` | Complete setup and usage guide |
| `convert_to_matrixportal.py` | Data conversion utility (simulator → Matrix Portal) |
| `matrix_portal_s3_example.ino` | Arduino sketch template |
| `code.py` | CircuitPython script template |

## ⚡ Quick Start

### 1. Export Animation from Simulator
1. Open your LED simulator in browser (`http://127.0.0.1:8080`)
2. Configure your desired animation (split, swarm, move, breathing)
3. Click **"Export Frame Data"** button
4. Copy the generated Arduino code

### 2. Convert Data
```bash
# Run the conversion utility
python3 convert_to_matrixportal.py

# Paste your exported Arduino code when prompted
# Script generates optimized code for both Arduino and CircuitPython
```

### 3A. Arduino Path
1. Open `matrix_portal_s3_example.ino` in Arduino IDE
2. Install **Adafruit Protomatter** library
3. Select **"Adafruit MatrixPortal S3"** board
4. Replace frame data arrays with your converted data
5. Upload to Matrix Portal S3

### 3B. CircuitPython Path
1. Install CircuitPython on Matrix Portal S3
2. Copy required libraries to `CIRCUITPY/lib/`
3. Edit `code.py` with your converted frame data
4. Save as `code.py` on CIRCUITPY drive

### 4. Hardware Setup
1. **Connect**: Matrix Portal S3 → HUB-75 RGB matrix
2. **Power**: USB-C (small matrices) or 5V supply (large matrices)
3. **Address E**: Verify pin 14 connection for 64x64 matrices

## 🎯 Supported Features

| Simulator Feature | Matrix Portal S3 | Notes |
|------------------|------------------|-------|
| ✅ 32x32 matrices | ✅ Full support | Perfect for testing |
| ✅ 64x64 matrices | ✅ Full support | Requires Address E |
| ✅ Split into 4 | ✅ Works perfectly | Frame-by-frame animation |
| ✅ Swarm mode | ✅ Color modifications | Realistic movement |
| ✅ Hummingbird move | ✅ Smooth animation | Darting patterns |
| ✅ Breathing effect | ✅ Scale modulation | Size changes |
| ✅ Custom colors | ✅ Full RGB support | All color effects |

## 🔧 Hardware Requirements

### Matrix Portal S3 Features
- **ESP32-S3** processor (8MB flash, 2MB SRAM)
- **WiFi + Bluetooth LE** (WiFi works in CircuitPython)
- **USB-C** for programming and power
- **HUB-75 connector** (2x10 socket + 2x8 IDC)
- **I2C STEMMA QT** for sensors
- **GPIO breakout** for expansion

### LED Matrix Compatibility
- **HUB-75 standard** (all Adafruit matrices work)
- **Sizes**: 16x32 up to 64x64
- **Chainable**: Multiple panels supported
- **Power**: 5V supply for larger matrices

## 🛠️ Troubleshooting

### Common Issues
| Problem | Solution |
|---------|----------|
| Matrix not lighting | Check power supply and connections |
| Wrong colors | Verify RGB pin mapping |
| Flickering display | Lower bit depth or check refresh rate |
| Memory errors | Use conversion script for optimization |

### Matrix Portal S3 Specific
- **Address E line**: Pin 14 for 64x64 matrices
- **Power requirements**: 5V/4A+ for 64x64
- **WiFi interference**: Test without WiFi first

## 🌐 Advanced Features

### Real-time Updates
Add WiFi code to receive live updates from your browser simulator:

```cpp
// Arduino: Poll simulator for new frame data
HTTPClient http;
http.begin("http://your-simulator-ip:8080/api/current-frame");
```

```python
# CircuitPython: Fetch updates via WiFi
import adafruit_requests
response = requests.get("http://your-simulator-ip:8080/api/frame-data")
```

### Effect Extensions
- **Brightness control**: Modify pixel values before display
- **Color temperature**: Adjust RGB ratios
- **Interactive sensors**: Use accelerometer for tilt effects
- **Sound reactive**: Add microphone for audio visualization

## 📊 Performance Comparison

| Platform | Pros | Cons |
|----------|------|------|
| **Browser Simulator** | Live editing, instant preview | Virtual only |
| **Matrix Portal S3** | Physical display, portable | Fixed animation |
| **Combined Workflow** | Best of both worlds | Setup complexity |

## 🎯 Perfect For

- **🔬 Testing**: Verify animations before large installations
- **🎨 Prototyping**: Quick iteration on LED art projects  
- **📚 Learning**: Understanding LED matrix programming
- **🚀 Production**: Small to medium LED displays

---

**🎮 Result**: Your browser-simulated hummingbird animations now fly on real LEDs! Perfect for bringing digital art into the physical world. 🐦✨
