/**
 * Script to create an admin user
 * Usage: node scripts/createAdmin.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    const name = process.env.ADMIN_NAME || 'Admin User';

    console.log('🔐 Creating admin user...');
    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log('⚠️  User already exists. Updating to admin...');
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'admin',
          isArtist: false,
        },
      });

      console.log('✅ User updated to admin successfully!');
      console.log(`User ID: ${updatedUser.id}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'admin',
        isArtist: false,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`User ID: ${admin.id}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log('\n📝 You can now login with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();


