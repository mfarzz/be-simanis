const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const createTugas = async (req, res) => {
    try {
        const { pesertaId } = req.params;
        const { deskripsi, deadline } = req.body;
        
        if (!deskripsi || !deadline) {
            return res.status(400).json({
                message: "Deskripsi dan deadline harus diisi"
            });
        }

        const peserta = await prisma.peserta.findUnique({
            where: { id: pesertaId }
        });

        if (!peserta) {
            return res.status(404).json({
                message: "Peserta tidak ditemukan"
            });
        }

        const tugas = await prisma.tugas.create({
            data: {
                id_peserta: pesertaId,
                id_pegawai: req.user.id,
                deskripsi,
                deadline: new Date(deadline),
                status: "Pending"
            }
        });

        return res.status(201).json({
            message: "Tugas berhasil ditambahkan",
            data: tugas
            
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