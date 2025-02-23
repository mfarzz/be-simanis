const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Pastikan direktori uploads/templates ada
const uploadDir = path.join(__dirname, '..', 'uploads', 'templates');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Gunakan variabel uploadDir
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

// Setup multer untuk menerima file dengan ekstensi .docx
const templates = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /docx/;
        const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    
        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file dengan format .docx yang diizinkan!'), false);
        }
    }
});

module.exports = templates;