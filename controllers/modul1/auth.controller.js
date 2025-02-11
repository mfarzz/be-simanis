const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const JWT_SECRET = process.env.JWT_SECRET;
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const {
    transporter,
    EMAIL_USER,
} = require("../../middlewares/transporter.middleware");

const generateTokens = (user) => {
    const tokenPayload = {
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1d" });
    const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: "7d",
    });

    return { accessToken, refreshToken };
};

const setCookieOptions = (isProduction) => ({
    httpOnly: true,
    secure: isProduction === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProduction === "production" ? "Strict" : "Lax",
});

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let user = null;
        let role = null;

        // Cari user di tabel peserta
        user = await prisma.peserta.findFirst({ where: { email } });
        if (user) {
            role = "Peserta";
        } else {
            // Jika tidak ditemukan di peserta, cari di tabel pegawai
            user = await prisma.pegawai.findFirst({ where: { email } });
            if (user) {
                // Tentukan role berdasarkan data user
                if (user.role === 'Admin') {
                    role = "Admin";
                } else {
                    role = "Pegawai";
                }
            }
        }

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Verifikasi password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate token
        const { accessToken, refreshToken } = generateTokens(user);

        // Kirim refreshToken sebagai cookie
        res.cookie(
            "refreshToken",
            refreshToken,
            setCookieOptions(process.env.NODE_ENV)
        );

        // Response dengan accessToken dan role
        res.json({
            message: "Login berhasil",
            accessToken,
            role, // Sertakan role dalam response
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};


const logout = async (req, res) => {
    try {
        // Hapus refresh token dari cookie
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
        });
        res.status(200).json({
            message: "Logout successful",
        });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({
            error: "Error during logout",
            details: error.message || "An unexpected error occurred",
        });
    }
};

const refreshAccessToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
    }

    try {
        jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
            if (err) {
                return res
                    .status(403)
                    .json({ error: "Invalid or expired refresh token" });
            }

            // Jika refresh token valid, buat access token baru
            const newAccessToken = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    nama: user.nama,
                    role: user.role,
                },
                JWT_SECRET,
                { expiresIn: "1d" } // Access token berlaku 1 jam
            );

            res.json({ accessToken: newAccessToken });
        });
    } catch (error) {
        console.error("Refresh Token Error:", error);
        res.status(500).json({
            error: "Error refreshing access token",
            details: error.message || "An unexpected error occurred",
        });
    }
};

const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email harus diisi"
            });
        }

        // Cek apakah email terdaftar
        const user = await prisma.peserta.findFirst({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({
                message: "Email tidak terdaftar"
            });
        }

        // Generate OTP 6 digit
        const kode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Set waktu kadaluarsa OTP (5 menit dari sekarang)
        const expiredAt = new Date(Date.now() + 5 * 60 * 1000);

        // Simpan OTP baru
        await prisma.otp.create({
            data: {
                id_user: user.id,
                kode,
                expiredAt,
                status: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        // Konfigurasi email
        const mailOptions = {
            from: EMAIL_USER,
            to: email,
            subject: "Kode OTP untuk Reset Password",
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Reset Password - Kode OTP</h2>
                    <br>
                    <p>Yth. ${user.nama},</p>
                    <br>
                    <p>Berikut adalah kode OTP Anda untuk reset password:</p>
                    <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${kode}</h1>
                    <p>Kode OTP ini akan kadaluarsa dalam 5 menit.</p>
                    <br>
                    <p>Jika Anda tidak meminta reset password, mohon abaikan email ini.</p>
                    <br>
                    <p>Hormat kami,</p>
                    <p>Badan Pusat Statistik Sumatera Barat</p>
                    <br>
                    <p style="color: #666; font-size: 12px;">Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
                </div>
            `
        };

        // Kirim email dengan error handling yang lebih detail
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent: %s', info.messageId); // Untuk debugging
            
            return res.status(200).json({
                message: "OTP berhasil dikirim ke email",
                email: email
            });
        } catch (emailError) {
            console.error("Email Error Detail:", emailError);
            return res.status(500).json({ 
                message: "Gagal mengirim email OTP",
                error: emailError.message 
            });
        }

    } catch (error) {
        console.error("Send OTP Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { kode, newPassword } = req.body;

        // Validasi input
        if (!kode || !newPassword) {
            return res.status(400).json({
                message: "Kode OTP dan password baru harus diisi"
            });
        }

        // Cari OTP yang valid
        const otp = await prisma.otp.findFirst({
            where: {
                kode: kode,
                status: false,
                expiredAt: {
                    gt: new Date()
                }
            },
            include: {
                peserta: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!otp) {
            return res.status(400).json({
                message: "Kode OTP tidak valid atau sudah kadaluarsa"
            });
        }

        // Hash password baru
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password user
        await prisma.peserta.update({
            where: { id: otp.id_user },
            data: {
                password: hashedPassword,
                updatedAt: new Date()
            }
        });

        // Update status OTP
        await prisma.otp.update({
            where: { id: otp.id },
            data: {
                status: true,
                updatedAt: new Date()
            }
        });

        // Kirim email konfirmasi
        const mailOptions = {
            from: EMAIL_USER,
            to: otp.peserta.email,
            subject: "Konfirmasi Reset Password Berhasil",
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Konfirmasi Reset Password</h2>
                    <br>
                    <p>Yth. ${otp.peserta.nama},</p>
                    <br>
                    <p>Password akun Anda telah berhasil diubah pada:</p>
                    <p style="font-weight: bold;">${new Date().toLocaleString('id-ID', { 
                        timeZone: 'Asia/Jakarta',
                        dateStyle: 'full', 
                        timeStyle: 'long' 
                    })}</p>
                    <br>
                    <p>Jika Anda tidak melakukan perubahan password ini, segera hubungi administrator.</p>
                    <br>
                    <p style="color: #666;">Untuk keamanan:</p>
                    <ul style="color: #666;">
                        <li>Jangan bagikan password Anda kepada siapapun</li>
                        <li>Gunakan password yang kuat dan unik</li>
                        <li>Ganti password Anda secara berkala</li>
                    </ul>
                    <br>
                    <p>Hormat kami,</p>
                    <p>Badan Pusat Statistik Sumatera Barat</p>
                    <br>
                    <p style="color: #666; font-size: 12px;">Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error("Email Error:", emailError);
            // Tetap return success meski email gagal terkirim
            // karena password sudah berhasil diubah
            return res.status(200).json({
                message: "Password berhasil diubah, namun email konfirmasi gagal terkirim"
            });
        }

        return res.status(200).json({
            message: "Password berhasil diubah dan email konfirmasi telah dikirim"
        });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const getPublicAnalytics = async (req, res) => {
    try {
      // Get all analytics in parallel for better performance
      const [uniqueInstitutions, totalParticipants, departmentStats] = await Promise.all([
        // Count unique institutions
        prisma.kelompok.findMany({
          select: {
            instansi: true,
          },
          distinct: ['instansi'],
        }),
  
        // Count total participants
        prisma.peserta.count(),
  
        // Get department statistics
        prisma.peserta.groupBy({
          by: ['jurusan'],
          _count: {
            jurusan: true,
          },
        })
      ]);
  
      const response = {
        total_instansi: uniqueInstitutions.length,
        total_peserta: totalParticipants,
        total_jurusan: departmentStats.length,
        statistik: {
          instansi: uniqueInstitutions.map(item => item.instansi),
          jurusan: departmentStats.map(stat => ({
            nama: stat.jurusan,
            jumlah: stat._count.jurusan
          }))
        }
      };
  
      return res.status(200).json({
        status: 'success',
        data: response
      });
  
    } catch (error) {
      console.error('Public Analytics Error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data'
      });
    }
  };







module.exports = { login, logout, refreshAccessToken,sendOTP,resetPassword,getPublicAnalytics };
