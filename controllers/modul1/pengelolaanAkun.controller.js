const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()


// Fungsi validasi email
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const createPegawai = async (req, res) => {
    try {
        const { email, password, nama, nip, jabatan, role } = req.body;

        // Validasi input
        if (!email || !password || !nama || !nip || !jabatan || !role) {
            return res.status(400).json({
                message: "Semua field harus diisi"
            });
        }

        // Validasi format email
        if (!validateEmail(email)) {
            return res.status(400).json({
                message: "Format email tidak valid"
            });
        }

        // Cek apakah email sudah terdaftar
        const existingEmail = await prisma.pegawai.findUnique({
            where: { email }
        });

        if (existingEmail) {
            return res.status(400).json({
                message: "Email sudah terdaftar"
            });
        }

        // Cek apakah NIP sudah terdaftar
        const existingNIP = await prisma.pegawai.findFirst({
            where: { nip }
        });

        if (existingNIP) {
            return res.status(400).json({
                message: "NIP sudah terdaftar"
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Buat pegawai baru
        const newPegawai = await prisma.pegawai.create({
            data: {
                email,
                password: hashedPassword,
                nama,
                nip,
                jabatan,
                role,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        // Hapus password dari response
        const { password: _, ...pegawaiData } = newPegawai;

        return res.status(201).json({
            message: "Pegawai berhasil ditambahkan",
            data: pegawaiData
        });

    } catch (error) {
        console.error("Create Pegawai Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};


// Fungsi baru untuk mendapatkan semua akun pegawai
const getAllPegawai = async (req, res) => {
    try {
        // Ambil data pegawai dengan sorting berdasarkan createdAt descending (terbaru dulu)
        // dan tambahkan filter untuk exclude role Admin
        const pegawai = await prisma.pegawai.findMany({
            where: {
                role: {
                    not: 'Admin' // Filter out Admin roles
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                email: true,
                nama: true,
                nip: true,
                jabatan: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                // Tidak memilih field password untuk keamanan
            }
        });

        return res.status(200).json({
            message: "Data pegawai berhasil diambil",
            data: pegawai
        });

    } catch (error) {
        console.error("Get All Pegawai Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const getAllAccount = async (req, res) => {
    try {
        // Ambil data pegawai dengan sorting berdasarkan createdAt descending (terbaru dulu)
        // dan tambahkan filter untuk exclude role Admin
        const pegawai = await prisma.pegawai.findMany({
            select: {
                id: true,
                email: true,
                nama: true,
                nip: true,
                jabatan: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                // Tidak memilih field password untuk keamanan
            }
        });

        return res.status(200).json({
            message: "Data pegawai berhasil diambil",
            data: pegawai
        });

    } catch (error) {
        console.error("Get All Pegawai Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// Fungsi baru untuk mengedit akun pegawai
const editPegawai = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, nama, nip, jabatan, role } = req.body;

        // Cek apakah pegawai ada
        const existingPegawai = await prisma.pegawai.findUnique({
            where: { id }
        });

        if (!existingPegawai) {
            return res.status(404).json({
                message: "Pegawai tidak ditemukan"
            });
        }

        // Validasi input yang wajib
        if (!nama || !jabatan || !role) {
            return res.status(400).json({
                message: "Nama, jabatan, dan role harus diisi"
            });
        }

        // Jika email diubah, validasi email baru
        if (email && email !== existingPegawai.email) {
            if (!validateEmail(email)) {
                return res.status(400).json({
                    message: "Format email tidak valid"
                });
            }

            // Cek apakah email baru sudah digunakan
            const emailExists = await prisma.pegawai.findFirst({
                where: {
                    email,
                    NOT: {
                        id
                    }
                }
            });

            if (emailExists) {
                return res.status(400).json({
                    message: "Email sudah digunakan"
                });
            }
        }

        // Jika NIP diubah, validasi NIP baru
        if (nip && nip !== existingPegawai.nip) {
            const nipExists = await prisma.pegawai.findFirst({
                where: {
                    nip,
                    NOT: {
                        id
                    }
                }
            });

            if (nipExists) {
                return res.status(400).json({
                    message: "NIP sudah digunakan"
                });
            }
        }

        // Siapkan data update
        const updateData = {
            nama,
            jabatan,
            role,
            updatedAt: new Date()
        };

        // Tambahkan email ke data update jika ada
        if (email) {
            updateData.email = email;
        }

        // Tambahkan NIP ke data update jika ada
        if (nip) {
            updateData.nip = nip;
        }

        // Update password jika ada
        if (password) {
            const saltRounds = 10;
            updateData.password = await bcrypt.hash(password, saltRounds);
        }

        // Update pegawai
        const updatedPegawai = await prisma.pegawai.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                nama: true,
                nip: true,
                jabatan: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return res.status(200).json({
            message: "Data pegawai berhasil diupdate",
            data: updatedPegawai
        });

    } catch (error) {
        console.error("Update Pegawai Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// Fungsi baru untuk menghapus akun pegawai
const deletePegawai = async (req, res) => {
    try {
        const { id } = req.params;

        // Cek apakah pegawai ada
        const existingPegawai = await prisma.pegawai.findUnique({
            where: { id }
        });

        if (!existingPegawai) {
            return res.status(404).json({
                message: "Pegawai tidak ditemukan"
            });
        }

        // Cek apakah mencoba menghapus akun admin terakhir
        if (existingPegawai.role === 'Admin') {
            const adminCount = await prisma.pegawai.count({
                where: {
                    role: 'Admin'
                }
            });

            if (adminCount <= 1) {
                return res.status(400).json({
                    message: "Tidak dapat menghapus admin terakhir"
                });
            }
        }

        // Hapus pegawai
        await prisma.pegawai.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Pegawai berhasil dihapus",
            data: {
                id,
                email: existingPegawai.email,
                nama: existingPegawai.nama
            }
        });

    } catch (error) {
        console.error("Delete Pegawai Error:", error);
        
        // Handling foreign key constraint error
        if (error.code === 'P2003') {
            return res.status(400).json({
                message: "Tidak dapat menghapus pegawai karena masih memiliki data terkait (tugas/notifikasi)"
            });
        }

        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};





module.exports = {
    createPegawai,
    getAllPegawai,
    getAllAccount,
    editPegawai,
    deletePegawai
};