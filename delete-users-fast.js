const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllUsersFast() {
  try {
    console.log('🗑️  Deleting all users...');
    
    // Delete all users directly
    const deleteResult = await prisma.user.deleteMany({});
    
    console.log(`✅ Successfully deleted ${deleteResult.count} users and all associated data`);
    console.log('🗄️  Database has been cleared');
    
  } catch (error) {
    console.error('💥 Error deleting users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllUsersFast();
