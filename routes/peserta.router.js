var express = require('express');
var router = express.Router();
var { registerKelompok } = require('../controllers/modul1/registerKelompok.controller');
var { uploadSurat } = require('../middlewares/multer.middleware');

router.post('/group-register', uploadSurat.any(['surat_pengantar','surat_balasan']), registerKelompok);

module.exports = router;
