import cv2
import numpy as np

def process_screenshot(image_bytes: bytes):
    # 1. Convert uploaded bytes to an OpenCV image array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 2. Pre-process for OCR (Grayscale & Contrast)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, processed_img = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    
    # 3. TODO: Send 'processed_img' to Google Cloud Vision API here
    # For now, we simulate the OCR extraction returning player stats
    extracted_data = [
        {"ign": "NinjaFF", "kills": 6, "placement": 1},
        {"ign": "ProGamer", "kills": 2, "placement": 2}
    ]
    
    return extracted_data

def calculate_score(kills: int, placement: int):
    # Example scoring: 2 points per kill, 10 points for Booyah (1st place)
    placement_points = 10 if placement == 1 else (5 if placement == 2 else 0)
    return (kills * 2) + placement_points