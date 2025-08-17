const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAllUsers() {
  try {
    console.log('🔍 Fetching all users from database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailConfirmed: true,
        emailVerified: true,
        country: true,
        state: true,
        dateOfBirth: true,
        password: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }

    console.log(`✅ Found ${users.length} user(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name || 'Not set'}`);
      console.log(`   Email: ${user.email || 'Not set'}`);
      console.log(`   Email Confirmed: ${user.emailConfirmed ? '✅ Yes' : '❌ No'}`);
      console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Country: ${user.country || 'Not set'}`);
      console.log(`   State: ${user.state || 'Not set'}`);
      console.log(`   Date of Birth: ${user.dateOfBirth ? user.dateOfBirth.toDateString() : 'Not set'}`);
      
      console.log(`   Has Password: ${user.password ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });

    // Summary
    const usersWithPasswords = users.filter(user => user.password);
    const usersWithoutPasswords = users.filter(user => !user.password);
    
    console.log('📊 Summary:');
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Users with Passwords: ${usersWithPasswords.length}`);
    console.log(`   Users without Passwords: ${usersWithoutPasswords.length}`);
    console.log(`   Users with Email Confirmed: ${users.filter(u => u.emailConfirmed).length}`);
    console.log(`   Users with Email Verified: ${users.filter(u => u.emailVerified).length}`);

  } catch (error) {
    console.error('💥 Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllUsers(); 