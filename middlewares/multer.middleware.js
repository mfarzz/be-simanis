const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = file.fieldname === 'surat_pengantar' ? 'suratPengantar' : 'suratBalasan';
        const uploadDir = `uploads/${folder}`;
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const { instansi, nama_ketua } = req.body;
        const date = new Date().toISOString().replace(/[:.]/g, '-');
        const uniqueSuffix = `${date}-${instansi}-${nama_ketua}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const uploadSurat = multer({ 
    storage,
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

module.exports = { uploadSurat };
