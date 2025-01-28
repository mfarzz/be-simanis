const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getPesertaTugas = async (req, res) => {
    try {
        const tugas = await prisma.tugas.findMany({
            where: {
                id_peserta: req.user.id
            },
            include: {
                pegawai: {
                    select: {
                        nama: true,
                        jabatan: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
 
        if (tugas.length === 0) {
            return res.status(404).json({
                message: "Belum ada tugas"
            });
        }
 
        return res.status(200).json({
            message: "Berhasil mengambil data tugas",
            data: tugas
        });
 
    } catch (error) {
        console.error("Error fetching tugas:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
 };



 const tugasSelesai = async (req, res) => {
    try {
        const { tugasId } = req.params;
        const { catatan } = req.body;

        // Ambil data tugas dengan informasi peserta
        const tugas = await prisma.tugas.findUnique({
            where: { id: String(tugasId) },
            include: {
                peserta: true,
                pegawai: true // Include pegawai untuk notifikasi
            }
        });

        if (!tugas) {
            return res.status(404).json({
                message: "Tugas tidak ditemukan"
            });
        }

        if (tugas.id_peserta !== req.user.id) {
            return res.status(403).json({
                message: "Anda tidak memiliki akses untuk mengedit tugas ini"
            });
        }

        const now = new Date();
        const status = now > tugas.deadline ? "Terlambat" : "Selesai";

        // Update status tugas
        const updatedTugas = await prisma.tugas.update({
            where: { id: String(tugasId) },
            data: {
                status,
                catatan: catatan || tugas.catatan,
                updatedAt: now
            }
        });

        // Buat notifikasi untuk pegawai
        await prisma.notifikasiPegawai.create({
            data: {
                id_peserta: tugas.id_pegawai, // ID pegawai yang memberi tugas
                tipe: "Tugas",
                pesan: `${tugas.peserta.nama} telah menyelesaikan tugas: ${tugas.deskripsi} (${status})${catatan ? ` - Catatan: ${catatan}` : ''}`,
                status: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        return res.status(200).json({
            message: "Status tugas berhasil diperbarui",
            data: updatedTugas
        });

    } catch (error) {
        console.error("Error updating tugas status:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {tugasSelesai, getPesertaTugas}