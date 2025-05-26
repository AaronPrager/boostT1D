import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateProfiles() {
  try {
    // Get all users with multiple profiles
    const usersWithMultipleProfiles = await prisma.basalProfile.groupBy({
      by: ['userId'],
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 1
          }
        }
      }
    });

    console.log(`Found ${usersWithMultipleProfiles.length} users with multiple profiles`);

    // For each user with multiple profiles
    for (const user of usersWithMultipleProfiles) {
      // Get all profiles for this user, ordered by updatedAt
      const profiles = await prisma.basalProfile.findMany({
        where: {
          userId: user.userId
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      // Keep the most recent profile and delete the rest
      const [mostRecent, ...oldProfiles] = profiles;
      console.log(`Keeping profile ${mostRecent?.id} for user ${user.userId}`);

      if (oldProfiles.length > 0) {
        const deleteResult = await prisma.basalProfile.deleteMany({
          where: {
            id: {
              in: oldProfiles.map(p => p.id)
            }
          }
        });
        console.log(`Deleted ${deleteResult.count} old profiles for user ${user.userId}`);
      }
    }

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateProfiles(); 