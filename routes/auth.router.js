var express = require('express');
var router = express.Router();
var { auth } = require('../middlewares/auth.middleware');
var { login, refreshAccessToken, logout } = require('../controllers/modul1/auth.controller');

router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', auth(['Admin','Pegawai','User']), logout);

module.exports = router;