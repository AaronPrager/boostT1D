const { PrismaClient } = require('@prisma/client');
const Parser = require('rss-parser');

const prisma = new PrismaClient();
const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: ['content:encoded', 'content', 'summary']
  }
});

// Keywords for determining article importance and relevance
const importanceKeywords = {
  urgent: ['breakthrough', 'cure', 'fda approval', 'recall', 'emergency', 'warning'],
  high: ['clinical trial', 'research', 'study', 'new treatment', 'technology', 'insulin'],
  medium: ['management', 'lifestyle', 'diet', 'exercise', 'tips', 'community'],
  low: ['recipe', 'story', 'personal', 'blog', 'opinion']
};

const diabetesKeywords = [
  'diabetes', 'diabetic', 'insulin', 'glucose', 'blood sugar', 'cgm', 
  'continuous glucose monitor', 'pump', 'a1c', 'type 1', 'type 2',
  'hyperglycemia', 'hypoglycemia', 'endocrinologist', 'carbohydrate'
];

function determineImportance(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  for (const [level, keywords] of Object.entries(importanceKeywords)) {
    if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
      return level;
    }
  }
  return 'medium';
}

function isDiabetesRelated(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return diabetesKeywords.some(keyword => text.includes(keyword.toLowerCase()));
}

function extractTags(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const foundTags = [];
  
  const tagKeywords = {
    'Type 1': ['type 1', 't1d', 'type1'],
    'Type 2': ['type 2', 't2d', 'type2'],
    'CGM': ['cgm', 'continuous glucose', 'dexcom', 'freestyle'],
    'Insulin Pump': ['pump', 'medtronic', 'omnipod', 'tandem'],
    'Research': ['study', 'research', 'clinical trial', 'breakthrough'],
    'Technology': ['technology', 'app', 'digital', 'ai', 'artificial intelligence'],
    'Diet': ['diet', 'nutrition', 'carb', 'carbohydrate', 'food'],
    'Exercise': ['exercise', 'fitness', 'workout', 'activity']
  };
  
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      foundTags.push(tag);
    }
  }
  
  return foundTags;
}

async function fetchArticlesFromSource(source) {
  try {
    console.log(`📡 Fetching from ${source.displayName}...`);
    
    const feed = await parser.parseURL(source.rssUrl);
    const articles = [];
    
    for (const item of feed.items.slice(0, 10)) { // Limit to 10 most recent articles
      const title = item.title || '';
      const description = item.summary || item.contentSnippet || item.content || '';
      
      // Only process diabetes-related articles
      if (!isDiabetesRelated(title, description)) {
        continue;
      }
      
      // Check if article already exists
      const existingArticle = await prisma.newsArticle.findFirst({
        where: {
          url: item.link
        }
      });
      
      if (existingArticle) {
        continue;
      }
      
      const importance = determineImportance(title, description);
      const tags = extractTags(title, description);
      
      const article = {
        title: title.substring(0, 500), // Limit title length
        summary: description.substring(0, 1000), // Limit summary
        content: item['content:encoded'] || item.content || description,
        url: item.link || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        sourceId: source.id,
        category: source.category,
        tags: tags,
        importance: importance,
        author: item.creator || item.author || null,
        imageUrl: item.enclosure?.url || null
      };
      
      articles.push(article);
    }
    
    if (articles.length > 0) {
      await prisma.newsArticle.createMany({
        data: articles,
        skipDuplicates: true
      });
      
      console.log(`✅ Added ${articles.length} articles from ${source.displayName}`);
    } else {
      console.log(`📰 No new articles from ${source.displayName}`);
    }
    
    return articles.length;
    
  } catch (error) {
    console.error(`❌ Error fetching from ${source.displayName}:`, error.message);
    return 0;
  }
}

async function fetchAllNews() {
  try {
    console.log('🚀 Starting news fetch...');
    
    const activeSources = await prisma.newsSource.findMany({
      where: { isActive: true }
    });
    
    if (activeSources.length === 0) {
      console.log('⚠️ No active news sources found. Run populate-news-sources.js first.');
      return;
    }
    
    console.log(`📡 Found ${activeSources.length} active sources`);
    
    let totalArticles = 0;
    
    for (const source of activeSources) {
      const count = await fetchArticlesFromSource(source);
      totalArticles += count;
      
      // Add delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n🎉 News fetch complete! Added ${totalArticles} new articles`);
    
    // Get total article count
    const total = await prisma.newsArticle.count();
    console.log(`📊 Total articles in database: ${total}`);
    
  } catch (error) {
    console.error('❌ Error during news fetch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fetchAllNews();
}

module.exports = { fetchAllNews }; 