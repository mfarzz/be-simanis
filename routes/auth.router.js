var express = require('express');
var router = express.Router();
var { auth } = require('../middlewares/auth.middleware');
var { login, refreshAccessToken, logout, resetPassword, getPublicAnalytics } = require('../controllers/modul1/auth.controller');
var {sendOTP} = require('../controllers/modul1/auth.controller')

router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', auth(['Admin','Pegawai','User']), logout);
router.post('/send-otp', sendOTP);
router.post('/lupa-password',resetPassword)
router.get('/publik-statistik',getPublicAnalytics)


module.exports = router;