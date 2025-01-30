var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var bodyParser = require('body-parser');
var dotenv = require('dotenv');

var pesertaRouter = require('./routes/peserta.router');
var authRouter = require('./routes/auth.router');
var pegawaiRouter = require('./routes/pegawai.router');
var adminRouter = require('./routes/admin.router')

var app = express();

dotenv.config();


app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

app.use('/auth', authRouter);
app.use('/peserta', pesertaRouter);
app.use('/admin',adminRouter)
app.use('/pegawai', pegawaiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404).json({ 
    message: 'Not Found',
    status: 404
  });
})

// error handler
app.use(function(err, req, res, next) {
  // Log the error for server-side tracking
  console.error(err);

  // Send JSON response for errors
  res.status(err.status || 500).json({
    message: err.message,
    status: err.status || 500,
    // Only include error details in development
    ...(process.env.NODE_ENV === 'development' && { error: err })
  });
});

module.exports = app;
