const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require("fs");

const registerKelompok = async (req, res) => {
    try {
        const { email, nama_ketua, jumlah_anggota, instansi } = req.body;
        
        if (!email || !nama_ketua || !jumlah_anggota || !instansi || !req.files?.length) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (req.files.length !== 2) {
            req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(400).json({ error: "Surat Pengantar and Surat Balasan are required" });
        }
    
        if (!email.endsWith('@gmail.com')) {
            return res.status(400).json({ message: 'Email harus menggunakan domain @gmail.com' });
        }

        if (parseInt(jumlah_anggota) < 1) {
            return res.status(400).json({ error: "Jumlah anggota must be at least 1" });
        }

        const emailExists = await prisma.kelompok.findFirst({ where: { email } });
        if (emailExists) {
            req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(400).json({ error: "Email already exists" });
        }

        const suratPengantar = req.files.find(f => f.fieldname === 'surat_pengantar');
        const suratBalasan = req.files.find(f => f.fieldname === 'surat_balasan');

        await prisma.kelompok.create({
            data: {
                email,
                nama_ketua,
                jumlah_anggota: parseInt(jumlah_anggota),
                instansi,
                surat_pengantar: suratPengantar?.path,
                surat_balasan: suratBalasan?.path,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        res.status(201).json({ message: "Kelompok created successfully" });
    } catch (error) {
        console.error("Register Kelompok Error:", error);
        if (req.files?.length) {
            req.files.forEach(file => fs.unlinkSync(file.path));
        }
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = {
    registerKelompok
}