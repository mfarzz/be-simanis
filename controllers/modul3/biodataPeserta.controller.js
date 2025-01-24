const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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
    deleteBiodata
};
