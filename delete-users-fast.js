const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllUsersFast() {
  try {
    console.log('Deleting all users...');
        const deleteResult = await prisma.user.deleteMany({});
    
    console.log(`Deleted ${deleteResult.count} users`);    
  } catch (error) {
    console.error('Error deleting users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllUsersFast();
