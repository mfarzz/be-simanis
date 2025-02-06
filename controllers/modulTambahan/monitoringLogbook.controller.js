const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllLogbooks = async (req, res) => {
    try {
      const { search, startDate, endDate, unit_kerja } = req.query;
      
      // Buat where clause dasar
      let whereClause = {};
  
      // Tambah filter search jika ada
      if (search) {
        whereClause.OR = [
          {
            peserta: {
              nama: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            kegiatan: {
              contains: search,
              mode: 'insensitive'
            }
          }
        ];
      }
  
      // Filter berdasarkan tanggal
      if (startDate || endDate) {
        whereClause.tanggal = {};
        if (startDate) {
          whereClause.tanggal.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.tanggal.lte = new Date(endDate);
        }
      }
  
      // Filter berdasarkan unit kerja
      if (unit_kerja) {
        whereClause.peserta = {
          unit_kerja: unit_kerja
        };
      }
  
      // Ambil data logbook dengan relasi peserta
      const logbooks = await prisma.logbook.findMany({
        where: whereClause,
        include: {
          peserta: {
            select: {
              nama: true,
              unit_kerja: true,
              nomor_peserta: true,
              kelompok: {
                select: {
                  nomor_kelompok: true
                }
              }
            }
          }
        },
        orderBy: {
          tanggal: 'desc'
        }
      });
  
      // Hitung total
      const total = await prisma.logbook.count({
        where: whereClause
      });
  
      // Hitung total hari ini
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const totalToday = await prisma.logbook.count({
        where: {
          ...whereClause,
          tanggal: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });
  
      return res.status(200).json({
        status: 'success',
        message: 'Data logbook berhasil diambil',
        data: {
          logbooks,
          statistics: {
            total,
            totalToday
          }
        }
      });
  
    } catch (error) {
      console.error('Error fetching logbooks:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data logbook'
      });
    }
  };


module.exports = {
    getAllLogbooks
}