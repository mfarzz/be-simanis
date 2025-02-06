const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const path = require('path');
const fs = require('fs');

const getBiodata = async (req, res) => {
    if (!req.user?.id) {
        return res.status(400).json({ error: "User tidak terautentikasi" });
    }

    try {
        const biodata = await prisma.peserta.findUnique({
            where: { id: req.user.id },
            include: {
                RiwayatPendidikan: true
            }
        });

        if (!biodata) {
            return res.status(404).json({ error: "Biodata tidak ditemukan" });
        }

        res.status(200).json({
            message: "Biodata berhasil diambil",
            data: biodata
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Terjadi kesalahan saat mengambil biodata",
            details: error.message
        });
    }
};

const getMyProfile = async (req, res) => {
    if (!req.user?.id) {
        return res.status(400).json({ error: "Peserta tidak terautentikasi" });
    }
 
    try {
        const profile = await prisma.peserta.findUnique({
            where: { id: req.user.id },
            include: {
                kelompok: {
                    select: {
                        instansi: true
                    }
                }
            }
        });
 
        if (!profile) {
            return res.status(404).json({ error: "Profile tidak ditemukan" });
        }
 
        res.status(200).json({
            message: "Berhasil mendapatkan profile",
            data: profile
        });
 
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Gagal mendapatkan profile", 
            details: error.message
        });
    }
 };


const getFotoPeserta = async (req, res) => {
    if (!req.user?.id) {
        return res.status(400).json({ error: "User tidak terautentikasi" });
    }

    try {
        // Cari data peserta untuk mendapatkan nama file foto
        const peserta = await prisma.peserta.findUnique({
            where: { id: req.user.id },
            select: { foto: true }
        });

        if (!peserta || !peserta.foto) {
            return res.status(404).json({ error: "Foto tidak ditemukan" });
        }

        // Sesuaikan path dengan struktur folder project Anda
        // Misalnya jika foto disimpan di folder 'public/uploads/photos'
        const filePath = path.join(__dirname, '../../uploads/photos', peserta.foto);

        // Verifikasi file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: "File foto tidak ditemukan",
                path: filePath // untuk debugging
            });
        }

        // Kirim file sebagai response
        res.sendFile(filePath);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Terjadi kesalahan saat mengambil foto",
            details: error.message
        });
    }
};


const getFotoPegawai = async (req, res) => {
    if (!req.user?.id) {
        return res.status(400).json({ error: "Pegawai tidak terautentikasi" });
    }
 
    try {
        const pegawai = await prisma.pegawai.findUnique({
            where: { id: req.user.id },
            select: { foto: true }
        });
 
        if (!pegawai || !pegawai.foto) {
            return res.status(404).json({ error: "Foto tidak ditemukan" });
        }
 
        const filePath = path.join(__dirname, '../../uploads/photos', pegawai.foto);
 
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: "File foto tidak ditemukan",
                path: filePath
            });
        }
 
        res.sendFile(filePath);
 
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Terjadi kesalahan saat mengambil foto",
            details: error.message
        });
    }
 };

const getFotoPesertabyAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        const peserta = await prisma.peserta.findUnique({
            where: { id },
            select: { foto: true }
        });

        // Jika peserta tidak ditemukan
        if (!peserta) {
            return res.status(404).json({ 
                error: "Data peserta tidak ditemukan" 
            });
        }

        // Jika foto belum diisi, kirim response 200 dengan pesan
        if (!peserta.foto) {
            return res.status(200).json({ 
                message: "Foto profil belum diisi",
                status: "NO_PHOTO"
            });
        }

        const filePath = path.join(__dirname, '../../uploads/photos', peserta.foto);
        
        // Cek keberadaan file
        if (!fs.existsSync(filePath)) {
            return res.status(200).json({
                message: "File foto tidak ditemukan di server",
                status: "FILE_NOT_FOUND"
            });
        }

        // Kirim file foto jika semua pengecekan berhasil
        res.sendFile(filePath);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Terjadi kesalahan saat mengambil foto peserta",
            details: error.message
        });
    }
};

const getProfile = async (req, res) => {
    if (!req.user?.id) {
        return res.status(400).json({ error: "Pegawai tidak terautentikasi" });
    }
 
    try {
        const profile = await prisma.pegawai.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                nama: true,
                email: true,
                nip: true,
                jabatan: true,
                role: true,
                foto: true
            }
        });
 
        if (!profile) {
            return res.status(404).json({ error: "Profile tidak ditemukan" });
        }
 
        res.status(200).json({
            message: "Berhasil mendapatkan profile",
            data: profile
        });
 
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Gagal mendapatkan profile",
            details: error.message
        });
    }
 };


 const addProfilePhotobyPeserta = async (req, res) => {
    if (!req.user?.id) {
        return res.status(400).json({ error: "Pegawai tidak terautentikasi" });
    }

    try {
        await prisma.peserta.update({
            where: { id: req.user.id },
            data: {
                foto: req.file ? req.file.filename : undefined,
                updatedAt: new Date()
            }
        });

        res.status(200).json({
            message: "Foto berhasil diupdate",
            foto: req.file ? req.file.filename : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Gagal mengupload foto",
            details: error.message
        });
    }
};


const addProfilePhotobyPegawai = async (req, res) => {
    if (!req.user?.id) {
        return res.status(400).json({ error: "Pegawai tidak terautentikasi" });
    }

    try {
        await prisma.pegawai.update({
            where: { id: req.user.id },
            data: {
                foto: req.file ? req.file.filename : undefined,
                updatedAt: new Date()
            }
        });

        res.status(200).json({
            message: "Foto berhasil diupdate",
            foto: req.file ? req.file.filename : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Gagal mengupload foto",
            details: error.message
        });
    }
};

const addBiodata = async (req, res) => {
    const {
        nama_penggilan, tempat_lahir, tanggal_lahir, anak_ke, jumlah_saudara,
        ip, nama_ibu, pekerjaan_ibu, nama_ayah, pekerjaan_ayah, agama,
        no_hp, alamat, alamat_domisili, alasan, keahlian, unit_kerja, 
        jadwal_mulai, jadwal_selesai, riwayat_pendidikan
    } = req.body;

    if (!req.user?.id) {
        return res.status(400).json({ error: "User tidak terautentikasi" });
    }

    try {
        const parsedRiwayat = typeof riwayat_pendidikan === 'string' 
            ? JSON.parse(riwayat_pendidikan) 
            : riwayat_pendidikan;

        await prisma.$transaction(async (prisma) => {
            await prisma.peserta.update({
                where: { id: req.user.id },
                data: {
                    nama_penggilan,
                    tempat_lahir,
                    tanggal_lahir: new Date(tanggal_lahir),
                    anak_ke: anak_ke ? parseInt(anak_ke) : null,
                    jumlah_saudara: jumlah_saudara ? parseInt(jumlah_saudara) : null,
                    ip: ip ? parseFloat(ip) : null,
                    nama_ibu,
                    pekerjaan_ibu, 
                    nama_ayah,
                    pekerjaan_ayah,
                    agama,
                    no_hp,
                    alamat,
                    alamat_domisili,
                    alasan,
                    keahlian,
                    unit_kerja,
                    jadwal_mulai: new Date(jadwal_mulai),
                    jadwal_selesai: new Date(jadwal_selesai),
                    foto: req.file ? req.file.filename : undefined,
                    updatedAt: new Date()
                }
            });

            await prisma.riwayatPendidikan.deleteMany({
                where: { id_peserta: req.user.id }
            });

            if (Array.isArray(parsedRiwayat) && parsedRiwayat.length > 0) {
                await prisma.riwayatPendidikan.createMany({
                    data: parsedRiwayat.map(rp => ({
                        id_peserta: req.user.id,
                        ...rp,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }))
                });
            }
        });

        res.status(200).json({ 
            message: "Data berhasil diupdate",
            foto: req.file ? req.file.filename : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Terjadi kesalahan saat memperbarui data",
            details: error.message
        });
    }
};


const deleteBiodata = async (req, res) => {
    if (!req.user?.id) {
        return res.status(400).json({ error: "User tidak terautentikasi" });
    }
 
    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.riwayatPendidikan.deleteMany({
                where: { id_peserta: req.user.id }
            });
 
            await prisma.peserta.update({
                where: { id: req.user.id },
                data: {
                    nama_penggilan: null,
                    tempat_lahir: null,
                    tanggal_lahir: null,
                    anak_ke: null,
                    jumlah_saudara: null,
                    ip: null,
                    nama_ibu: null, 
                    pekerjaan_ibu: null,
                    nama_ayah: null,
                    pekerjaan_ayah: null,
                    agama: null,
                    no_hp: null,
                    alamat: null,
                    alamat_domisili: null,
                    alasan: null,
                    keahlian: null,
                    unit_kerja: null,
                    jadwal_mulai: null,
                    jadwal_selesai: null,
                    foto: null,
                    updatedAt: new Date()
                }
            });
        });
 
        res.status(200).json({ message: "Biodata berhasil dihapus, Silahkan isi kembali" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Terjadi kesalahan saat menghapus biodata",
            details: error.message
        });
    }
 };


module.exports = {
    addBiodata,
    deleteBiodata,
    getBiodata,
    getMyProfile,
    getFotoPeserta,
    getProfile,
    getFotoPegawai,
    getFotoPesertabyAdmin,
    addProfilePhotobyPeserta,
    addProfilePhotobyPegawai
};
