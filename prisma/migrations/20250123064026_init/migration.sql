-- CreateEnum
CREATE TYPE "Role" AS ENUM ('User');

-- CreateEnum
CREATE TYPE "Agama" AS ENUM ('Islam', 'Kristen_Protestan', 'Budha', 'Konghucu', 'Hindu', 'Katolik');

-- CreateEnum
CREATE TYPE "UnitKerja" AS ENUM ('Umum', 'IT', 'Diseminasi', 'Teknikal');

-- CreateEnum
CREATE TYPE "StatusSertifikat" AS ENUM ('Pending', 'Selesai');

-- CreateEnum
CREATE TYPE "TipeNotifikasiPeserta" AS ENUM ('Tugas', 'Sertifikat');

-- CreateEnum
CREATE TYPE "TipeNotifikasiPegawai" AS ENUM ('Tugas', 'Kelompok');

-- CreateEnum
CREATE TYPE "RolePegawai" AS ENUM ('Admin', 'Pegawai');

-- CreateEnum
CREATE TYPE "StatusKelompok" AS ENUM ('Pending', 'Ditolak', 'Diterima');

-- CreateEnum
CREATE TYPE "StatusTugas" AS ENUM ('Pending', 'Selesai', 'Terlambat');

-- CreateTable
CREATE TABLE "Kelompok" (
    "id" UUID NOT NULL,
    "nomor_kelompok" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "nama_ketua" VARCHAR(255) NOT NULL,
    "jumlah_anggota" INTEGER NOT NULL,
    "instansi" VARCHAR(255) NOT NULL,
    "surat_pengantar" TEXT NOT NULL,
    "surat_balasan" TEXT,
    "status" "StatusKelompok" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kelompok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Peserta" (
    "id" UUID NOT NULL,
    "id_kelompok" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "nim" VARCHAR(255) NOT NULL,
    "jurusan" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'User',
    "nama_penggilan" VARCHAR(255),
    "tempat_lahir" VARCHAR(255),
    "tanggal_lahir" TIMESTAMP(3),
    "anak_ke" INTEGER,
    "jumlah_saudara" INTEGER,
    "ip" DOUBLE PRECISION,
    "nama_ibu" VARCHAR(255),
    "pekerjaan_ibu" VARCHAR(255),
    "nama_ayah" VARCHAR(255),
    "pekerjaan_ayah" VARCHAR(255),
    "agama" "Agama",
    "no_hp" VARCHAR(255),
    "alamat" VARCHAR(255),
    "alamat_domisili" VARCHAR(255),
    "alasan" VARCHAR(255),
    "jadwal_mulai" TIMESTAMP(3),
    "jadwal_selesai" TIMESTAMP(3),
    "keahlian" VARCHAR(255),
    "unit_kerja" "UnitKerja",
    "foto" TEXT,
    "nomor_peserta" VARCHAR(255) NOT NULL,
    "sertifikat" TEXT,
    "status_sertifikat" "StatusSertifikat",
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Peserta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" UUID NOT NULL,
    "id_user" UUID NOT NULL,
    "kode" VARCHAR(255) NOT NULL,
    "expiredAt" TIMESTAMP(3),
    "status" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiwayatPendidikan" (
    "id" UUID NOT NULL,
    "id_peserta" UUID NOT NULL,
    "nama_sekolah" VARCHAR(255) NOT NULL,
    "tempat" VARCHAR(255) NOT NULL,
    "tahun_tempat" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiwayatPendidikan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pegawai" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "nip" VARCHAR(255) NOT NULL,
    "jabatan" VARCHAR(255) NOT NULL,
    "role" "RolePegawai" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pegawai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tugas" (
    "id" UUID NOT NULL,
    "id_peserta" UUID NOT NULL,
    "id_pegawai" UUID NOT NULL,
    "deskripsi" VARCHAR(255) NOT NULL,
    "status" "StatusTugas" NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tugas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotifikasiPeserta" (
    "id" UUID NOT NULL,
    "id_peserta" UUID NOT NULL,
    "tipe" "TipeNotifikasiPeserta" NOT NULL,
    "pesan" VARCHAR(255) NOT NULL,
    "status" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotifikasiPeserta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotifikasiPegawai" (
    "id" UUID NOT NULL,
    "id_peserta" UUID NOT NULL,
    "tipe" "TipeNotifikasiPegawai" NOT NULL,
    "pesan" VARCHAR(255) NOT NULL,
    "status" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotifikasiPegawai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kelompok_email_key" ON "Kelompok"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Peserta_email_key" ON "Peserta"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Peserta_nim_key" ON "Peserta"("nim");

-- CreateIndex
CREATE UNIQUE INDEX "Peserta_nomor_peserta_key" ON "Peserta"("nomor_peserta");

-- CreateIndex
CREATE UNIQUE INDEX "Otp_kode_key" ON "Otp"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Pegawai_email_key" ON "Pegawai"("email");

-- AddForeignKey
ALTER TABLE "Peserta" ADD CONSTRAINT "Peserta_id_kelompok_fkey" FOREIGN KEY ("id_kelompok") REFERENCES "Kelompok"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "Peserta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiwayatPendidikan" ADD CONSTRAINT "RiwayatPendidikan_id_peserta_fkey" FOREIGN KEY ("id_peserta") REFERENCES "Peserta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tugas" ADD CONSTRAINT "Tugas_id_peserta_fkey" FOREIGN KEY ("id_peserta") REFERENCES "Peserta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tugas" ADD CONSTRAINT "Tugas_id_pegawai_fkey" FOREIGN KEY ("id_pegawai") REFERENCES "Pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotifikasiPeserta" ADD CONSTRAINT "NotifikasiPeserta_id_peserta_fkey" FOREIGN KEY ("id_peserta") REFERENCES "Peserta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotifikasiPegawai" ADD CONSTRAINT "NotifikasiPegawai_id_peserta_fkey" FOREIGN KEY ("id_peserta") REFERENCES "Pegawai"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Tugas" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Tugas" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Peserta" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Peserta" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Pegawai" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Pegawai" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Kelompok" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Kelompok" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Otp" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Otp" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "RiwayatPendidikan" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RiwayatPendidikan" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "NotifikasiPeserta" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "NotifikasiPeserta" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "NotifikasiPegawai" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "NotifikasiPegawai" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;