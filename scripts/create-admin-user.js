// Script to create the first admin user directly in MongoDB
// Run this using: node scripts/create-admin-user.js
// Make sure to update the connection string and user details

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Update this with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/worknow';

// Admin user details - UPDATE THESE
const adminUser = {
  first_name: 'Admin',
  last_name: 'User',
  email: 'admin@worknow.com',
  password: 'Admin123!', // Will be hashed
  phone_number: 1234567890,
  role: 'admin',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function createAdminUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      first_name: String,
      last_name: String,
      email: String,
      password: String,
      phone_number: Number,
      role: String,
      emailVerified: Boolean,
      createdAt: Date,
      updatedAt: Date,
    }));

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      if (existingAdmin.role !== 'admin') {
        // Update existing user to admin
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('Updated existing user to admin role');
      }
      await mongoose.connection.close();
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminUser.password, saltRounds);

    // Create admin user
    const newAdmin = new User({
      ...adminUser,
      password: hashedPassword,
    });

    await newAdmin.save();
    console.log('Admin user created successfully!');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${adminUser.password}`);
    console.log('Please change the password after first login!');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error creating admin user:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createAdminUser();

