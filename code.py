# LED Simulator to Matrix Portal S3 - CircuitPython Version
# 
# This CircuitPython script displays your exported LED simulator animations
# on a physical HUB-75 RGB LED matrix using the Adafruit Matrix Portal S3.
#
# Setup Instructions:
# 1. Install CircuitPython on your Matrix Portal S3
# 2. Copy required libraries to CIRCUITPY/lib/
# 3. Export frame data from your LED simulator
# 4. Convert the data using convert_to_matrixportal.py
# 5. Replace frame_data below with your converted data
# 6. Save this file as code.py on CIRCUITPY drive

import board
import displayio
import terminalio
import time
import gc
from adafruit_matrixportal.matrixportal import MatrixPortal

# ========================
# CONFIGURATION
# ========================

# Matrix configuration - change to match your setup
MATRIX_WIDTH = 64   # 32 or 64
MATRIX_HEIGHT = 64  # 32 or 64
FRAME_DELAY = 0.1   # Seconds between frames (0.1 = 100ms)

print("🐦 Hummingbird LED Matrix - CircuitPython")
print("Generated from LED Simulator Export")
print("===================================")

# Initialize MatrixPortal
try:
    matrixportal = MatrixPortal(
        width=MATRIX_WIDTH,
        height=MATRIX_HEIGHT,
        bit_depth=6,  # Higher bit depth = more colors but slower refresh
        debug=False
    )
    print(f"✅ Matrix initialized: {MATRIX_WIDTH}x{MATRIX_HEIGHT}")
except Exception as e:
    print(f"❌ Matrix initialization failed: {e}")
    while True:
        pass

# ========================
# FRAME DATA
# ========================

# PASTE YOUR CONVERTED FRAME DATA HERE
# Use convert_to_matrixportal.py to convert your exported simulator data
# The converter will generate optimized CircuitPython code

# Example frame data - replace with your converted data
frame1_pixels = [
    # (x, y, r, g, b) tuples for non-black pixels only
    # Example: (32, 32, 255, 100, 0),  # Orange pixel at center
    # Add your converted frame 1 data here
]

frame2_pixels = [
    # (x, y, r, g, b) tuples for non-black pixels only
    # Add your converted frame 2 data here
]

# Frame list for easy cycling
frames = [frame1_pixels, frame2_pixels]

print(f"📊 Loaded {len(frames)} animation frames")
for i, frame in enumerate(frames):
    print(f"   Frame {i+1}: {len(frame)} pixels")

# ========================
# ANIMATION VARIABLES
# ========================

current_frame = 0
animation_enabled = True
last_frame_time = time.monotonic()

# ========================
# DISPLAY FUNCTIONS
# ========================

def clear_display():
    """Clear the entire matrix display"""
    matrixportal.graphics.fill(0x000000)

def draw_frame(frame_pixels):
    """Draw a frame from pixel data"""
    clear_display()
    
    # Draw each non-black pixel
    for x, y, r, g, b in frame_pixels:
        if 0 <= x < MATRIX_WIDTH and 0 <= y < MATRIX_HEIGHT:
            # Convert RGB to hex color
            color = (r << 16) | (g << 8) | b
            matrixportal.graphics.pixel(x, y, color)
    
    # Update the display
    matrixportal.display.refresh()

def draw_test_pattern():
    """Draw a simple test pattern to verify matrix is working"""
    clear_display()
    
    # Draw border
    for x in range(MATRIX_WIDTH):
        matrixportal.graphics.pixel(x, 0, 0xFF0000)  # Red top
        matrixportal.graphics.pixel(x, MATRIX_HEIGHT-1, 0xFF0000)  # Red bottom
    
    for y in range(MATRIX_HEIGHT):
        matrixportal.graphics.pixel(0, y, 0x00FF00)  # Green left
        matrixportal.graphics.pixel(MATRIX_WIDTH-1, y, 0x00FF00)  # Green right
    
    # Draw center cross
    center_x, center_y = MATRIX_WIDTH // 2, MATRIX_HEIGHT // 2
    for i in range(-2, 3):
        if 0 <= center_x + i < MATRIX_WIDTH:
            matrixportal.graphics.pixel(center_x + i, center_y, 0x0000FF)  # Blue
        if 0 <= center_y + i < MATRIX_HEIGHT:
            matrixportal.graphics.pixel(center_x, center_y + i, 0x0000FF)  # Blue
    
    matrixportal.display.refresh()

# ========================
# ANIMATION CONTROL
# ========================

def next_frame():
    """Advance to the next animation frame"""
    global current_frame
    current_frame = (current_frame + 1) % len(frames)
    return current_frame

def show_current_frame():
    """Display the current animation frame"""
    if frames and len(frames) > 0:
        draw_frame(frames[current_frame])
    else:
        draw_test_pattern()  # Show test pattern if no frame data

def print_status():
    """Print current status to serial"""
    print(f"📊 Frame: {current_frame + 1}/{len(frames)}, "
          f"Animation: {'ON' if animation_enabled else 'OFF'}, "
          f"Memory: {gc.mem_free()} bytes free")

# ========================
# MAIN LOOP
# ========================

print("🚀 Starting animation...")

# Show initial frame
show_current_frame()
print_status()

# Main animation loop
while True:
    try:
        current_time = time.monotonic()
        
        # Check if it's time for the next frame
        if animation_enabled and (current_time - last_frame_time >= FRAME_DELAY):
            if len(frames) > 1:  # Only animate if we have multiple frames
                next_frame()
                show_current_frame()
                last_frame_time = current_time
                
                # Print status occasionally
                if current_frame == 0:  # At the start of each loop
                    print_status()
        
        # Small delay to prevent excessive CPU usage
        time.sleep(0.01)
        
        # Periodic garbage collection to prevent memory issues
        if current_time % 10 < 0.1:  # Every ~10 seconds
            gc.collect()
    
    except KeyboardInterrupt:
        print("\n⏹️  Animation stopped by user")
        break
    except Exception as e:
        print(f"❌ Error in main loop: {e}")
        time.sleep(1)  # Wait before retrying

# ========================
# ADVANCED FEATURES
# ========================

# You can add these functions for more advanced control:

def set_brightness(brightness):
    """
    Adjust display brightness (0.0 to 1.0)
    Note: This is a simplified version - real brightness control
    would require modifying pixel values before display
    """
    pass

def apply_color_filter(pixels, filter_type):
    """
    Apply color filters similar to your simulator effects
    Returns modified pixel list
    """
    filtered_pixels = []
    
    for x, y, r, g, b in pixels:
        if filter_type == "red_boost":
            r = min(255, int(r * 1.3))
            g = int(g * 0.7)
            b = int(b * 0.7)
        elif filter_type == "blue_boost":
            r = int(r * 0.7)
            g = int(g * 0.8)
            b = min(255, int(b * 1.3))
        elif filter_type == "invert":
            r = 255 - r
            g = 255 - g
            b = 255 - b
        
        filtered_pixels.append((x, y, r, g, b))
    
    return filtered_pixels

def wifi_update_frames():
    """
    Future enhancement: Download new frame data from your simulator
    via WiFi for real-time updates
    """
    pass

# ========================
# USAGE INSTRUCTIONS
# ========================

"""
🎯 HOW TO USE THIS CODE:

1. CONVERT YOUR DATA:
   - Export frame data from your LED simulator
   - Run: python3 convert_to_matrixportal.py
   - Copy the generated frame_pixels arrays

2. UPDATE THIS FILE:
   - Replace frame1_pixels and frame2_pixels with your data
   - Adjust MATRIX_WIDTH and MATRIX_HEIGHT if needed
   - Modify FRAME_DELAY for animation speed

3. INSTALL ON MATRIX PORTAL S3:
   - Save this file as code.py on CIRCUITPY drive
   - Ensure required libraries are in lib/ folder

4. CONNECT HARDWARE:
   - Plug Matrix Portal S3 into HUB-75 matrix
   - Connect appropriate power supply
   - Power on and enjoy your animation!

🔧 TROUBLESHOOTING:
   - No display? Check power and connections
   - Wrong colors? Verify matrix type and settings
   - Memory errors? Use convert_to_matrixportal.py for optimization
   - Slow refresh? Lower bit_depth in MatrixPortal init

🌐 ADVANCED:
   - Add WiFi code to sync with your browser simulator
   - Implement real-time effect controls
   - Create interactive animations with sensors
"""
