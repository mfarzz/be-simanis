var express = require('express');
var router = express.Router();
var { auth } = require('../middlewares/auth.middleware');
var { approveKelompok, rejectKelompok, getKelompokList, searchKelompok, previewDocument,downloadDocument, getAdminNotifications, markNotificationAsRead, markAllNotificationsAsRead } = require('../controllers/modul1/statusRegistrasiKelompok');
var {createPegawai, getAllPegawai, editPegawai, deletePegawai, getAllAccount} = require('../controllers/modul1/pengelolaanAkun.controller')

const { getAllBiodata, addBiodata,deleteBiodata } = require('../controllers/modul3/managementBiodata');
var {createTugas,editTugas, deleteTugas, getAllTugas} = require('../controllers/modul2/managementTugas.controller')
var {getUnitKerjaStatistics, getStatistikHarian,getStatistikBulanan,getStatistikTahunan, getStatistikMingguan} = require('../controllers/modul2/dashboard.controller')
var {uploadTemplate, getAllTemplates, chooseOneTemplate, deleteTemplate, generateSertifikat, downloadSertifikat, editTemplate, getTemplatePreview, previewTemplate} = require('../controllers/modul3/sertifikatManagement')

var { upload } = require('../middlewares/foto.middleware');
const templates = require('../middlewares/template.middleware');
const { getFotoPesertabyAdmin } = require('../controllers/modul3/biodataPeserta.controller');

//register
router.get('/list-kelompok',auth(['Admin']),getKelompokList)
router.put('/approve-user/:id', auth(['Admin']), approveKelompok);
router.put('/reject-user/:id', auth(['Admin']), rejectKelompok);
router.get('/search-kelompok', auth(['Admin']), searchKelompok); //modul pengarsipan surat bisa seacrhing berdasarkan gmail, nama ketua, dan instansi
router.get('/preview-surat/:filename', auth(['Admin']), previewDocument);
router.get('/download-surat/:filename', auth(['Admin']), downloadDocument);

//biodata
router.get('/list-biodata',auth(['Admin']), getAllBiodata)
router.put('/add-biodata/:pesertaId',upload,auth(['Admin']),addBiodata)
router.delete('/delete-biodata/:pesertaId', auth(['Admin']), deleteBiodata);
router.get('/get-foto-peserta/:id',auth(['Admin']),getFotoPesertabyAdmin)

//tugas
router.get('/list-tugas', auth(['Admin']), getAllTugas);
router.post('/add-tugas/:pesertaId', auth(['Admin']),createTugas)
router.put('/edit-tugas/:tugasId', auth(['Admin']),editTugas)
router.delete('/delete-tugas/:tugasId', auth(['Admin']), deleteTugas);

//dashboard
router.get('/unit-kerja-statistics',auth(['Admin']),getUnitKerjaStatistics);
router.get('/statistik-harian', auth(['Admin']), getStatistikHarian);
router.get('/statistik-mingguan', auth(['Admin']), getStatistikMingguan)
router.get('/statistik-bulanan', auth(['Admin']), getStatistikBulanan);
router.get('/statistik-tahunan', auth(['Admin']), getStatistikTahunan);

//sertifikat
router.post('/upload-template', auth(['Admin']), templates.single('file'), uploadTemplate);
router.get('/lihat-template/:id', auth(['Admin']), previewTemplate);
router.patch('/edit-template/:id', auth(['Admin']), templates.single('file'),editTemplate)
router.get('/list-template', auth(['Admin']), getAllTemplates);
router.get('/preview-template/:id', auth(["Admin"]), getTemplatePreview);
router.patch('/choose-template/:id', auth(['Admin']), chooseOneTemplate);
router.delete('/delete-template/:id', auth(['Admin']), deleteTemplate);
router.post('/generate-sertifikat/:pesertaId', auth(['Admin']), generateSertifikat); // waktu generate sertif oleh admin maka dia itu langsung mengubah status sertifikat jadi selesai dan jika nama panggilan atau biodata kosong maka belum bisa generate sertif
router.get('/download-sertifikat/:pesertaId', auth(['Admin']), downloadSertifikat);

//Pengelolaan akun 
router.get('/list-akun',auth(['Admin']), getAllPegawai)
router.get('/list-allakun',auth(['Admin']), getAllAccount)
router.post('/tambah-akun', auth(['Admin']), createPegawai)
router.put('/edit-akun/:id', auth(['Admin']), editPegawai);
router.delete('/hapus-akun/:id', auth(['Admin']), deletePegawai);

//notifikasi pendaftaran
router.get('/list-notif', auth(['Admin','Pegawai']), getAdminNotifications);
router.put('/mark-one/:notificationId/read', auth(['Admin','Pegawai']), markNotificationAsRead);
router.put('/mark-all/read-all', auth(['Admin']), markAllNotificationsAsRead);


//done sampai notif, akun dan juga perbaikan di sertif buat ngirim ke email



module.exports = router;