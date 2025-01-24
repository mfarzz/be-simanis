var express = require('express');
var router = express.Router();
var { registerKelompok, registerPeserta } = require('../controllers/modul1/registerKelompok.controller');
var { uploadSurat } = require('../middlewares/multer.middleware');
const { addBiodata, deleteBiodata } = require('../controllers/modul3/biodataPeserta.controller');
const { getPesertaTugas,tugasSelesai} = require ('../controllers/modul2/tugasPeserta.controller')
var { auth } = require('../middlewares/auth.middleware');
var { upload } = require('../middlewares/foto.middleware')

//register
router.post('/group-register', uploadSurat.any(['surat_pengantar','surat_balasan']), registerKelompok);
router.post('/peserta-register',registerPeserta)

//biodata
router.put('/add-biodata',upload,auth(['User']),addBiodata)
router.delete('/delete-biodata', auth(['User']), deleteBiodata);


//tugas
router.get('/my-tugas', auth(['User']), getPesertaTugas);
router.put('/tugas-selesai/:tugasId', auth(['User']), tugasSelesai);

module.exports = router;
