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

// Ekspor instance Multer, bukan middleware
const templates = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /docx/;
        const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            cb(null, true);
        } else {
            req.fileValidationError = 'Hanya file .docx yang diizinkan!';
            return cb(new Error('Hanya file .docx yang diizinkan!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

module.exports = { templates };