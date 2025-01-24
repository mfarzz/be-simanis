const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getUnitKerjaStatistics = async (req, res) => {
    try {
        // Query untuk menghitung jumlah peserta berdasarkan unit_kerja
        const statistics = await prisma.peserta.groupBy({
            by: ['unit_kerja'],
            _count: {
                unit_kerja: true,
            },
        });

        // Format hasil statistik per unit kerja
        const formattedStatistics = statistics.map((stat) => ({
            unitKerja: stat.unit_kerja || 'Tidak Ditentukan', // Jika null
            count: stat._count.unit_kerja,
        }));

        // Hitung total divisi dan peserta
        const totalPeserta = statistics.reduce((sum, stat) => sum + stat._count.unit_kerja, 0);
        const totalDivisi = statistics.length;

        // Gabungkan hasil
        const result = {
            statistics: formattedStatistics,
            totalDivisi,
            totalPeserta,
        };

        res.status(200).json({
            message: "Statistik unit kerja dan total divisi berhasil diambil",
            data: result,
        });
    } catch (error) {
        console.error("Error fetching unit kerja statistics:", error);
        res.status(500).json({
            message: "Terjadi kesalahan saat mengambil data",
        });
    }
};


// Statistik Harian
const getStatistikHarian = async (req, res) => {
    try {
        const now = new Date();
        const harian = await prisma.peserta.groupBy({
            by: ['createdAt'],
            where: {
                createdAt: {
                    gte: new Date(now.setDate(now.getDate() - 7))
                }
            },
            _count: true
        });
 
        return res.status(200).json({
            message: "Statistik harian berhasil diambil",
            data: harian.map(h => ({
                tanggal: h.createdAt,
                jumlah: h._count
            }))
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
 };
 
 // Statistik Bulanan
 const getStatistikBulanan = async (req, res) => {
    try {
        const bulanan = await prisma.$queryRaw`
            SELECT 
                DATE_TRUNC('month', "createdAt") as month,
                COUNT(*) as count
            FROM "Peserta"
            WHERE "createdAt" >= NOW() - INTERVAL '1 year'
            GROUP BY DATE_TRUNC('month', "createdAt")
            ORDER BY month DESC
        `;
 
        return res.status(200).json({
            message: "Statistik bulanan berhasil diambil",
            data: bulanan.map(b => ({
                bulan: b.month,
                jumlah: Number(b.count)
            }))
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
 };
 
 // Statistik Tahunan
 const getStatistikTahunan = async (req, res) => {
    try {
        const tahunan = await prisma.$queryRaw`
            SELECT 
                DATE_TRUNC('year', "createdAt") as year,
                COUNT(*) as count
            FROM "Peserta"
            GROUP BY DATE_TRUNC('year', "createdAt")
            ORDER BY year DESC
        `;
 
        return res.status(200).json({
            message: "Statistik tahunan berhasil diambil",
            data: tahunan.map(t => ({
                tahun: t.year,
                jumlah: Number(t.count)
            }))
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
 };




module.exports = {getUnitKerjaStatistics, getStatistikHarian, getStatistikBulanan, getStatistikTahunan}
