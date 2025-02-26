const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  transporter,
  EMAIL_USER,
} = require("../../middlewares/transporter.middleware");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const getKelompokList = async (req, res) => {
  try {
    // Ambil semua data kelompok yang telah mendaftar
    const kelompokList = await prisma.kelompok.findMany({
      select: {
        id: true,
        nama_ketua: true,
        instansi: true,
        email: true,
        status: true,
        surat_balasan: true,
        surat_pengantar: true,
      },
    });
 
    // Kirim data kelompok dan total kelompok sebagai respons dengan status 200
    return res.status(200).json({
      message: kelompokList.length === 0 ? "Belum ada kelompok yang mendaftar" : "Data kelompok berhasil diambil",
      total_kelompok: kelompokList.length,
      kelompok: kelompokList
    });
 
  } catch (error) {
    console.error("Error fetching kelompok list:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
 };

const rejectKelompok = async (req, res) => {
  const { id } = req.params;
  const { catatan } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ error: "Bad Request - Missing required fields" });
  }

  if (!catatan || catatan.trim() === "") {
    return res
      .status(400)
      .json({ error: "Bad Request - Catatan penolakan wajib diisi" });
  }

  try {
    const kelompok = await prisma.kelompok.findUnique({
      where: { id: id },
    });

    if (!kelompok) {
      return res.status(404).json({ error: "Not Found - Kelompok not found" });
    }
    if (kelompok.status === "Ditolak") {
      return res
        .status(400)
        .json({ error: "Bad Request - Kelompok sudah ditolak" });
    }

    // Format tanggal Indonesia
    const currentDate = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let emailSent = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!emailSent && retryCount < maxRetries) {
      try {
        await transporter.sendMail({
          from: `BPS Sumatera Barat <${EMAIL_USER}>`,
          to: kelompok.email,
          subject: "Informasi Pendaftaran Kelompok PKL/Magang",
          html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
    <div style="margin-bottom: 20px;">
        <p>Tanggal  : ${currentDate}</p>
        <p>Perihal  : Informasi Pendaftaran PKL/Magang</p>
    </div>

    <p>Kepada Yth,<br>
    Kelompok ${kelompok.nama_ketua}<br>
    ${kelompok.instansi}</p>

    <p style="text-align: justify;">Dengan hormat,</p>

    <p style="text-align: justify;">
        Sehubungan dengan pengajuan permohonan Praktik Kerja Lapangan (PKL)/Magang yang telah 
        disampaikan, dengan ini kami informasikan bahwa permohonan kelompok Anda <strong>BELUM DAPAT KAMI TERIMA</strong>.
    </p>

    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
        <strong style="color: #dc3545;">Alasan Penolakan:</strong><br>
        ${catatan}
    </div>

    <p style="text-align: justify;">
        Kami menyarankan agar Anda meninjau kembali kelengkapan berkas dan persyaratan yang telah diajukan.
        Pastikan semua dokumen sudah sesuai dengan ketentuan yang berlaku. Jika sudah yakin, silakan ajukan kembali permohonan PKL/Magang melalui prosedur yang telah ditentukan.
    </p>

    <p style="text-align: justify;">
        Apabila Anda membutuhkan informasi lebih lanjut, silakan menghubungi kami melalui:
    </p>

    <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0;">
        <strong>Kontak BPS Provinsi Sumatera Barat:</strong><br>
        📞 Telepon: (0751) 451542<br>
        📧 Email: bps1300@bps.go.id<br>
        🌐 Website: sumbar.bps.go.id
    </div>

    <p style="text-align: justify;">
        Kami mengucapkan terima kasih atas pengertian dan partisipasi Anda.
    </p>

    <p style="margin-top: 30px;">
        Hormat kami,<br>
        <strong>Badan Pusat Statistik</strong><br>
        Provinsi Sumatera Barat
    </p>

    <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666;">
        <p>Email ini dikirim secara otomatis, mohon untuk tidak membalas email ini.</p>
    </div>
</div>

                    `,
        });
        emailSent = true;
      } catch (emailError) {
        retryCount++;
        console.error(`Email Error (Attempt ${retryCount}):`, emailError);

        if (retryCount === maxRetries) {
          return res.status(500).json({
            error: "Failed to send email after multiple attempts",
            details: emailError.message,
          });
        }
        // Tunggu sebentar sebelum mencoba lagi
        await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount));
      }
    }

    await prisma.kelompok.update({
      where: { id: id },
      data: {
        status: "Ditolak",
        catatan: catatan,
      },
    });

    return res.status(200).json({
      message: "Kelompok berhasil ditolak",
      catatan: catatan,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

const approveKelompok = async (req, res) => {
  const { id } = req.params;
  // Validasi ID
  if (!id) {
    return res
      .status(400)
      .json({ error: "Bad Request - Missing required fields" });
  }
  try {
    // Cek keberadaan kelompok berdasarkan ID
    const kelompok = await prisma.kelompok.findUnique({
      where: { id: id },
    });
    if (!kelompok) {
      return res.status(404).json({ error: "Not Found - Kelompok not found" });
    }
    // Cek status kelompok
    if (kelompok.status === "Diterima") {
      return res
        .status(400)
        .json({ error: "Bad Request - Kelompok sudah diterima" });
    }
    // Generate nomor kelompok
    const nomor_kelompok = `${kelompok.instansi}-${uuidv4().slice(0, 8)}`;
    // Update status kelompok di database
    await prisma.kelompok.update({
      where: { id: id },
      data: {
        status: "Diterima",
        nomor_kelompok,
      },
    });
    // Konfigurasi email
    const mailOptions = {
      from: EMAIL_USER,
      to: kelompok.email,
      subject: "Konfirmasi Pendaftaran Kelompok Anda",
      html: `Yth. Kelompok ${kelompok.nama_ketua},
<br><br>
Dengan hormat,
<br><br>
Selamat! Pendaftaran kelompok Anda telah berhasil kami terima. Berikut adalah informasi kelompok Anda:
<br><br>
Nomor Kelompok: <b>${nomor_kelompok}</b>
<br><br>
Harap menyimpan nomor kelompok ini untuk keperluan administrasi lebih lanjut. Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.
<br><br>
Terima kasih atas partisipasi Anda.
<br><br>
Hormat kami,
<br>
Badan Pusat Statistik Sumatera Barat`,
    };
    // Kirim email konfirmasi
    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Email Error:", emailError);
      return res
        .status(500)
        .json({ error: "Failed to send email confirmation" });
    }
    // Berikan respons sukses
    return res.status(200).json({ message: "Kelompok berhasil diterima" });
  } catch (error) {
    console.error("Internal Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const searchKelompok = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      const allKelompok = await prisma.kelompok.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      return res.json(allKelompok);
    }

    const searchResults = await prisma.kelompok.findMany({
      where: {
        OR: [
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            nama_ketua: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            instansi: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(searchResults);
  } catch (error) {
    console.error("Search Kelompok Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const previewDocument = async (req, res) => {
  try {
    const { filepath } = req.params;
    
    // Konstruksi path file
    const filePath = path.join(process.cwd(), filepath);
    
    console.log("Accessing file:", filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log("File not found:", filePath);
      return res.status(404).json({
        error: "File not found",
        path: filePath,
      });
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();

    // Set appropriate content type
    const contentType =
      {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
      }[ext] || "application/octet-stream";

    // Set response headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(filepath)}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on("error", (error) => {
      console.error("Error streaming file:", error);
      res.status(500).json({ error: "Error streaming file" });
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error("Preview Document Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

// Fungsi baru untuk download dokumen
const downloadDocument = async (req, res) => {
  try {
    const { filename } = req.params;

    // Extract document type from filename
    const isBalasan = filename.includes("surat_balasan");
    const folderName = isBalasan ? "suratBalasan" : "suratPengantar";

    // Construct path sesuai struktur folder
    const filePath = path.join(process.cwd(), "uploads", folderName, filename);

    // Debug log
    console.log("Downloading file:", filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log("File not found:", filePath);
      return res.status(404).json({
        error: "File not found",
        path: filePath,
      });
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();

    // Set appropriate content type
    const contentType =
      {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
      }[ext] || "application/octet-stream";

    // Set response headers for download
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on("error", (error) => {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: "Error downloading file" });
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error("Download Document Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

const getAdminNotifications = async (req, res) => {
  try {
    const { id: adminId } = req.user; // Ambil ID admin dari token JWT

    const notifications = await prisma.notifikasiPegawai.findMany({
      where: {
        id_peserta: adminId,
      },
      orderBy: {
        createdAt: "desc", // Notifikasi terbaru muncul duluan
      },
    });

    return res.status(200).json({
      message: "Notifikasi berhasil diambil",
      data: notifications,
    });
  } catch (error) {
    console.error("Get Admin Notifications Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getPegawaiNotifications = async (req, res) => {
  try {
    const { id: pegawaiId } = req.user; // Ambil ID admin dari token JWT

    const notifications = await prisma.notifikasiPegawai.findMany({
      where: {
        id_peserta: pegawaiId,
      },
      orderBy: {
        createdAt: "desc", // Notifikasi terbaru muncul duluan
      },
    });

    return res.status(200).json({
      message: "Notifikasi berhasil diambil",
      data: notifications,
    });
  } catch (error) {
    console.error("Get Admin Notifications Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Menandai notifikasi sudah dibaca
const markNotificationAsRead = async (req, res) => {
  try {
    const { id: adminId } = req.user; // ID admin dari token
    const { notificationId } = req.params; // ID notifikasi dari parameter URL

    // Cek apakah notifikasi ada dan milik admin tersebut
    const notification = await prisma.notifikasiPegawai.findFirst({
      where: {
        id: notificationId,
        id_peserta: adminId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notifikasi tidak ditemukan",
      });
    }

    // Update status notifikasi menjadi sudah dibaca
    await prisma.notifikasiPegawai.update({
      where: {
        id: notificationId,
      },
      data: {
        status: true,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: "Notifikasi telah dibaca",
    });
  } catch (error) {
    console.error("Mark Notification As Read Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Menandai semua notifikasi sudah dibaca
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { id: adminId } = req.user;

    // Update semua notifikasi yang belum dibaca
    await prisma.notifikasiPegawai.updateMany({
      where: {
        id_peserta: adminId,
        status: false,
      },
      data: {
        status: true,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: "Semua notifikasi telah dibaca",
    });
  } catch (error) {
    console.error("Mark All Notifications As Read Error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  rejectKelompok,
  approveKelompok,
  getKelompokList,
  searchKelompok,
  previewDocument,
  downloadDocument,
  getAdminNotifications,
  getPegawaiNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
