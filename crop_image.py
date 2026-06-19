import sys
from PIL import Image

def crop_image(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    width, height = img.size

    # We want a 16:9 widescreen crop
    # width is 1024. height should be 1024 * 9 / 16 = 576.
    new_height = int(width * 9 / 16)
    
    # Calculate top and bottom to crop
    crop_amount = (height - new_height) // 2
    
    # Crop box: (left, upper, right, lower)
    cropped_img = img.crop((0, crop_amount, width, height - crop_amount))
    
    cropped_img.save(output_path)
    print(f"Done cropping image to {width}x{new_height}.")

if __name__ == '__main__':
    crop_image(sys.argv[1], 'public/images/bebe-land-map.png')
