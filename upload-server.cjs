const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// CORS ayarları
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Multer storage yapılandırması
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.body.folder || 'products';
    const uploadPath = path.join(__dirname, 'public', 'images', folder);
    
    // Klasör yoksa oluştur
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
  }
});

// Çoklu dosya yükleme endpoint'i
app.post('/upload', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Dosya bulunamadı' });
    }

    const folder = req.body.folder || 'products';
    const urls = req.files.map(file => `/images/${folder}/${file.filename}`);
    
    res.json({ 
      success: true, 
      urls: urls,
      message: `${req.files.length} dosya başarıyla yüklendi`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Base64 upload endpoint'i
app.post('/upload-base64', (req, res) => {
  try {
    const { imageData, folder = 'products', fileName } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'imageData gerekli' });
    }

    // Base64'ten buffer'a çevir
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Dosya adı oluştur
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = imageData.match(/^data:image\/(\w+);base64,/)?.[1] || 'png';
    const filename = fileName ? `${fileName}.${ext}` : `${uniqueSuffix}.${ext}`;
    
    // Klasör yolu
    const uploadPath = path.join(__dirname, 'public', 'images', folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Dosyayı kaydet
    const filePath = path.join(uploadPath, filename);
    fs.writeFileSync(filePath, buffer);
    
    const url = `/images/${folder}/${filename}`;
    
    res.json({ 
      success: true, 
      url: url,
      publicUrl: `http://localhost:5174${url}`,
      message: 'Dosya başarıyla yüklendi'
    });
  } catch (error) {
    console.error('Base64 upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// URL'den resim indirme endpoint'i
app.post('/upload-from-url', async (req, res) => {
  try {
    const { imageUrl, folder = 'products' } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl gerekli' });
    }

    // Resmi indir
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Resim indirilemedi');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Dosya adı oluştur
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
    const filename = `${uniqueSuffix}${ext}`;
    
    // Klasör yolu
    const uploadPath = path.join(__dirname, 'public', 'images', folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Dosyayı kaydet
    const filePath = path.join(uploadPath, filename);
    fs.writeFileSync(filePath, buffer);
    
    const url = `/images/${folder}/${filename}`;
    
    res.json({ 
      success: true, 
      url: url,
      publicUrl: `http://localhost:5174${url}`,
      message: 'Dosya başarıyla yüklendi'
    });
  } catch (error) {
    console.error('URL upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dosya silme endpoint'i
app.delete('/delete/:folder/:filename', (req, res) => {
  try {
    const { folder, filename } = req.params;
    const filePath = path.join(__dirname, 'public', 'images', folder, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Dosya silindi' });
    } else {
      res.status(404).json({ error: 'Dosya bulunamadı' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}`);
});
