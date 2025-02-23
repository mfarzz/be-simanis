const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Pastikan direktori upload ada
const uploadDir = 'uploads/templates/';
(async () => {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log('Direktori uploads/templates berhasil dibuat atau sudah ada');
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

// Konfigurasi filter file
const fileFilter = (req, file, cb) => {
    const fileTypes = /\.docx$/; // Hanya izinkan file dengan ekstensi .docx
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
    limits: {
        fileSize: 5 * 1024 * 1024, // Batasi ukuran file maksimal 5MB
    },
});

// Ekspor instance multer agar metode seperti `single` dapat digunakan
module.exports = templates;