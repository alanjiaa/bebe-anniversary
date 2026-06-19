import sys
from PIL import Image, ImageFilter

def pad_image(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    width, height = img.size

    # We want a 16:9 widescreen canvas
    new_width = int(height * 16 / 9)
    new_img = Image.new('RGBA', (new_width, height))

    pad_left = (new_width - width) // 2
    pad_right = new_width - width - pad_left

    # Extract edge slices, mirror them to ensure color matches the edge perfectly, 
    # stretch to fill, and blur to create a seamless vignette/extension effect.
    left_slice = img.crop((0, 0, 100, height)).transpose(Image.FLIP_LEFT_RIGHT)
    left_ext = left_slice.resize((pad_left, height)).filter(ImageFilter.GaussianBlur(25))

    right_slice = img.crop((width-100, 0, width, height)).transpose(Image.FLIP_LEFT_RIGHT)
    right_ext = right_slice.resize((pad_right, height)).filter(ImageFilter.GaussianBlur(25))

    new_img.paste(left_ext, (0, 0))
    new_img.paste(right_ext, (new_width - pad_right, 0))
    
    # Paste original in center
    new_img.paste(img, (pad_left, 0), img)

    new_img.save(output_path)
    print("Done generating padded widescreen image.")

if __name__ == '__main__':
    pad_image('public/images/bebe-land-map.png', 'public/images/bebe-land-map.png')
