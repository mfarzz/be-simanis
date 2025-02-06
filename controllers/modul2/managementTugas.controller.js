const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const {
    transporter,
    EMAIL_USER,
} = require("../../middlewares/transporter.middleware");

const createTugas = async (req, res) => {
    try {
        const { pesertaId } = req.params;
        const { deskripsi, deadline } = req.body;
        
        if (!deskripsi || !deadline) {
            return res.status(400).json({
                message: "Deskripsi dan deadline harus diisi"
            });
        }

        // Validate deadline format first
        const deadlineDate = new Date(deadline);
        if (isNaN(deadlineDate.getTime())) {
            return res.status(400).json({
                message: "Format deadline tidak valid"
            });
        }

        // Get peserta data
        const peserta = await prisma.peserta.findUnique({
            where: { id: pesertaId },
            include: {
                kelompok: true
            }
        });

        if (!peserta) {
            return res.status(404).json({
                message: "Peserta tidak ditemukan"
            });
        }

        // Format deadline untuk pesan notifikasi
        const deadlineFormat = deadlineDate.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Use transaction to ensure data consistency
        const result = await prisma.$transaction(async (prisma) => {
            // Create tugas
            const tugas = await prisma.tugas.create({
                data: {
                    id_peserta: pesertaId,
                    id_pegawai: req.user.id,
                    deskripsi,
                    deadline: deadlineDate,
                    status: "Pending"
                }
            });

            // Create notifikasi untuk peserta
            await prisma.notifikasiPeserta.create({
                data: {
                    id_peserta: pesertaId,
                    tipe: "Tugas",
                    pesan: `Anda mendapat tugas baru: ${deskripsi}. Deadline: ${deadlineFormat}`,
                    status: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            return tugas;
        });

        // Send response immediately
        res.status(201).json({
            message: "Tugas berhasil ditambahkan",
            data: result
        });

        // Send email asynchronously after response
        const mailOptions = {
            from: EMAIL_USER,
            to: peserta.email,
            subject: "Tugas Baru Telah Ditambahkan",
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                        border-radius: 10px;
                    }
                    .header {
                        background-color: #007bff;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: white;
                        padding: 20px;
                        border-radius: 0 0 5px 5px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    .task-details {
                        background-color: #f8f9fa;
                        padding: 15px;
                        border-left: 4px solid #007bff;
                        margin: 20px 0;
                    }
                    .deadline {
                        color: #dc3545;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                        color: #6c757d;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Tugas Baru</h2>
                    </div>
                    <div class="content">
                        <p>Yth. ${peserta.nama},</p>
                        <p>Anda telah menerima tugas baru dari pembimbing Anda di BPS Sumatera Barat.</p>
                        
                        <div class="task-details">
                            <h3>Detail Tugas:</h3>
                            <p><strong>Deskripsi:</strong><br>${deskripsi}</p>
                            <p class="deadline"><strong>Deadline:</strong><br>${deadlineFormat}</p>
                            <p><strong>Pembimbing:</strong><br>${req.user.nama}</p>
                        </div>

                        <p>Mohon segera tindak lanjuti tugas ini dan pastikan diselesaikan sebelum batas waktu yang ditentukan.</p>
                        
                        <p>Jika Anda memiliki pertanyaan, silakan hubungi pembimbing Anda atau balas email ini.</p>
                        
                        <div class="footer">
                            <p>Hormat kami,<br>
                            <strong>Badan Pusat Statistik</strong><br>
                            Sumatera Barat</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>`
        };

        // Send email asynchronously
        transporter.sendMail(mailOptions).catch((emailError) => {
            console.error("Email Error:", emailError);
        });

    } catch (error) {
        console.error("Error creating tugas:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

 const editTugas = async (req, res) => {
    try {
        const { tugasId } = req.params;
        const { deskripsi, deadline, status } = req.body;
 
        if (!tugasId) {
            return res.status(400).json({
                message: "ID tugas diperlukan"
            });
        }
 
        const tugas = await prisma.tugas.findUnique({
            where: { id: String(tugasId) }
        });
 
        if (!tugas) {
            return res.status(404).json({
                message: "Tugas tidak ditemukan"
            });
        }
 
        // Cek jika role Pegawai, validasi id_pegawai
        if (req.user.role === 'Pegawai' && tugas.id_pegawai !== req.user.id) {
            return res.status(403).json({
                message: "Anda tidak memiliki akses untuk mengedit tugas ini"
            });
        }
 
        const updatedTugas = await prisma.tugas.update({
            where: { id: String(tugasId) },
            data: {
                deskripsi: deskripsi || tugas.deskripsi,
                deadline: deadline ? new Date(deadline) : tugas.deadline,
                status: status || tugas.status,
                updatedAt: new Date()
            }
        });
 
        return res.status(200).json({
            message: "Tugas berhasil diperbarui",
            data: updatedTugas
        });
 
    } catch (error) {
        console.error("Error updating tugas:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
 };


 const deleteTugas = async (req, res) => {
    try {
        const { tugasId } = req.params;
 
        if (!tugasId) {
            return res.status(400).json({
                message: "ID tugas diperlukan"
            });
        }
 
        const tugas = await prisma.tugas.findUnique({
            where: { id: String(tugasId) }
        });
 
        if (!tugas) {
            return res.status(404).json({
                message: "Tugas tidak ditemukan"
            });
        }
 
        // Cek jika role Pegawai, validasi id_pegawai
        if (req.user.role === 'Pegawai' && tugas.id_pegawai !== req.user.id) {
            return res.status(403).json({
                message: "Anda tidak memiliki akses untuk menghapus tugas ini"
            });
        }
 
        await prisma.tugas.delete({
            where: { id: String(tugasId) }
        });
 
        return res.status(200).json({
            message: "Tugas berhasil dihapus"
        });
 
    } catch (error) {
        console.error("Error deleting tugas:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
 };


 const getAllTugas = async (req, res) => {
    try {
        const { sortBy = 'createdAt', sortOrder = 'asc' } = req.query;

        // Validasi sortOrder
        const order = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';

        // Daftar kolom yang bisa di-sort
        const validSortColumns = ['createdAt', 'deadline', 'status'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';

        const tugas = await prisma.tugas.findMany({
            include: {
                peserta: {
                    select: {
                        nama: true,
                        nim: true,
                    }
                },
                pegawai: {
                    select: {
                        nama: true
                    }
                }
            },
            orderBy: {
                [sortColumn]: order
            }
        });

        if (tugas.length === 0) {
            return res.status(404).json({
                message: "Belum ada tugas yang ditambahkan"
            });
        }

        return res.status(200).json({
            message: "Data tugas berhasil diambil",
            data: tugas
        });

    } catch (error) {
        console.error("Error fetching tugas:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports ={ createTugas, editTugas, deleteTugas, getAllTugas}