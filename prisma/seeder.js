const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // Untuk hashing password
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Seed data for Pegawai
    const passwordAdmin = await bcrypt.hash('admin123', 10);
    const passwordPegawai = await bcrypt.hash('pegawai123', 10);

    const seeder = await prisma.pegawai.createMany({
        data: [
            {
                email: 'admin@example.com',
                password: passwordAdmin, // Password yang telah di-hash
                nama: 'Admin Utama',
                nip: '1234567890',
                jabatan: 'Administrator',
                role: 'Admin',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                email: 'pegawai@example.com',
                password: passwordPegawai, // Password yang telah di-hash
                nama: 'Pegawai Satu',
                nip: '0987654321',
                jabatan: 'Staff Operasional',
                role: 'Pegawai',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
    });

    console.log('Seeding completed.', seeder);
}

main()
    .then(() => {
        console.log('Database seeded successfully.');
    })
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
