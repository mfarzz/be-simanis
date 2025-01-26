const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
    transporter,
    EMAIL_USER,
} = require("../../middlewares/transporter.middleware");
const { v4: uuidv4 } = require('uuid');


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
            },
        });

        // Jika tidak ada kelompok yang terdaftar
        if (kelompokList.length === 0) {
            return res.status(404).json({ 
                message: "Belum ada kelompok yang mendaftar",
                total_kelompok: 0 
            });
        }

        // Kirim data kelompok dan total kelompok sebagai respons
        return res.status(200).json({
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
    if (!id) {
        return res
            .status(400)
            .json({ error: "Bad Request - Missing required fields" });
    }
    try {
        const kelompok = await prisma.kelompok.findUnique({
            where: { id: id },
        });

        console.log(kelompok);
        if (!kelompok) {
            return res
                .status(404)
                .json({ error: "Not Found - Kelompok not found" });
        }
        if (kelompok.status === "Ditolak") {
            return res
                .status(400)
                .json({ error: "Bad Request - Kelompok sudah ditolak" });
        }

        try {
            await transporter.sendMail({
                from: EMAIL_USER,
                to: kelompok.email,
                subject: "Informasi Pendaftaran Kelompok Anda",
                text: `Yth. Kelompok ${kelompok.nama_ketua},
                
                Dengan hormat,

                Kami sampaikan permohonan maaf bahwa pendaftaran kelompok Anda belum dapat kami terima. Untuk informasi lebih lanjut mengenai alasan penolakan, Anda dapat menghubungi panitia melalui kontak yang tersedia.

                Kami mengucapkan terima kasih atas pengertian dan partisipasi Anda.

                Hormat kami,
                Badan Pusat Statistik Sumatera Barat`,
            });
        } catch (emailError) {
            console.error("Email Error:", emailError);
            return res.status(500).json({ error: "Failed to send email" });
        }

        await prisma.kelompok.update({
            where: { id: id },
            data: { status: "Ditolak" },
        });

        return res.status(200).json({ message: "Kelompok berhasil ditolak" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
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
            return res
                .status(404)
                .json({ error: "Not Found - Kelompok not found" });
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


module.exports = { rejectKelompok, approveKelompok, getKelompokList };
