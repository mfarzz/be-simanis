const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createLogbook = async (req, res) => {
  try {
    const userId = req.user.id; // dari token JWT
    const { tanggal, kegiatan } = req.body;

    // Validasi input
    if (!tanggal || !kegiatan) {
      return res.status(400).json({
        status: "error",
        message: "Tanggal dan kegiatan harus diisi",
      });
    }

    // Dapatkan data peserta untuk informasi di notifikasi
    const peserta = await prisma.peserta.findUnique({
      where: { id: userId },
      select: { nama: true },
    });

    // Ambil hanya pegawai dengan role Admin
    const adminPegawai = await prisma.pegawai.findMany({
      where: {
        role: "Admin", // Sesuai enum RolePegawai
      },
      select: { id: true },
    });

    // Mulai transaction untuk memastikan kedua operasi berhasil
    const [logbook, notifikasi] = await prisma.$transaction([
      // Create logbook entry
      prisma.logbook.create({
        data: {
          id_peserta: userId,
          tanggal: new Date(tanggal),
          kegiatan: kegiatan,
        },
      }),

      // Create notifikasi hanya untuk Admin
      prisma.notifikasiPegawai.createMany({
        data: adminPegawai.map((admin) => ({
          id_peserta: admin.id, // ini sebenarnya id_pegawai di model
          tipe: "Logbook",
          pesan: `${
            peserta.nama
          } telah menambahkan logbook baru untuk tanggal ${new Date(
            tanggal
          ).toLocaleDateString("id-ID")}`,
          status: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      }),
    ]);

    return res.status(201).json({
      status: "success",
      message: "Logbook berhasil ditambahkan",
      data: logbook,
    });
  } catch (error) {
    console.error("Error creating logbook:", error);
    return res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat menambahkan logbook",
    });
  }
};


const getMyLogbook = async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Ambil query parameters untuk filter jika ada
      const { startDate, endDate } = req.query;
      
      // Buat where clause dasar
      let whereClause = {
        id_peserta: userId
      };
  
      // Tambahkan filter tanggal jika ada
      if (startDate || endDate) {
        whereClause.tanggal = {};
        if (startDate) {
          whereClause.tanggal.gte = new Date(startDate);
        }
        if (endDate) {
          whereClause.tanggal.lte = new Date(endDate);
        }
      }
  
      // Get current year and month
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
  
      // Ambil semua data dalam satu transaksi untuk konsistensi
      const [logbooks, totalAllTime, totalThisMonth] = await prisma.$transaction([
        // Data logbook
        prisma.logbook.findMany({
          where: whereClause,
          orderBy: {
            tanggal: 'desc'
          },
          select: {
            id: true,
            tanggal: true,
            kegiatan: true,
            createdAt: true,
            updatedAt: true
          }
        }),
  
        // Total semua logbook
        prisma.logbook.count({
          where: {
            id_peserta: userId
          }
        }),
  
        // Total logbook bulan ini
        prisma.logbook.count({
          where: {
            id_peserta: userId,
            tanggal: {
              gte: new Date(currentYear, currentMonth - 1, 1),
              lt: new Date(currentYear, currentMonth, 1)
            }
          }
        })
      ]);
  
      return res.status(200).json({
        status: 'success',
        message: 'Data logbook berhasil diambil',
        data: {
          logbooks,
          statistics: {
            totalAllTime,
            totalThisMonth
          }
        }
      });
  
    } catch (error) {
      console.error('Error fetching logbook:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengambil data logbook'
      });
    }
  };


  const editLogbook = async (req, res) => {
    try {
      const userId = req.user.id;
      const logbookId = req.params.id;
      const { tanggal, kegiatan } = req.body;
  
      // Validasi input
      if (!tanggal || !kegiatan) {
        return res.status(400).json({
          status: 'error',
          message: 'Tanggal dan kegiatan harus diisi'
        });
      }
  
      // Cek apakah logbook milik peserta yang login
      const existingLogbook = await prisma.logbook.findFirst({
        where: {
          id: logbookId,
          id_peserta: userId
        }
      });
  
      if (!existingLogbook) {
        return res.status(404).json({
          status: 'error',
          message: 'Logbook tidak ditemukan atau bukan milik anda'
        });
      }
  
      // Update logbook
      const updatedLogbook = await prisma.logbook.update({
        where: {
          id: logbookId
        },
        data: {
          tanggal: new Date(tanggal),
          kegiatan: kegiatan,
          updatedAt: new Date()
        }
      });
  
      // Kirim notifikasi ke admin
      const peserta = await prisma.peserta.findUnique({
        where: { id: userId },
        select: { nama: true }
      });
  
      const adminPegawai = await prisma.pegawai.findMany({
        where: {
          role: 'Admin'
        },
        select: { id: true }
      });
  
      await prisma.notifikasiPegawai.createMany({
        data: adminPegawai.map(admin => ({
          id_peserta: admin.id,
          tipe: 'Logbook',
          pesan: `${peserta.nama} telah mengubah logbook untuk tanggal ${new Date(tanggal).toLocaleDateString('id-ID')}`,
          status: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      });
  
      return res.status(200).json({
        status: 'success',
        message: 'Logbook berhasil diupdate',
        data: updatedLogbook
      });
  
    } catch (error) {
      console.error('Error updating logbook:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat mengupdate logbook'
      });
    }
  };

  const deleteLogbook = async (req, res) => {
    try {
      const userId = req.user.id;
      const logbookId = req.params.id;
  
      // Cek apakah logbook milik peserta yang login
      const existingLogbook = await prisma.logbook.findFirst({
        where: {
          id: logbookId,
          id_peserta: userId
        }
      });
  
      if (!existingLogbook) {
        return res.status(404).json({
          status: 'error',
          message: 'Logbook tidak ditemukan atau bukan milik anda'
        });
      }
  
      // Hapus logbook dan kirim notifikasi ke admin dalam satu transaksi
      const [deletedLogbook] = await prisma.$transaction([
        // Hapus logbook
        prisma.logbook.delete({
          where: {
            id: logbookId
          }
        }),
  
        // Kirim notifikasi ke admin
        prisma.notifikasiPegawai.createMany({
          data: await prisma.pegawai.findMany({
            where: {
              role: 'Admin'
            },
            select: { id: true }
          }).then(admins => admins.map(admin => ({
            id_peserta: admin.id,
            tipe: 'Logbook',
            pesan: `${req.user.nama} telah menghapus logbook untuk tanggal ${existingLogbook.tanggal.toLocaleDateString('id-ID')}`,
            status: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })))
        })
      ]);
  
      return res.status(200).json({
        status: 'success',
        message: 'Logbook berhasil dihapus'
      });
  
    } catch (error) {
      console.error('Error deleting logbook:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan saat menghapus logbook'
      });
    }
  };

module.exports = {
  createLogbook,
  getMyLogbook,
  editLogbook,
  deleteLogbook
};
