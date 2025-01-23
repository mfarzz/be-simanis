const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
    transporter,
    EMAIL_USER,
} = require("../../middlewares/transporter.middleware");

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

        await transporter.sendMail({
            from: EMAIL_USER,
            to: kelompok.email,
            subject: "Informasi Pendaftaran Kelompok",
            text: `Yth. Kelompok ${kelompok.nama_ketua},
Dengan hormat,

Kami sampaikan permohonan maaf bahwa pendaftaran kelompok Anda belum dapat kami terima. Untuk informasi lebih lanjut mengenai alasan penolakan, Anda dapat menghubungi panitia melalui kontak yang tersedia.

Kami mengucapkan terima kasih atas pengertian dan partisipasi Anda.

Hormat kami,
Badan Pusat Statistik Sumatera Barat`,
        });

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
    if (!id) {
        return res
            .status(400)
            .json({ error: "Bad Request - Missing required fields" });
    }
    try {
        const kelompok = await prisma.kelompok.findUnique({
            where: { id: id },
        });
        if (!kelompok) {
            return res
                .status(404)
                .json({ error: "Not Found - Kelompok not found" });
        }
        if (kelompok.status === "Diterima") {
            return res
                .status(400)
                .json({ error: "Bad Request - Kelompok sudah diterima" });
        }

        const nomor_kelompok = kelompok.instansi + uuidv4().slice(0, 8);

        await prisma.kelompok.update({
            where: { id: id },
            data: {
                status: "Diterima",
                nomor_kelompok,
            },
        });

        const mailOptions = {
            from: EMAIL_USER,
            to: kelompok.email,
            subject: "Konfirmasi Pendaftaran Kelompok Anda",
            text: `Yth. Kelompok ${kelompok.nama},
        
        Dengan hormat,
        
        Selamat! Pendaftaran kelompok Anda telah berhasil kami terima. Berikut adalah informasi kelompok Anda:
        
        Nomor Kelompok: ${nomor_kelompok}
        
        Harap menyimpan nomor kelompok ini untuk keperluan administrasi lebih lanjut. Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.
        
        Terima kasih atas partisipasi Anda.
        
        Hormat kami,
        Badan Pusat Statistik Sumatera Barat`,
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: "Kelompok berhasil diterima" });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { rejectKelompok, approveKelompok };
