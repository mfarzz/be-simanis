const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getUnitKerjaStatistics = async (req, res) => {
    try {
        // Hitung jumlah peserta berdasarkan status
        const statusStats = await prisma.peserta.groupBy({
            by: ['status_peserta'],
            _count: {
                id: true
            }
        });

        // Format status peserta statistics
        const peserta_summary = statusStats.reduce((acc, stat) => {
            acc[stat.status_peserta] = stat._count.id;
            return acc;
        }, {
            Aktif: 0,
            Nonaktif: 0
        });

        // Pertama, dapatkan total peserta AKTIF yang unit_kerja nya null
        const nullCount = await prisma.peserta.count({
            where: {
                unit_kerja: null,
                status_peserta: 'Aktif'  // Tambahkan filter status aktif
            }
        });

        // Query untuk menghitung jumlah peserta AKTIF berdasarkan unit_kerja yang tidak null
        const statistics = await prisma.peserta.groupBy({
            by: ['unit_kerja'],
            _count: {
                unit_kerja: true,
            },
            where: {
                unit_kerja: {
                    not: null
                },
                status_peserta: 'Aktif'  // Tambahkan filter status aktif
            },
            orderBy: {
                unit_kerja: 'asc'
            }
        });

        // Format hasil statistik per unit kerja
        let formattedStatistics = statistics.map((stat) => ({
            unitKerja: stat.unit_kerja,
            count: stat._count.unit_kerja,
        }));

        // Tambahkan data untuk unit kerja yang null (hanya yang aktif)
        if (nullCount > 0) {
            formattedStatistics.push({
                unitKerja: 'Tidak Ditentukan',
                count: nullCount
            });
        }

        // Hitung total divisi (TIDAK termasuk kategori 'Tidak Ditentukan')
        const totalDivisi = statistics.length;

        // Hitung total peserta aktif (termasuk yang null)
        const totalPeserta = statistics.reduce((sum, stat) => 
            sum + stat._count.unit_kerja, 0) + nullCount;

        // Gabungkan hasil
        const result = {
            statistics: formattedStatistics,
            totalDivisi,
            totalPeserta,
            peserta_summary,
            peserta_aktif: peserta_summary.Aktif || 0,
            peserta_nonaktif: peserta_summary.Nonaktif || 0
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


const getStatistikHarian = async (req, res) => {
    try {
        const now = new Date();
        const startDate = new Date(now.setDate(now.getDate() - 7)); // Tanggal 7 hari terakhir

        // Query untuk mengambil data berdasarkan tanggal saja
        const harian = await prisma.peserta.groupBy({
            by: ['createdAt'],
            where: {
                createdAt: {
                    gte: startDate
                }
            },
            _count: true
        });

        // Map data untuk mengelompokkan berdasarkan tanggal saja
        const groupedByDate = harian.reduce((acc, item) => {
            const dateKey = item.createdAt.toISOString().split('T')[0]; // Ambil tanggal saja
            if (!acc[dateKey]) {
                acc[dateKey] = 0;
            }
            acc[dateKey] += item._count;
            return acc;
        }, {});

        // Format data menjadi array
        const result = Object.keys(groupedByDate).map(date => ({
            tanggal: date,
            jumlah: groupedByDate[date]
        }));

        return res.status(200).json({
            message: "Statistik harian berhasil diambil",
            data: result
        });
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const getStatistikMingguan = async (req, res) => {
    try {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1); // Ambil data 1 bulan terakhir

        // Query untuk mengambil data mentah
        const rawData = await prisma.peserta.findMany({
            where: {
                createdAt: {
                    gte: startDate
                }
            },
            select: {
                createdAt: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Fungsi helper untuk mendapatkan tanggal awal minggu (Senin)
        const getStartOfWeek = (date) => {
            const newDate = new Date(date);
            const day = newDate.getDay();
            const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
            newDate.setDate(diff);
            // Reset waktu ke 00:00:00
            newDate.setHours(0, 0, 0, 0);
            return newDate;
        };

        // Fungsi helper untuk mendapatkan tanggal akhir minggu (Minggu)
        const getEndOfWeek = (startDate) => {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            // Set waktu ke 23:59:59
            endDate.setHours(23, 59, 59, 999);
            return endDate;
        };

        // Mengelompokkan data berdasarkan minggu
        const weeklyData = rawData.reduce((acc, item) => {
            const date = new Date(item.createdAt);
            const startOfWeek = getStartOfWeek(date);
            const endOfWeek = getEndOfWeek(startOfWeek);
            
            // Hitung nomor minggu
            const weekNumber = Math.ceil((((date - new Date(date.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
            const key = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

            if (!acc[key]) {
                acc[key] = {
                    minggu: key,
                    tanggalMulai: startOfWeek,
                    tanggalAkhir: endOfWeek,
                    jumlah: 0
                };
            }
            acc[key].jumlah += 1;
            return acc;
        }, {});

        // Convert ke array dan urutkan berdasarkan minggu
        const result = Object.values(weeklyData).sort((a, b) => 
            b.minggu.localeCompare(a.minggu)
        );

        return res.status(200).json({
            message: "Statistik mingguan berhasil diambil",
            data: result
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




module.exports = {getUnitKerjaStatistics, getStatistikHarian,getStatistikMingguan, getStatistikBulanan, getStatistikTahunan}
