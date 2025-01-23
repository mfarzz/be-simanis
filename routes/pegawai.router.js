var express = require('express');
var router = express.Router();
var { auth } = require('../middlewares/auth.middleware');
var { approveKelompok, rejectKelompok } = require('../controllers/modul1/approvalKelompok.controller');

router.put('/approve-user/:id', auth(['Admin']), approveKelompok);
router.put('/reject-user/:id', auth(['Admin']), rejectKelompok);

module.exports = router;