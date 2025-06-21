import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure']
  }
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const importance = searchParams.get('importance');
    const breaking = searchParams.get('breaking') === 'true';

    // Get user session for personalization (optional)
    const session = await getServerSession(authOptions);
    let userPreferences = null;

    if (session?.user?.id) {
      userPreferences = await prisma.newsPreference.findUnique({
        where: { userId: session.user.id }
      });
    }

    // Build filter conditions
    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (source) {
      where.sourceId = source;
    }
    
    if (importance) {
      where.importance = importance;
    }
    
    if (breaking) {
      where.isBreaking = true;
    }

    // Apply user preferences if available
    if (userPreferences) {
      if (userPreferences.categories.length > 0) {
        where.category = { in: userPreferences.categories };
      }
      if (userPreferences.sources.length > 0) {
        where.sourceId = { in: userPreferences.sources };
      }
      if (userPreferences.keywords.length > 0) {
        where.OR = userPreferences.keywords.map((keyword: string) => ({
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { summary: { contains: keyword, mode: 'insensitive' } },
            { tags: { has: keyword } }
          ]
        }));
      }
    }

    const articles = await prisma.newsArticle.findMany({
      where,
      include: {
        source: {
          select: {
            id: true,
            name: true,
            displayName: true,
            logoUrl: true,
            reliability: true
          }
        },
        _count: {
          select: {
            bookmarks: true,
            interactions: {
              where: { type: 'like' }
            }
          }
        }
      },
      orderBy: [
        { isBreaking: 'desc' },
        { importance: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    // Get total count for pagination
    const totalCount = await prisma.newsArticle.count({ where });

    return NextResponse.json({
      articles,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching news articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sourceId } = body;

    if (action === 'refresh' && sourceId) {
      // Fetch fresh articles from RSS feed
      const source = await prisma.newsSource.findUnique({
        where: { id: sourceId }
      });

      if (!source || !source.rssUrl) {
        return NextResponse.json(
          { error: 'Invalid source or no RSS URL' },
          { status: 400 }
        );
      }

      const feed = await parser.parseURL(source.rssUrl);
      const newArticles = [];

      for (const item of feed.items.slice(0, 10)) { // Limit to 10 latest
        if (!item.link) continue;

        // Check if article already exists
        const existing = await prisma.newsArticle.findUnique({
          where: { url: item.link }
        });

        if (existing) continue;

        // Extract image URL
        let imageUrl = null;
        const mediaContent = (item as any)['media:content'];
        const mediaThumbnail = (item as any)['media:thumbnail'];
        
        if (mediaContent && mediaContent.$) {
          imageUrl = mediaContent.$.url;
        } else if (mediaThumbnail && mediaThumbnail.$) {
          imageUrl = mediaThumbnail.$.url;
        } else if (item.enclosure && item.enclosure.type?.startsWith('image/')) {
          imageUrl = item.enclosure.url;
        }

        // Categorize article based on title and content
        const category = categorizeArticle(item.title || '', item.contentSnippet || '');
        const importance = determineImportance(item.title || '', item.contentSnippet || '');
        const tags = extractTags(item.title || '', item.contentSnippet || '');

        const article = await prisma.newsArticle.create({
          data: {
            sourceId: source.id,
            title: item.title || 'Untitled',
            summary: item.contentSnippet?.substring(0, 500),
            content: item.content,
            url: item.link,
            imageUrl,
            author: (item as any).creator || (item as any).author,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            category,
            tags,
            importance,
            isBreaking: importance === 'critical'
          }
        });

        newArticles.push(article);
      }

      return NextResponse.json({
        message: `Fetched ${newArticles.length} new articles`,
        articles: newArticles
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in news articles POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

function categorizeArticle(title: string, content: string): string {
  const text = (title + ' ' + content).toLowerCase();
  
  if (text.includes('cgm') || text.includes('continuous glucose') || text.includes('dexcom') || text.includes('freestyle')) {
    return 'cgm';
  }
  if (text.includes('pump') || text.includes('insulin pump') || text.includes('omnipod') || text.includes('medtronic')) {
    return 'pump';
  }
  if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning') || text.includes('algorithm')) {
    return 'ai';
  }
  if (text.includes('research') || text.includes('study') || text.includes('clinical trial') || text.includes('cure')) {
    return 'research';
  }
  if (text.includes('diet') || text.includes('exercise') || text.includes('lifestyle') || text.includes('nutrition')) {
    return 'lifestyle';
  }
  
  return 'general';
}

function determineImportance(title: string, content: string): string {
  const text = (title + ' ' + content).toLowerCase();
  
  if (text.includes('breakthrough') || text.includes('fda approval') || text.includes('recall') || text.includes('urgent')) {
    return 'critical';
  }
  if (text.includes('new') || text.includes('launch') || text.includes('update') || text.includes('improvement')) {
    return 'high';
  }
  if (text.includes('study') || text.includes('research') || text.includes('trial')) {
    return 'medium';
  }
  
  return 'low';
}

function extractTags(title: string, content: string): string[] {
  const text = (title + ' ' + content).toLowerCase();
  const tags: string[] = [];
  
  const tagMap = {
    'dexcom': ['dexcom', 'g6', 'g7'],
    'freestyle': ['freestyle', 'libre'],
    'medtronic': ['medtronic', '670g', '780g'],
    'omnipod': ['omnipod', 'tubeless'],
    'ai': ['artificial intelligence', 'machine learning'],
    'fda': ['fda approval', 'regulatory'],
    'research': ['clinical trial', 'study'],
    'lifestyle': ['diet', 'exercise', 'nutrition']
  };
  
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      tags.push(tag);
    }
  }
  
  return tags;
} 