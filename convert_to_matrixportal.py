#!/usr/bin/env python3
"""
Frame Data Converter for Matrix Portal S3
Converts exported LED simulator data to Matrix Portal S3 format
"""

import re
import json

def parse_arduino_frame_data(arduino_code):
    """
    Parse Arduino C++ array format and convert to Python data structure
    """
    # Extract frame data from Arduino code
    pattern = r'const\s+uint8_t\s+frame\d+_data_\d+x\d+\[(\d+)\]\[(\d+)\]\[3\]\s*=\s*{(.*?)};'
    match = re.search(pattern, arduino_code, re.DOTALL)
    
    if not match:
        raise ValueError("Could not parse Arduino frame data")
    
    height = int(match.group(1))
    width = int(match.group(2))
    data_str = match.group(3)
    
    # Parse the nested array structure
    frame_data = []
    
    # Split by rows (outer braces)
    rows = re.findall(r'{([^}]+)}', data_str)
    
    for row_str in rows:
        row_data = []
        # Split by pixels (inner braces with 3 values)
        pixels = re.findall(r'{(\d+),\s*(\d+),\s*(\d+)}', row_str)
        
        for r, g, b in pixels:
            row_data.append([int(r), int(g), int(b)])
        
        frame_data.append(row_data)
    
    return {
        'width': width,
        'height': height,
        'data': frame_data
    }

def convert_to_circuitpython(frame_data):
    """
    Convert to CircuitPython format with memory optimization
    """
    width = frame_data['width']
    height = frame_data['height']
    data = frame_data['data']
    
    # Generate CircuitPython code
    code = f"""# Frame data for {width}x{height} matrix
# Generated from LED simulator export

import displayio

MATRIX_WIDTH = {width}
MATRIX_HEIGHT = {height}

# Compressed frame data (only non-black pixels)
frame_pixels = [
"""
    
    # Only store non-black pixels to save memory
    for y, row in enumerate(data):
        for x, (r, g, b) in enumerate(row):
            if r > 0 or g > 0 or b > 0:  # Skip black pixels
                code += f"    ({x}, {y}, {r}, {g}, {b}),\n"
    
    code += """]

def draw_frame(matrix_display):
    \"\"\"Draw the frame on the matrix display\"\"\"
    # Clear display
    matrix_display.fill(0x000000)
    
    # Draw non-black pixels
    for x, y, r, g, b in frame_pixels:
        color = (r << 16) | (g << 8) | b
        matrix_display.pixel(x, y, color)
"""
    
    return code

def convert_to_arduino_optimized(frame_data):
    """
    Convert to optimized Arduino format
    """
    width = frame_data['width']
    height = frame_data['height']
    data = frame_data['data']
    
    # Generate Arduino code with RLE compression
    code = f"""// Optimized frame data for {width}x{height} matrix
// Generated from LED simulator export

#define FRAME_WIDTH {width}
#define FRAME_HEIGHT {height}

// Run-length encoded pixel data: x, y, r, g, b
// Only non-black pixels stored
const uint16_t frame_pixels[][5] = {{
"""
    
    for y, row in enumerate(data):
        for x, (r, g, b) in enumerate(row):
            if r > 0 or g > 0 or b > 0:  # Skip black pixels
                code += f"  {{{x}, {y}, {r}, {g}, {b}}},\n"
    
    code += f"""  {{65535, 0, 0, 0, 0}}  // End marker
}};

void drawFrame(Adafruit_Protomatter& matrix) {{
  matrix.fillScreen(0); // Clear screen
  
  // Draw non-black pixels
  for (int i = 0; frame_pixels[i][0] != 65535; i++) {{
    uint16_t x = frame_pixels[i][0];
    uint16_t y = frame_pixels[i][1];
    uint8_t r = frame_pixels[i][2];
    uint8_t g = frame_pixels[i][3];
    uint8_t b = frame_pixels[i][4];
    
    matrix.drawPixel(x, y, matrix.color565(r, g, b));
  }}
  
  matrix.show();
}}
"""
    
    return code

def main():
    """
    Main conversion function
    """
    print("🎨 LED Simulator to Matrix Portal S3 Converter")
    print("=" * 50)
    
    # Instructions
    print("\n📋 Instructions:")
    print("1. Export frame data from your LED simulator")
    print("2. Copy the Arduino code from the export")
    print("3. Paste it below and press Enter twice to finish")
    print("\n💾 Paste your Arduino frame data:")
    
    # Collect input
    lines = []
    while True:
        try:
            line = input()
            if line.strip() == "" and len(lines) > 0:
                break
            lines.append(line)
        except EOFError:
            break
    
    arduino_code = "\n".join(lines)
    
    if not arduino_code.strip():
        print("❌ No data provided. Exiting.")
        return
    
    try:
        # Parse the Arduino data
        print("\n🔄 Parsing Arduino frame data...")
        frame_data = parse_arduino_frame_data(arduino_code)
        
        print(f"✅ Parsed {frame_data['width']}x{frame_data['height']} frame")
        
        # Generate CircuitPython version
        print("\n🐍 Generating CircuitPython code...")
        circuitpython_code = convert_to_circuitpython(frame_data)
        
        # Save CircuitPython version
        with open('frame_circuitpython.py', 'w') as f:
            f.write(circuitpython_code)
        print("✅ Saved to 'frame_circuitpython.py'")
        
        # Generate optimized Arduino version
        print("\n🔧 Generating optimized Arduino code...")
        arduino_optimized = convert_to_arduino_optimized(frame_data)
        
        # Save Arduino version
        with open('frame_arduino_optimized.ino', 'w') as f:
            f.write(arduino_optimized)
        print("✅ Saved to 'frame_arduino_optimized.ino'")
        
        # Statistics
        total_pixels = frame_data['width'] * frame_data['height']
        non_black_pixels = sum(1 for row in frame_data['data'] for r, g, b in row if r > 0 or g > 0 or b > 0)
        compression_ratio = (1 - non_black_pixels / total_pixels) * 100
        
        print(f"\n📊 Statistics:")
        print(f"   Total pixels: {total_pixels}")
        print(f"   Non-black pixels: {non_black_pixels}")
        print(f"   Memory saved: {compression_ratio:.1f}%")
        
        print(f"\n🚀 Ready for Matrix Portal S3!")
        print(f"   Copy the generated code to your Matrix Portal S3 project")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("💡 Make sure you copied the complete Arduino frame data")

if __name__ == "__main__":
    main()
