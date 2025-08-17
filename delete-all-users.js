const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllUsers() {
  try {
    console.log('🗑️  Starting deletion of all users...\n');
    
    // First, let's see how many users we have
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
    if (userCount === 0) {
      console.log('✅ No users to delete');
      return;
    }
    
    // Get user details before deletion for confirmation
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    
    console.log('\n👥 Users to be deleted:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name || 'No name'} (${user.email || 'No email'}) - ID: ${user.id}`);
    });
    
    console.log('\n⚠️  WARNING: This will permanently delete ALL users and their associated data!');
    console.log('   This includes: profiles, settings, treatments, glucose readings, etc.');
    console.log('   This action cannot be undone!\n');
    
    // Ask for confirmation
    console.log('Type "DELETE ALL" to confirm deletion:');
    
    // For safety, we'll require manual confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Confirmation: ', async (answer) => {
      if (answer === 'DELETE ALL') {
        console.log('\n🗑️  Confirmed. Deleting all users...');
        
        // Delete all users (this will cascade to related data due to foreign key constraints)
        const deleteResult = await prisma.user.deleteMany({});
        
        console.log(`✅ Successfully deleted ${deleteResult.count} users and all associated data`);
        console.log('🗄️  Database has been cleared');
        
      } else {
        console.log('❌ Deletion cancelled');
      }
      
      rl.close();
      await prisma.$disconnect();
    });
    
  } catch (error) {
    console.error('💥 Error deleting users:', error);
    await prisma.$disconnect();
  }
}

deleteAllUsers();
