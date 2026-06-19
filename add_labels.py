from PIL import Image, ImageDraw, ImageFont
import os

def add_labels(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    w, h = img.size
    
    # Create overlay for text with transparency
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Try to use a nice font, fall back to default
    font_size = max(18, w // 40)
    small_font_size = max(14, w // 55)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
        small_font = ImageFont.truetype("arial.ttf", small_font_size)
    except:
        font = ImageFont.load_default()
        small_font = font
    
    # Labels with approximate positions (as fractions of image size)
    labels = [
        {"text": "CASINO", "x": 0.25, "y": 0.55, "font": font},
        {"text": "BEBE STORE", "x": 0.72, "y": 0.55, "font": font},
        {"text": "PHOTOBOOTH", "x": 0.50, "y": 0.62, "font": font},
        {"text": "GALLERY", "x": 0.38, "y": 0.42, "font": small_font},
        {"text": "FERRIS WHEEL", "x": 0.58, "y": 0.28, "font": small_font},
    ]
    
    for label in labels:
        x = int(w * label["x"])
        y = int(h * label["y"])
        text = label["text"]
        f = label["font"]
        
        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=f)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        # Draw rounded rectangle background (white with slight transparency)
        pad_x = 12
        pad_y = 6
        rect_x1 = x - tw // 2 - pad_x
        rect_y1 = y - th // 2 - pad_y
        rect_x2 = x + tw // 2 + pad_x
        rect_y2 = y + th // 2 + pad_y
        
        draw.rounded_rectangle(
            [rect_x1, rect_y1, rect_x2, rect_y2],
            radius=12,
            fill=(255, 255, 255, 210),
            outline=(255, 117, 143, 180),
            width=2
        )
        
        # Draw text centered
        draw.text(
            (x - tw // 2, y - th // 2),
            text,
            fill=(80, 80, 80, 255),
            font=f
        )
    
    # Composite
    result = Image.alpha_composite(img, overlay)
    result.save(output_path)
    print(f"Done! Labels added to {output_path}")

if __name__ == '__main__':
    add_labels(
        r"C:\Users\alanj\.gemini\antigravity-ide\brain\bd6047f9-5616-4d5c-a021-034e3446bdda\bebe_land_no_text_1781871192794.png",
        "public/images/bebe-land-map.png"
    )
