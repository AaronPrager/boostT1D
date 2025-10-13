const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset...');
    
    // Delete all data in the correct order (respecting foreign key constraints)
    console.log('🗑️  Deleting sessions...');
    await prisma.session.deleteMany();
    
    console.log('🗑️  Deleting accounts...');
    await prisma.account.deleteMany();
    
    console.log('🗑️  Deleting verification tokens...');
    await prisma.verificationToken.deleteMany();
    
    console.log('🗑️  Deleting buddy connections...');
    await prisma.buddyConnection.deleteMany();
    
    console.log('🗑️  Deleting profiles...');
    await prisma.profile.deleteMany();
    
    console.log('🗑️  Deleting users...');
    await prisma.user.deleteMany();
    
    console.log('✅ Database reset completed successfully!');
    console.log('📊 All users, profiles, sessions, and related data have been removed.');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
