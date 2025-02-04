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

        // Return status 200 even if no tasks are found
        if (tugas.length === 0) {
            return res.status(200).json({
                message: "Belum ada tugas",
                data: []
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

const getPesertaTugasStatistic = async (req, res) => {
    try {
        // Get all tasks for the participant
        const tugas = await prisma.tugas.findMany({
            where: {
                id_peserta: req.user.id
            }
        });

        if (tugas.length === 0) {
            return res.status(200).json({
                message: "Belum ada data statistik tugas",
                data: {
                    total_tugas: 0,
                    status_summary: {},
                    deadline_summary: {
                        upcoming: 0,
                        passed: 0
                    },
                    completion_rate: {
                        total: 0,
                        completed: 0,
                        percentage: "0.00"
                    }
                }
            });
        }

        // Calculate status summary
        const status_summary = tugas.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});

        // Calculate deadline statistics
        const now = new Date();
        const deadline_summary = {
            upcoming: tugas.filter(task => new Date(task.deadline) > now).length,
            passed: tugas.filter(task => new Date(task.deadline) <= now).length
        };

        // Calculate completion rate
        const completion_rate = {
            total: tugas.length,
            completed: tugas.filter(task => task.status === 'Selesai').length,
            percentage: (tugas.filter(task => task.status === 'Selesai').length / tugas.length * 100).toFixed(2)
        };

        return res.status(200).json({
            message: "Berhasil mengambil statistik tugas",
            data: {
                total_tugas: tugas.length,
                status_summary,
                deadline_summary,
                completion_rate
            }
        });

    } catch (error) {
        console.error("Error fetching tugas statistics:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getPesertaNotifications = async (req, res) => {
    try {
        const { id: pesertaId } = req.user; // Ambil ID admin dari token JWT

        const notifications = await prisma.notifikasiPeserta.findMany({
            where: {
                id_peserta: pesertaId
            },
            orderBy: {
                createdAt: 'desc' // Notifikasi terbaru muncul duluan
            }
        });

        return res.status(200).json({
            message: "Notifikasi berhasil diambil",
            data: notifications
        });

    } catch (error) {
        console.error("Get Admin Notifications Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};


const markNotificationAsRead = async (req, res) => {
    try {
        const { id: pesertaId } = req.user; // ID admin dari token
        const { notificationId } = req.params; // ID notifikasi dari parameter URL

        // Cek apakah notifikasi ada dan milik admin tersebut
        const notification = await prisma.notifikasiPeserta.findFirst({
            where: {
                id: notificationId,
                id_peserta: pesertaId
            }
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notifikasi tidak ditemukan"
            });
        }

        // Update status notifikasi menjadi sudah dibaca
        await prisma.notifikasiPeserta.update({
            where: {
                id: notificationId
            },
            data: {
                status: true,
                updatedAt: new Date()
            }
        });

        return res.status(200).json({
            message: "Notifikasi telah dibaca"
        });

    } catch (error) {
        console.error("Mark Notification As Read Error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports = {tugasSelesai, getPesertaTugas,getPesertaTugasStatistic, getPesertaNotifications, markNotificationAsRead}