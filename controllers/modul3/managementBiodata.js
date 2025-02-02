const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getAllBiodata = async (req, res) => {
    try {
        // Ambil semua biodata peserta beserta riwayat pendidikannya
        const biodatas = await prisma.peserta.findMany({
            include: {
                RiwayatPendidikan: true
            }
        });

        // Hitung jumlah total peserta
        const totalPeserta = await prisma.peserta.count();

        res.status(200).json({
            total: totalPeserta,  // Menyertakan jumlah total peserta
            biodatas: biodatas    // Menyertakan data biodata peserta
        });
    } catch (error) {
        res.status(500).json({
            error: "Gagal mengambil data biodata",
            details: error.message
        });
    }
};


const addBiodata = async (req, res) => {
    const { pesertaId } = req.params;
    const {
        nama_penggilan, tempat_lahir, tanggal_lahir, anak_ke, jumlah_saudara,
        ip, nama_ibu, pekerjaan_ibu, nama_ayah, pekerjaan_ayah, agama,
        no_hp, alamat, alamat_domisili, alasan, keahlian, unit_kerja, 
        jadwal_mulai, jadwal_selesai, riwayat_pendidikan
    } = req.body;

    try {
        const parsedRiwayat = typeof riwayat_pendidikan === 'string' 
            ? JSON.parse(riwayat_pendidikan) 
            : riwayat_pendidikan;

        await prisma.$transaction(async (prisma) => {
            await prisma.peserta.update({
                where: { id: pesertaId },
                data: {
                    nama_penggilan,
                    tempat_lahir,
                    tanggal_lahir: tanggal_lahir ? new Date(tanggal_lahir) : undefined,
                    anak_ke: anak_ke ? parseInt(anak_ke) : undefined,
                    jumlah_saudara: jumlah_saudara ? parseInt(jumlah_saudara) : undefined,
                    ip: ip ? parseFloat(ip) : undefined,
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
                    jadwal_mulai: jadwal_mulai ? new Date(jadwal_mulai) : undefined,
                    jadwal_selesai: jadwal_selesai ? new Date(jadwal_selesai) : undefined,
                    foto: req.file?.filename,
                    updatedAt: new Date()
                }
            });

            if (parsedRiwayat) {
                await prisma.riwayatPendidikan.deleteMany({
                    where: { id_peserta: pesertaId }
                });

                if (Array.isArray(parsedRiwayat) && parsedRiwayat.length > 0) {
                    await prisma.riwayatPendidikan.createMany({
                        data: parsedRiwayat.map(rp => ({
                            id_peserta: pesertaId,
                            ...rp,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }))
                    });
                }
            }
        });

        res.status(200).json({
            message: "Data berhasil diupdate",
            foto: req.file?.filename
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
    const { pesertaId } = req.params;
 
    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.riwayatPendidikan.deleteMany({
                where: { id_peserta: pesertaId }
            });
 
            await prisma.peserta.update({
                where: { id: pesertaId },
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
 
        res.status(200).json({ message: "Biodata mahasiswa berhasil dihapus" });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Gagal menghapus biodata mahasiswa",
            details: error.message
        });
    }
 };
 
 module.exports = {
    getAllBiodata,
    addBiodata,
    deleteBiodata
 };