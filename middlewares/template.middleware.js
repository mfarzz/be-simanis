const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const uploadDir = 'uploads/templates';

(async () => {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log('Direktori uploads/templates dibuat');
    } catch (err) {
        console.error('Gagal membuat direktori templates:', err);
    }
})();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `template-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});


// Konfigurasi filter file
const fileFilter = (req, file, cb) => {
    const fileTypes = /docx/;
    const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file .docx yang diizinkan!'), false);
    }
};

// Buat instance multer dengan konfigurasi
const templates = multer({
    storage,
    fileFilter,
});

// Ekspor instance multer agar metode seperti `single` dapat digunakan
module.exports = templates;

