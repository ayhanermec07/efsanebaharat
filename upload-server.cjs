const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.UPLOAD_SERVER_PORT || 3001);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PUBLIC_IMAGE_ROOT = path.resolve(__dirname, 'public', 'images');
const UPLOAD_TOKEN = process.env.UPLOAD_SERVER_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.UPLOAD_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const ALLOWED_FOLDERS = new Set([
  'products',
  'urun-gorselleri',
  'kategori-gorselleri',
  'marka-logolari',
  'banner-gorselleri',
  'kampanya-banners',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed'));
  },
}));
app.use(express.json({ limit: '10mb' }));

function requireUploadToken(req, res, next) {
  if (!UPLOAD_TOKEN && process.env.NODE_ENV === 'production') {
    res.status(503).json({ error: 'Upload server token is required in production' });
    return;
  }

  if (UPLOAD_TOKEN) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token !== UPLOAD_TOKEN) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  next();
}

function safeFolderPath(folder = 'products') {
  if (!ALLOWED_FOLDERS.has(folder)) {
    throw new Error('Folder is not allowed');
  }

  const uploadPath = path.resolve(PUBLIC_IMAGE_ROOT, folder);
  if (!uploadPath.startsWith(PUBLIC_IMAGE_ROOT + path.sep)) {
    throw new Error('Invalid upload path');
  }

  return uploadPath;
}

function safeFileName(fileName, fallbackExtension = '.jpg') {
  const baseName = path.basename(fileName || `upload-${Date.now()}${fallbackExtension}`);
  const ext = path.extname(baseName).toLowerCase() || fallbackExtension;
  const name = path.basename(baseName, ext).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'upload';
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${name}${ext}`;
}

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (buffer.length >= 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'gif';
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

function assertAllowedUrl(imageUrl) {
  const parsed = new URL(imageUrl);
  const hostname = parsed.hostname.toLowerCase();

  if (parsed.protocol !== 'https:') {
    throw new Error('Only https image URLs are allowed');
  }

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.startsWith('169.254.') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('This image URL is not allowed');
  }
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const uploadPath = safeFolderPath(req.body.folder || 'products');
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    cb(null, safeFileName(file.originalname, path.extname(file.originalname)));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter(req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files can be uploaded'));
  },
});

app.use(requireUploadToken);

app.post('/upload', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No file found' });
    }

    const folder = req.body.folder || 'products';
    const urls = [];

    for (const file of req.files) {
      const buffer = fs.readFileSync(file.path);
      if (!detectImageType(buffer)) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Invalid image signature' });
      }
      urls.push(`/images/${folder}/${file.filename}`);
    }

    res.json({
      success: true,
      urls,
      message: `${req.files.length} files uploaded`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/upload-base64', (req, res) => {
  try {
    const { imageData, folder = 'products', fileName } = req.body;

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'imageData is required' });
    }

    const match = imageData.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image data URL' });
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Image is too large' });
    }

    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      return res.status(400).json({ error: 'Invalid image signature' });
    }

    const uploadPath = safeFolderPath(folder);
    fs.mkdirSync(uploadPath, { recursive: true });

    const filename = safeFileName(`${fileName || 'uploaded'}.${detectedType}`, `.${detectedType}`);
    const filePath = path.resolve(uploadPath, filename);
    if (!filePath.startsWith(uploadPath + path.sep)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    fs.writeFileSync(filePath, buffer);

    const url = `/images/${folder}/${filename}`;
    res.json({
      success: true,
      url,
      publicUrl: `http://localhost:5174${url}`,
      message: 'File uploaded',
    });
  } catch (error) {
    console.error('Base64 upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/upload-from-url', async (req, res) => {
  try {
    const { imageUrl, folder = 'products' } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    assertAllowedUrl(imageUrl);

    const response = await fetch(imageUrl, { redirect: 'error' });
    if (!response.ok) {
      throw new Error('Image could not be downloaded');
    }

    const contentLength = Number(response.headers.get('content-length') || '0');
    if (contentLength > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Image is too large' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Image is too large' });
    }

    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      return res.status(400).json({ error: 'Invalid image signature' });
    }

    const uploadPath = safeFolderPath(folder);
    fs.mkdirSync(uploadPath, { recursive: true });

    const filename = safeFileName(`remote.${detectedType}`, `.${detectedType}`);
    const filePath = path.resolve(uploadPath, filename);
    fs.writeFileSync(filePath, buffer);

    const url = `/images/${folder}/${filename}`;
    res.json({
      success: true,
      url,
      publicUrl: `http://localhost:5174${url}`,
      message: 'File uploaded',
    });
  } catch (error) {
    console.error('URL upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/delete/:folder/:filename', (req, res) => {
  try {
    const { folder, filename } = req.params;
    const uploadPath = safeFolderPath(folder);
    const filePath = path.resolve(uploadPath, path.basename(filename));

    if (!filePath.startsWith(uploadPath + path.sep)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Upload server running on http://localhost:${PORT}`);
});
