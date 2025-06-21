import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sources = await prisma.newsSource.findMany({
      where: { isActive: true },
      orderBy: [
        { reliability: 'desc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        website: true,
        logoUrl: true,
        category: true,
        reliability: true,
        _count: {
          select: {
            articles: {
              where: {
                publishedAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching news sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      displayName,
      description,
      website,
      rssUrl,
      apiUrl,
      logoUrl,
      category,
      reliability = 'verified'
    } = body;

    if (!name || !displayName || !website || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const source = await prisma.newsSource.create({
      data: {
        name,
        displayName,
        description,
        website,
        rssUrl,
        apiUrl,
        logoUrl,
        category,
        reliability
      }
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('Error creating news source:', error);
    return NextResponse.json(
      { error: 'Failed to create news source' },
      { status: 500 }
    );
  }
} 