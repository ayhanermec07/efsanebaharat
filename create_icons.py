#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont

# Turuncu renkte ikon oluştur
def create_icon(size, filename):
    # Turuncu arka plan (#ea580c)
    img = Image.new('RGB', (size, size), color='#ea580c')
    draw = ImageDraw.Draw(img)
    
    # Beyaz "B" harfi ekle (Baharat)
    try:
        # Font boyutunu ayarla
        font_size = int(size * 0.6)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Metni ortala
    text = "B"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill='white', font=font)
    
    # PNG olarak kaydet
    img.save(filename, 'PNG')
    print(f"✓ {filename} oluşturuldu ({size}x{size})")

# Icon'ları oluştur
create_icon(192, 'public/icon-192.png')
create_icon(512, 'public/icon-512.png')

print("\nPWA icon dosyaları başarıyla oluşturuldu!")
