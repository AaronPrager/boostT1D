const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPersonalProfileAPI() {
  try {
    console.log('🧪 Testing Personal Profile API logic...\n');
    
    // Simulate getting user (like the API does)
    const userEmail = 'test@test.com';
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        profile: true,
      },
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // This is what the API returns
    const personalProfileData = {
      name: user.name,
      email: user.email,
      about: user.profile?.bio || null,
      photo: user.image,
      phone: user.profile?.phoneNumber || null,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : (user.profile?.birthDate ? user.profile.birthDate.toISOString().split('T')[0] : null),
      occupation: user.profile?.occupation || null,
      country: user.country,
      state: user.state,
      favoriteActivities: user.profile?.favoriteActivities || null,
      diagnosisAge: user.profile?.diagnosisAge || null,
    };
    
    console.log('API would return:');
    console.log(JSON.stringify(personalProfileData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPersonalProfileAPI();

