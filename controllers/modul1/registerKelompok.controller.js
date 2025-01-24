const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require("fs");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require('uuid');


const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};


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

const registerPeserta = async (req, res) => {
    const { nomor_kelompok, email, password, nama, nim, jurusan } = req.body;
 
    try {
        // Cek status kelompok
        const kelompok = await prisma.kelompok.findFirst({
            where: { 
                nomor_kelompok,
                status: "Diterima" // Hanya kelompok yang sudah diterima
            }
        });
 
        if (!kelompok) {
            return res.status(404).json({ error: "Nomor kelompok tidak valid atau kelompok belum diterima" });
        }
 
        // Cek duplikat email
        const emailExists = await prisma.peserta.findUnique({ where: { email } });
        if (emailExists) {
            return res.status(400).json({ error: "Email sudah terdaftar" });
        }
 
        // Cek duplikat NIM 
        const nimExists = await prisma.peserta.findUnique({ where: { nim } });
        if (nimExists) {
            return res.status(400).json({ error: "NIM sudah terdaftar" });
        }
 
        // Cek jumlah anggota
        const jumlahPeserta = await prisma.peserta.count({
            where: { id_kelompok: kelompok.id }
        });
 
        if (jumlahPeserta >= kelompok.jumlah_anggota) {
            return res.status(400).json({ error: "Jumlah maksimal peserta sudah tercapai" });
        }
 
        const hashedPassword = await hashPassword(password);
        
        // Remove nomor_peserta field
        const peserta = await prisma.peserta.create({
            data: {
                id_kelompok: kelompok.id,
                email,
                password: hashedPassword,
                nama,
                nim,
                jurusan,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        return res.status(201).json({
            message: "Registrasi peserta berhasil",
            data: peserta
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};



module.exports = {
    registerKelompok,
    registerPeserta
}