var express = require('express');
var router = express.Router();
var { registerKelompok, registerPeserta } = require('../controllers/modul1/registerKelompok.controller');
var { uploadSurat } = require('../middlewares/multer.middleware');
const { addBiodata, deleteBiodata, getBiodata, getFotoPeserta, getMyProfile, addProfilePhotobyPeserta } = require('../controllers/modul3/biodataPeserta.controller');
const { getPesertaTugas,tugasSelesai, getPesertaTugasStatistic, getPesertaNotifications, markNotificationAsRead} = require ('../controllers/modul2/tugasPeserta.controller')
var { auth } = require('../middlewares/auth.middleware');
var { upload } = require('../middlewares/foto.middleware');
var {downloadSertifikat, checkSertifikatStatus, previewSertif} = require('../controllers/modul3/sertifikatManagement');
const { createLogbook, getMyLogbook, editLogbook, deleteLogbook } = require('../controllers/modulTambahan/modulPeserta.controller');

//profile
router.get('/profile', auth(['User']), getMyProfile);
router.put('/update-photo', upload, auth(['User']), addProfilePhotobyPeserta);


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
router.get('/notif-peserta',auth(['User']), getPesertaNotifications)
router.put('/mark-one/:notificationId/read', auth(['User']), markNotificationAsRead);



//sertifikat
router.get('/check-sertifikat-status', auth(['User']), checkSertifikatStatus);
router.get('/preview-sertif', auth(['User']),previewSertif)
router.get('/download-sertifikat', auth(['User']), downloadSertifikat); //baru bisa download setelah admin menggenerate


//logbook
router.get('/my-logbook', auth(['User']), getMyLogbook);
router.post('/add-logbook', auth(['User']), createLogbook);
router.put('/edit-logbook/:id', auth(['User']), editLogbook);
router.delete('/delete-logbook/:id', auth(['User']), deleteLogbook);

//YEAYY SEKARANG DAH BISA TAMPIL PREVIEW SERTIFNYA DI BAGIAN PESERTA :D




module.exports = router;
