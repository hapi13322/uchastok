const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const dataDir = './uploads';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

app.use(express.static('public'))

const ADMIN_PASSWORD='password'

const STORED_FILENAME = 'data.xlsx';
const STORED_FILE_PATH = path.join(dataDir, STORED_FILENAME);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './temp'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // до 10 МБ

if (!fs.existsSync('./temp')) {
  fs.mkdirSync('./temp');
}

app.post('/upload-xlsx', upload.single('file'), (req, res) => {

  const clientPassword = req.body.password; // Получаем пароль из FormData

  if (!clientPassword || clientPassword !== ADMIN_PASSWORD) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(403).json({ success: false, error: 'Неверный пароль или пароль не указан' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Файл не передан. Поле: file' });
  }

  const tempPath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  if (ext !== '.xlsx' && ext !== '.xls') {
    fs.unlinkSync(tempPath);
    return res.status(400).json({ success: false, error: 'Разрешены только .xlsx или .xls' });
  }

  try {
    if (fs.existsSync(STORED_FILE_PATH)) {
      fs.unlinkSync(STORED_FILE_PATH);
    }

    fs.renameSync(tempPath, STORED_FILE_PATH);

    res.json({
      success: true,
      message: 'Файл успешно загружен и заменил старый',
      filename: STORED_FILENAME,
      path: STORED_FILE_PATH
    });
  } catch (err) {
    console.error('Ошибка при замене файла:', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /parse-xlsx
 * Парсит «актуальный» файл (data.xlsx) и возвращает JSON.
 */
app.get('/parse-xlsx', (req, res) => {
  if (!fs.existsSync(STORED_FILE_PATH)) {
    return res.status(404).json({
      success: false,
      error: 'Файл data.xlsx не найден. Сначала загрузите его через POST /upload-xlsx'
    });
  }

  try {
    const workbook = XLSX.readFile(STORED_FILE_PATH);
    const result = {};

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      result[sheetName] = XLSX.utils.sheet_to_json(worksheet);
    });

    res.json({
      success: true,
      data: result,
      sheets: workbook.SheetNames
    });
  } catch (err) {
    console.error('Ошибка парсинга XLSX:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});