const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()


const uploadTemplate = async (req, res) => {
    try {
        // Validasi apakah file diupload
        if (!req.file) {
            return res.status(400).json({ message: 'File template tidak ditemukan' });
        }

        // Ambil nama template dari body request
        const { nama } = req.body;

        // Tentukan path file yang diupload
        const filePath = req.file.path;

        // Simpan informasi template ke database
        const template = await prisma.templateSertifikat.create({
            data: {
                nama,
                file_path: filePath,
                status: 'Tidak Digunakan',  // Status default
            },
        });

        // Mengembalikan response dengan data template yang berhasil diupload
        res.status(201).json({ message: 'Template berhasil diunggah', template });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengunggah template' });
    }
};

const editTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama } = req.body;
        const filePath = req.file?.path;
 
        const existingTemplate = await prisma.templateSertifikat.findUnique({
            where: { id }
        });
 
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template tidak ditemukan' });
        }
 
        const updateData = {
            ...(nama && { nama }),
            ...(filePath && { file_path: filePath })
        };
 
        const template = await prisma.templateSertifikat.update({
            where: { id },
            data: updateData
        });
 
        res.status(200).json({
            message: 'Template berhasil diperbarui',
            template
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memperbarui template' });
    }
 };


const getAllTemplates = async (req, res) => {
    try {
        const templates = await prisma.templateSertifikat.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({
            JumlahTemplates: templates.length, // Menambahkan jumlah template
            message: 'Berhasil mendapatkan daftar template',
            templates,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: 'Terjadi kesalahan saat mengambil data template' 
        });
    }
};


const chooseOneTemplate = async (req, res) => {
    try {
        const { id } = req.params;

        // Reset semua template ke status 'Tidak Digunakan'
        await prisma.templateSertifikat.updateMany({
            data: {
                status: 'Tidak Digunakan'
            }
        });

        // Update template yang dipilih ke status 'Sedang Digunakan'
        const updatedTemplate = await prisma.templateSertifikat.update({
            where: { id: id }, // Hapus parseInt()
            data: { status: 'Sedang Digunakan' }
        });

        res.status(200).json({
            message: 'Status template berhasil diupdate',
            template: updatedTemplate
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            error: 'Terjadi kesalahan saat mengupdate status template' 
        });
    }
};


const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
 
        const template = await prisma.templateSertifikat.findUnique({
            where: { id }
        });
 
        if (!template) {
            return res.status(404).json({ message: 'Template tidak ditemukan' });
        }
 
        // Hapus file template dari storage
        const fs = require('fs');
        if (fs.existsSync(template.file_path)) {
            fs.unlinkSync(template.file_path);
        }
 
        // Hapus data dari database
        await prisma.templateSertifikat.delete({
            where: { id }
        });
 
        res.status(200).json({ message: 'Template berhasil dihapus' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal menghapus template' });
    }
 };


 const generateSertifikat = async (req, res) => {
    try {
        const Docxtemplater = require('docxtemplater');
        const PizZip = require('pizzip');
        const fs = require('fs');
        const { pesertaId } = req.params;
 
        const peserta = await prisma.peserta.findUnique({
            where: { id: pesertaId },
            include: {
                kelompok: true,
                template: true 
            }
        });
 
        if (!peserta.nama_penggilan) {
            return res.status(400).json({
                error: 'Nama penggilan / biodata lengkap peserta belum diisi. Sertifikat tidak dapat digenerate.'
            });
        }
 
        const selectedTemplate = await prisma.templateSertifikat.findFirst({
            where: { status: 'Sedang Digunakan' }
        });
 
        if (!selectedTemplate) {
            return res.status(400).json({
                error: 'Template sertifikat belum dipilih atau tidak ada template aktif'
            });
        }
 
        const latestPeserta = await prisma.peserta.findFirst({
            where: { nomor_peserta: { not: null } },
            orderBy: { nomor_peserta: 'desc' }
        });
 
        let nextNumber = 1;
        if (latestPeserta?.nomor_peserta) {
            nextNumber = parseInt(latestPeserta.nomor_peserta) + 1;
        }
        const nomor_peserta = String(nextNumber).padStart(3, '0');
 
        const content = fs.readFileSync(selectedTemplate.file_path, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);
 
        doc.render({
            nama: peserta.nama,
            jadwal_mulai: new Date(peserta.jadwal_mulai).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
            jadwal_selesai: new Date(peserta.jadwal_selesai).toLocaleDateString('id-ID', {
                day: 'numeric', 
                month: 'long',
                year: 'numeric'
            }),
            no_peserta: nomor_peserta,
            jurusan: peserta.jurusan,
            universitas: peserta.kelompok.instansi,
            tahun: new Date(peserta.jadwal_selesai).getFullYear()
        });
 
        const buffer = doc.getZip().generate({type: 'nodebuffer'});
        const newPath = `uploads/sertifikat/${Date.now()}-sertifikat.docx`;
        fs.writeFileSync(newPath, buffer);
 
        await prisma.peserta.update({
            where: { id: pesertaId },
            data: {
                nomor_peserta,
                sertifikat: newPath,
                status_sertifikat: 'Selesai',
                template_sertifikat_id: selectedTemplate.id || peserta.template_sertifikat_id
            }
        });
 
        res.status(200).json({ message: 'Sertifikat berhasil digenerate' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal generate sertifikat' });
    }
 };


 const downloadSertifikat = async (req, res) => {
    try {
        const libre = require('libreoffice-convert');
        libre.convertAsync = require('util').promisify(libre.convert);
        const fs = require('fs').promises;
        
        const pesertaId = req.user.role === 'User' ? req.user.id : req.params.pesertaId;
        
        const peserta = await prisma.peserta.findUnique({
            where: { id: pesertaId }
        });
 
        if (!peserta?.sertifikat) {
            return res.status(404).json({ message: 'Generate sertifikat terlebih dahulu (sertifikat belum tersedia untuk didownload)' });
        }
 
        const docxBuf = await fs.readFile(peserta.sertifikat);
        const pdfBuf = await libre.convertAsync(docxBuf, '.pdf', undefined);
        
        res.contentType('application/pdf');
        res.send(pdfBuf);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal download sertifikat' });
    }
 };

 const checkSertifikatStatus = async (req, res) => {
    try {
        // Ambil ID user dari sesi
        const pesertaId = req.user.id;

        // Cari data peserta berdasarkan ID user
        const peserta = await prisma.peserta.findUnique({
            where: { id: pesertaId },
            select: {
                id: true,
                nama: true,
                sertifikat: true,
                status_sertifikat: true
            }
        });

        // Validasi apakah peserta ditemukan
        if (!peserta) {
            return res.status(404).json({ message: 'Data peserta tidak ditemukan' });
        }

        // Periksa ketersediaan sertifikat
        if (peserta.sertifikat) {
            return res.status(200).json({
                message: 'Sertifikat tersedia,silahkan download',
                status: peserta.status_sertifikat,
                file_path: peserta.sertifikat
            });
        } else {
            return res.status(200).json({
                message: 'Sertifikat belum tersedia',
                status: peserta.status_sertifikat || 'Belum Digenerate'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal memeriksa status sertifikat' });
    }
};


module.exports = {
    uploadTemplate,
    editTemplate,
    getAllTemplates,
    chooseOneTemplate,
    deleteTemplate,
    generateSertifikat,
    downloadSertifikat,
    checkSertifikatStatus
};
