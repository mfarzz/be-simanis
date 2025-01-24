var express = require('express');
var router = express.Router();
var { auth } = require('../middlewares/auth.middleware');
var { approveKelompok, rejectKelompok, getKelompokList } = require('../controllers/modul1/approvalKelompok.controller');
const { getAllBiodata, addBiodata,deleteBiodata } = require('../controllers/modul3/managementBiodata');
var {createTugas,editTugas, deleteTugas, getAllTugas} = require('../controllers/modul2/managementTugas.controller')
var {getUnitKerjaStatistics, getStatistikHarian,getStatistikBulanan,getStatistikTahunan} = require('../controllers/modul2/dashboard.controller')
var { upload } = require('../middlewares/foto.middleware')


//register
router.get('/list-kelompok',auth(['Admin']),getKelompokList)
router.put('/approve-user/:id', auth(['Admin']), approveKelompok);
router.put('/reject-user/:id', auth(['Admin']), rejectKelompok);

//biodata
router.get('/list-biodata',auth(['Admin']), getAllBiodata)
router.put('/add-biodata/:pesertaId',upload,auth(['Admin']),addBiodata)
router.delete('/delete-biodata/:pesertaId', auth(['Admin']), deleteBiodata);


//tugas
router.post('/add-tugas/:pesertaId', auth(['Admin']),createTugas)
router.put('/edit-tugas/:tugasId', auth(['Admin']),editTugas)
router.delete('/delete-tugas/:tugasId', auth(['Admin']), deleteTugas);
router.get('/list-tugas', auth(['Admin']), getAllTugas);

//dashboard
router.get('/unit-kerja-statistics',auth(['Admin']),getUnitKerjaStatistics);
router.get('/statistik-harian', auth(['Admin']), getStatistikHarian);
router.get('/statistik-bulanan', auth(['Admin']), getStatistikBulanan);
router.get('/statistik-tahunan', auth(['Admin']), getStatistikTahunan);


module.exports = router;