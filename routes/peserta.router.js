var express = require('express');
var router = express.Router();
var { registerKelompok, registerPeserta } = require('../controllers/modul1/registerKelompok.controller');
var { uploadSurat } = require('../middlewares/multer.middleware');
const { addBiodata, deleteBiodata, getBiodata, getFotoPeserta } = require('../controllers/modul3/biodataPeserta.controller');
const { getPesertaTugas,tugasSelesai, getPesertaTugasStatistic} = require ('../controllers/modul2/tugasPeserta.controller')
var { auth } = require('../middlewares/auth.middleware');
var { upload } = require('../middlewares/foto.middleware');
var {downloadSertifikat, checkSertifikatStatus, previewSertif} = require('../controllers/modul3/sertifikatManagement')

//register
router.post('/group-register', uploadSurat.any(['surat_pengantar','surat_balasan']), registerKelompok);
router.post('/peserta-register',registerPeserta);

//biodata
router.get('/get-biodata',auth(['User']), getBiodata);
router.put('/add-biodata',upload,auth(['User']),addBiodata);
router.delete('/delete-biodata', auth(['User']), deleteBiodata);
router.get('/get-foto',auth(['User']),getFotoPeserta)

//tugas
router.get('/my-tugas', auth(['User']), getPesertaTugas);
router.put('/tugas-selesai/:tugasId', auth(['User']), tugasSelesai);// nandain tugas selesai bisa jadi telat atau selesai tergantung waktu ngirim
router.get('/statistik-tugas',auth(['User']), getPesertaTugasStatistic)

//sertifikat
router.get('/check-sertifikat-status', auth(['User']), checkSertifikatStatus);
router.get('/preview-sertif', auth(['User']),previewSertif)
router.get('/download-sertifikat', auth(['User']), downloadSertifikat); //baru bisa download setelah admin menggenerate

//YEAYY SEKARANG DAH BISA TAMPIL PREVIEW SERTIFNYA DI BAGIAN PESERTA :D



module.exports = router;
