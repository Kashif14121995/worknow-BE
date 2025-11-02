/**
 * Script to create the first admin user
 * 
 * Usage:
 * cd worknow-BE
 * npm run create-admin
 * 
 * Or set custom credentials in .env:
 * ADMIN_EMAIL=your-email@example.com
 * ADMIN_PASSWORD=YourSecurePassword123!
 * ADMIN_FIRST_NAME=Admin
 * ADMIN_LAST_NAME=User
 * ADMIN_PHONE=1234567890
 */

import 'reflect-metadata';
import mongoose, { connect, disconnect, model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserSchema } from '../schemas';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@worknow.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';
const ADMIN_PHONE = process.env.ADMIN_PHONE ? parseInt(process.env.ADMIN_PHONE, 10) : 1234567890;
const DATABASE_URL = process.env.DATABASE_URL || process.env.MONGODB_URI;

async function createAdminUser() {
  try {
    // Check for database URL
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL or MONGODB_URI not found in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await connect(DATABASE_URL);
    console.log('✅ Connected to MongoDB');

    // Get or create the User model
    let UserModel;
    try {
      UserModel = model('User');
    } catch {
      UserModel = model('User', UserSchema);
    }

    // Check if admin already exists
    const existingUser = await UserModel.findOne({ email: ADMIN_EMAIL });
    
    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log('\nℹ️  Admin user already exists with admin role');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        await disconnect();
        return;
      } else {
        // Update existing user to admin
        existingUser.role = 'admin';
        await existingUser.save();
        console.log('\n✅ Updated existing user to admin role');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        await disconnect();
        return;
      }
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, saltRounds);

    // Create admin user
    console.log('👤 Creating admin user...');
    const newAdmin = await UserModel.create({
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      phone_number: ADMIN_PHONE,
      role: 'admin',
      emailVerified: true,
      identityVerified: false,
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('─'.repeat(50));
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('─'.repeat(50));
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log(`\n🔗 Admin Login URL: http://localhost:3000/admin/login`);
    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Start your frontend: cd worknow_fe && npm start`);
    console.log(`   2. Navigate to: http://localhost:3000/admin/login`);
    console.log(`   3. Login with the credentials above`);
    console.log(`   4. Change your password immediately`);

    await disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:');
    console.error(error.message || error);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    await disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the script
createAdminUser();

