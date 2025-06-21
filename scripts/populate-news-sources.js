const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const diabetesNewsSources = [
  {
    name: "jdrf",
    displayName: "JDRF",
    website: "https://www.jdrf.org",
    rssUrl: "https://www.jdrf.org/feed/",
    category: "Research",
    description: "Latest research and advocacy news from the Juvenile Diabetes Research Foundation",
    isActive: true
  },
  {
    name: "american-diabetes-association",
    displayName: "American Diabetes Association",
    website: "https://diabetes.org",
    rssUrl: "https://diabetes.org/feed",
    category: "Medical",
    description: "Clinical guidelines, research, and educational content from the ADA",
    isActive: true
  },
  {
    name: "diabetesmine",
    displayName: "DiabetesMine",
    website: "https://www.diabetesmine.com",
    rssUrl: "https://www.diabetesmine.com/feed",
    category: "Technology",
    description: "Latest diabetes technology news, device reviews, and community insights",
    isActive: true
  },
  {
    name: "diabetes-daily",
    displayName: "Diabetes Daily",
    website: "https://www.diabetesdaily.com",
    rssUrl: "https://www.diabetesdaily.com/feed/",
    category: "Lifestyle",
    description: "Daily diabetes management tips, recipes, and community stories",
    isActive: true
  },
  {
    name: "dexcom-blog",
    displayName: "Dexcom Blog",
    website: "https://www.dexcom.com/blog",
    rssUrl: "https://www.dexcom.com/blog/feed",
    category: "Technology",
    description: "Updates on continuous glucose monitoring technology and research",
    isActive: true
  },
  {
    name: "medtronic-diabetes",
    displayName: "Medtronic Diabetes",
    website: "https://www.medtronicdiabetes.com/blog",
    rssUrl: "https://www.medtronicdiabetes.com/blog/feed",
    category: "Technology",
    description: "Insulin pump technology news and diabetes management insights",
    isActive: true
  },
  {
    name: "diabetes-self-management",
    displayName: "Diabetes Self-Management",
    website: "https://www.diabetesselfmanagement.com",
    rssUrl: "https://www.diabetesselfmanagement.com/feed/",
    category: "Lifestyle",
    description: "Practical advice for diabetes self-care and management",
    isActive: true
  },
  {
    name: "type-1-diabetes-news",
    displayName: "Type 1 Diabetes News",
    website: "https://type1diabetesnews.com",
    rssUrl: "https://type1diabetesnews.com/feed/",
    category: "Community",
    description: "News and stories specifically focused on Type 1 diabetes",
    isActive: true
  }
];

async function populateNewsSources() {
  try {
    console.log('🔄 Populating diabetes news sources...');
    
    for (const source of diabetesNewsSources) {
      const existingSource = await prisma.newsSource.findFirst({
        where: { name: source.name }
      });
      
      if (existingSource) {
        console.log(`✅ Source "${source.displayName}" already exists`);
        continue;
      }
      
      await prisma.newsSource.create({
        data: source
      });
      
      console.log(`✅ Added source: ${source.displayName}`);
    }
    
    console.log('\n🎉 News sources population complete!');
    
    // Get count of active sources
    const activeCount = await prisma.newsSource.count({
      where: { isActive: true }
    });
    
    console.log(`📊 Total active news sources: ${activeCount}`);
    
  } catch (error) {
    console.error('❌ Error populating news sources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  populateNewsSources();
}

module.exports = { populateNewsSources }; 