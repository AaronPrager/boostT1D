const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('🔍 Fetching all registered users...\n');
    
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        settings: true,
        _count: {
          select: {
            readings: true,
            treatments: true,
            buddyRequestsSent: true,
            buddyRequestsReceived: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('❌ No registered users found.');
      return;
    }

    console.log(`✅ Found ${users.length} registered user(s):\n`);
    console.log('═'.repeat(80));

    users.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name || 'Not set'}`);
      console.log(`   Email: ${user.email || 'Not set'}`);
      console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Has Profile: ${user.profile ? '✅ Yes' : '❌ No'}`);
      console.log(`   Has Settings: ${user.settings ? '✅ Yes' : '❌ No'}`);
      
      if (user.profile) {
        const profileData = user.profile.data;
        console.log(`   Profile Info:`);
        if (profileData.personalInfo) {
          console.log(`     - Age: ${profileData.personalInfo.age || 'Not set'}`);
          console.log(`     - Diabetes Type: ${profileData.personalInfo.diabetesType || 'Not set'}`);
          console.log(`     - Diagnosis Year: ${profileData.personalInfo.diagnosisYear || 'Not set'}`);
          console.log(`     - Location: ${profileData.personalInfo.location || 'Not set'}`);
        }
        if (profileData.interests && profileData.interests.length > 0) {
          console.log(`     - Interests: ${profileData.interests.join(', ')}`);
        }
      }
      
      if (user.settings) {
        console.log(`   Settings:`);
        console.log(`     - Nightscout URL: ${user.settings.nightscoutUrl || 'Not set'}`);
        console.log(`     - Low Glucose: ${user.settings.lowGlucose}mg/dL`);
        console.log(`     - High Glucose: ${user.settings.highGlucose}mg/dL`);
      }
      
      console.log(`   Activity:`);
      console.log(`     - Readings: ${user._count.readings}`);
      console.log(`     - Treatments: ${user._count.treatments}`);
      console.log(`     - Buddy Requests Sent: ${user._count.buddyRequestsSent}`);
      console.log(`     - Buddy Requests Received: ${user._count.buddyRequestsReceived}`);
      
      console.log(`   Created: ${user.profile?.createdAt || 'N/A'}`);
      
      if (index < users.length - 1) {
        console.log('\n' + '─'.repeat(80));
      }
    });

    console.log('\n' + '═'.repeat(80));
    console.log(`\n📊 Summary: ${users.length} total users`);
    
    const usersWithProfiles = users.filter(u => u.profile).length;
    const usersWithSettings = users.filter(u => u.settings).length;
    const usersWithReadings = users.filter(u => u._count.readings > 0).length;
    
    console.log(`   - ${usersWithProfiles} users have completed profiles`);
    console.log(`   - ${usersWithSettings} users have configured settings`);
    console.log(`   - ${usersWithReadings} users have glucose readings`);

  } catch (error) {
    console.error('❌ Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers(); 