var express = require('express');
var router = express.Router();
var { auth } = require('../middlewares/auth.middleware');
var {createTugas,editTugas, deleteTugas, getAllTugas} = require('../controllers/modul2/managementTugas.controller')
var {getAllBiodata} = require('../controllers/modul3/managementBiodata')


//tugas
router.get('/list-tugas', auth(['Pegawai']), getAllTugas);
router.post('/add-tugas/:pesertaId', auth(['Pegawai']),createTugas)
router.put('/edit-tugas/:tugasId', auth(['Pegawai']),editTugas)
router.delete('/delete-tugas/:tugasId', auth(['Pegawai']), deleteTugas);
router.get('/list-peserta',auth(['Pegawai']), getAllBiodata)

module.exports = router;