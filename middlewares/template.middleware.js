const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Pakai promises untuk operasi file async

// Pastikan direktori upload ada
const uploadDir = 'uploads/templates/';
(async () => {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
        console.error('Gagal membuat direktori upload:', err);
    }
})();

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

// Setup multer
const templates = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /docx/;
        const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file .docx yang diizinkan!'), false);
        }
    },
});

module.exports = templates;