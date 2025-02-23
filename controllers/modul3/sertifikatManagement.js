const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { transporter, EMAIL_USER } = require('../../middlewares/transporter.middleware');
const path = require('path');
const mammoth = require('mammoth');
const libre = require('libreoffice-convert');
const fs = require('fs').promises; // Pakai promises langsung dari fs
const util = require('util');

// Convert libreoffice-convert ke promise
const convertAsync = util.promisify(libre.convert);

// Pastikan direktori ada sebelum memulai
const uploadDir = 'uploads/templates/';
(async () => {
    try {
        await fs.mkdir(uploadDir, { recursive: true });
        console.log('Direktori uploads/templates berhasil dibuat atau sudah ada');
    } catch (err) {
        console.error('Gagal membuat direktori upload:', err);
    }
})();

const uploadTemplate = async (req, res) => {
    let previewPath = '';
    let filePath = '';

    try {
        // Validasi apakah file diupload
        if (!req.file) {
            return res.status(400).json({ message: 'File template tidak ditemukan' });
        }

        // Ambil nama template dari body request
        const { nama } = req.body;

        // Tentukan path file yang diupload
        filePath = req.file.path;

        // Cek apakah file benar-benar ada
        try {
            await fs.access(filePath, fs.constants.F_OK);
        } catch (err) {
            throw new Error('File yang diunggah tidak ditemukan di server');
        }

        // Generate preview path (PDF)
        previewPath = path.join(
            uploadDir,
            `preview_${path.basename(req.file.filename, '.docx')}.pdf`
        );

        // Baca file DOCX
        const docxFile = await fs.readFile(filePath);

        // Convert DOCX ke PDF
        let pdfBuffer;
        try {
            pdfBuffer = await convertAsync(docxFile, '.pdf', undefined);
            if (!pdfBuffer) throw new Error('Hasil konversi PDF kosong');
        } catch (conversionError) {
            console.error('Error saat mengkonversi file:', conversionError);
            throw new Error('Gagal mengkonversi file ke PDF');
        }

        // Simpan PDF preview
        await fs.writeFile(previewPath, pdfBuffer);

        // Simpan informasi template ke database
        const template = await prisma.templateSertifikat.create({
            data: {
                nama,
                file_path: filePath,
                template_preview: previewPath,
                status: 'Tidak Digunakan',
            },
        });

        // Response sukses
        return res.status(201).json({
            message: 'Template berhasil diunggah',
            template,
        });

    } catch (error) {
        console.error('Error di uploadTemplate:', error);

        // Cleanup files jika terjadi error
        try {
            if (filePath && (await fs.access(filePath).then(() => true).catch(() => false))) {
                await fs.unlink(filePath);
            }
            if (previewPath && (await fs.access(previewPath).then(() => true).catch(() => false))) {
                await fs.unlink(previewPath);
            }
        } catch (cleanupError) {
            console.error('Error saat pembersihan:', cleanupError);
        }

        // Penanganan error spesifik
        if (error.message.includes('PDF')) {
            return res.status(500).json({
                error: 'Gagal membuat preview PDF',
                details: error.message,
            });
        }
        if (error.code === 'ENOENT' || error.message.includes('tidak ditemukan')) {
            return res.status(500).json({
                error: 'File tidak ditemukan di server',
                details: error.message,
            });
        }

        return res.status(500).json({
            error: 'Terjadi kesalahan saat mengunggah template',
            details: error.message,
        });
    }
};

const previewTemplate = async (req, res) => {
    try {
        // Ambil id template dari parameter
        const { id } = req.params;

        // Cari template berdasarkan id
        const template = await prisma.templateSertifikat.findUnique({
            where: {
                id
            }
        });

        // Jika template tidak ditemukan
        if (!template) {
            return res.status(404).json({ message: 'Template tidak ditemukan' });
        }

        // Cek apakah file preview ada
        if (!template.template_preview || !fs.existsSync(template.template_preview)) {
            return res.status(404).json({ message: 'File preview tidak ditemukan' });
        }

        // Set header untuk PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="preview_${template.nama}.pdf"`);

        // Streaming file PDF
        const fileStream = fs.createReadStream(template.template_preview);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error in previewTemplate:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat menampilkan preview template' });
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
            orderBy: { createdAt: 'desc' }
        });

        const templatesWithURL = templates.map(template => ({
            ...template,
            fileUrl: `http://localhost:3000/${template.file_path.replace(/\\/g, "/")}`
        }));

        res.status(200).json({
            JumlahTemplates: templates.length,
            message: 'Berhasil mendapatkan daftar template',
            templates: templatesWithURL,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data template' });
    }
};

const getTemplatePreview = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id || typeof id !== "string" || id.trim() === "") {
        return res.status(400).json({ message: "ID template tidak valid" });
      }
  
      // Ambil template terbaru dari database
      const template = await prisma.templateSertifikat.findFirst({
        where: { id: id },
        orderBy: { updatedAt: "desc" }, // Pastikan yang terbaru
      });
      
  
      if (!template) {
        return res.status(404).json({ message: "Template tidak ditemukan" });
      }
  
      // Ambil path file terbaru
      const filePath = path.join(__dirname, "../..", template.file_path);
  
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File template tidak ditemukan" });
      }
  
      // Baca file terbaru
      const buffer = fs.readFileSync(filePath);
  
      // Konversi DOCX ke HTML dengan pengaturan tambahan
      const result = await mammoth.convertToHtml({
        buffer: buffer,
        options: {
          styleMap: [
            "p[style-name='Section Title'] => h1:fresh",
            "p[style-name='Subsection Title'] => h2:fresh",
          ],
          ignoreEmptyParagraphs: true,
          preserveCustomProperties: true,
        },
      });
  
      // Tambahkan styling agar tampilan lebih baik
      const styledHtml = `
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          h1 { color: #2563eb; }
          h2 { color: #1e40af; }
          p { margin-bottom: 1em; }
        </style>
        ${result.value}
      `;
  
      res.status(200).json({
        message: "Preview berhasil diambil",
        htmlContent: styledHtml,
        templateId: template.id,
        templateNama: template.nama,
        lastUpdated: template.updatedAt, // Tambahkan informasi waktu update terakhir
        warnings: result.warnings,
      });
    } catch (error) {
      console.error("Error previewing document:", error);
  
      res.status(500).json({
        message: "Gagal menampilkan preview",
        error: error.message,
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


const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');

const generateSertifikat = async (req, res) => {
    try {
        const { pesertaId } = req.params;

        // Ambil data peserta dengan include kelompok dan template
        const peserta = await prisma.peserta.findUnique({
            where: { id: pesertaId },
            include: {
                kelompok: true,
                template: true 
            }
        });

        if (!peserta.nama_penggilan) {
            return res.status(400).json({
                error: 'Biodata lengkap peserta belum diisi. Sertifikat tidak dapat digenerate.'
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

        // Format tanggal untuk dokumen
        const tanggalMulai = new Date(peserta.jadwal_mulai).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const tanggalSelesai = new Date(peserta.jadwal_selesai).toLocaleDateString('id-ID', {
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });

        doc.render({
            nama: peserta.nama,
            jadwal_mulai: tanggalMulai,
            jadwal_selesai: tanggalSelesai,
            no_peserta: nomor_peserta,
            jurusan: peserta.jurusan,
            universitas: peserta.kelompok.instansi,
            tahun: new Date(peserta.jadwal_selesai).getFullYear()
        });

        const libre = require('libreoffice-convert');
const util = require('util');
const convertAsync = util.promisify(libre.convert);

const convertToPDF = async (docxPath, pdfPath) => {
  try {
    const docxBuffer = await fs.promises.readFile(docxPath);
    const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
    await fs.promises.writeFile(pdfPath, pdfBuffer);
    return true;
  } catch (error) {
    console.error('Error converting to PDF:', error);
    return false;
  }
};

        // Generate docx file
const buffer = doc.getZip().generate({type: 'nodebuffer'});
const timestamp = Date.now();
const docxPath = `uploads/sertifikat/${timestamp}-sertifikat.docx`;
const pdfPath = `uploads/sertifikat/${timestamp}-sertifikat.pdf`;

// Simpan file docx
fs.writeFileSync(docxPath, buffer);

try {
    // Coba konversi ke PDF
    await convertToPDF(docxPath, pdfPath);
    
    // Update data peserta dengan kedua path
    await prisma.peserta.update({
        where: { id: pesertaId },
        data: {
            nomor_peserta,
            sertifikat: docxPath,          // Path untuk file DOCX
            sertifikat_preview: pdfPath,    // Path untuk file PDF
            status_sertifikat: 'Selesai',
            template_sertifikat_id: selectedTemplate.id || peserta.template_sertifikat_id,
            status_peserta: 'Nonaktif'
        }
    });
} catch (conversionError) {
    console.error('Error converting to PDF:', conversionError);
    // Jika konversi gagal, tetap simpan docx
    await prisma.peserta.update({
        where: { id: pesertaId },
        data: {
            nomor_peserta,
            sertifikat: docxPath,
            status_sertifikat: 'Selesai',
            template_sertifikat_id: selectedTemplate.id || peserta.template_sertifikat_id,
            status_peserta: 'Nonaktif'
        }
    });
}

        // Buat notifikasi untuk peserta
        await prisma.notifikasiPeserta.create({
            data: {
                id_peserta: pesertaId,
                tipe: "Sertifikat",
                pesan: `Sertifikat magang Anda telah selesai dibuat. Silahkan download di menu sertifikat.`,
                status: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        // Kirim email ke peserta
        try {
            const emailTemplate = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background-color: #06255c;
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
                        .info-box {
                            background-color: #f0f7ff;
                            padding: 15px;
                            border-left: 4px solid #06255c;
                            margin: 20px 0;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            font-size: 12px;
                            color: #666;
                        }
                        .button {
                            display: inline-block;
                            padding: 10px 20px;
                            background-color: #06255c;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>SERTIFIKAT MAGANG TELAH TERSEDIA</h1>
                            <p>Badan Pusat Statistik Sumatera Barat</p>
                        </div>
                        <div class="content">
                            <p>Yth. ${peserta.nama},</p>
                            
                            <p>Kami dengan senang hati memberitahukan bahwa sertifikat magang Anda telah selesai diproses.</p>
                            
                            <div class="info-box">
                                <h3>Informasi Peserta:</h3>
                                <p><strong>Nomor Peserta:</strong> ${nomor_peserta}</p>
                                <p><strong>Periode Magang:</strong> ${tanggalMulai} - ${tanggalSelesai}</p>
                                <p><strong>Instansi:</strong> ${peserta.kelompok.instansi}</p>
                                <p><strong>Jurusan:</strong> ${peserta.jurusan}</p>
                            </div>

                            <p>Sertifikat Anda dapat diunduh melalui aplikasi SIMANIS dengan mengikuti langkah berikut:</p>
                            <ol>
                                <li>Login ke aplikasi SIMANIS</li>
                                <li>Akses menu Sertifikat</li>
                                <li>Klik tombol Download untuk mengunduh sertifikat Anda</li>
                            </ol>

                            <p>Selamat atas penyelesaian program magang Anda!</p>
                            
                            <div class="footer">
                                <p>Email ini dikirim secara otomatis oleh sistem SIMANIS BPS Sumatera Barat.</p>
                                <p>© ${new Date().getFullYear()} Badan Pusat Statistik Sumatera Barat. All rights reserved.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await transporter.sendMail({
                from: EMAIL_USER,
                to: peserta.email,
                subject: `[SIMANIS BPS] Sertifikat Magang - ${peserta.nama}`,
                html: emailTemplate
            });

            res.status(200).json({ 
                message: 'Sertifikat berhasil digenerate dan notifikasi telah dikirim ke peserta' 
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            // Tetap return success karena sertifikat berhasil dibuat
            res.status(200).json({ 
                message: 'Sertifikat berhasil digenerate tetapi gagal mengirim email' 
            });
        }

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

const previewSertif = async (req, res) => {
    try {
        const pesertaId = req.user.id;

        const peserta = await prisma.peserta.findUnique({
            where: { id: pesertaId },
            select: { sertifikat_preview: true, status_sertifikat: true }
        });

        if (!peserta) {
            return res.status(404).json({ error: 'Peserta tidak ditemukan' });
        }

        // Jika status sertifikat belum selesai atau belum ada sertifikat
        if (peserta.status_sertifikat !== 'Selesai' || !peserta.sertifikat_preview) {
            return res.status(200).json({ 
                message: 'Sertifikat belum tersedia',
                status: 'Pending'
            });
        }

        const projectRoot = path.resolve(__dirname, '../..');
        const filePath = path.join(projectRoot, peserta.sertifikat_preview);

        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }

        return res.status(200).json({ 
            message: 'Sertifikat belum tersedia',
            status: 'Pending',
            details: { storedPath: peserta.sertifikat_preview }
        });

    } catch (error) {
        console.error('Error Preview Sertifikat:', error);
        return res.status(500).json({ 
            error: 'Gagal menampilkan sertifikat',
            message: error.message 
        });
    }
};


module.exports = {
    uploadTemplate,
    previewTemplate,
    editTemplate,
    getAllTemplates,
    getTemplatePreview,
    chooseOneTemplate,
    deleteTemplate,
    generateSertifikat,
    downloadSertifikat,
    checkSertifikatStatus,
    previewSertif
};
