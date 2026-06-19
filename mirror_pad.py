import sys
from PIL import Image

def mirror_pad_image(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    width, height = img.size

    # Target 16:9 aspect ratio
    new_width = int(height * 16 / 9)
    new_img = Image.new('RGBA', (new_width, height))

    pad_left = (new_width - width) // 2
    pad_right = new_width - width - pad_left

    # Crop the exact width needed from the left edge, and flip it horizontally
    left_mirror = img.crop((0, 0, pad_left, height)).transpose(Image.FLIP_LEFT_RIGHT)
    
    # Crop the exact width needed from the right edge, and flip it horizontally
    right_mirror = img.crop((width - pad_right, 0, width, height)).transpose(Image.FLIP_LEFT_RIGHT)

    # Paste the mirrors
    new_img.paste(left_mirror, (0, 0))
    new_img.paste(right_mirror, (new_width - pad_right, 0))
    
    # Paste the original in the center
    new_img.paste(img, (pad_left, 0), img)

    new_img.save(output_path)
    print("Done generating seamless mirror-padded widescreen image.")

if __name__ == '__main__':
    mirror_pad_image(sys.argv[1], 'public/images/bebe-land-map.png')
