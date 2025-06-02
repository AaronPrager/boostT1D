import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST() {
  try {
    // Placeholder food analysis response
    return NextResponse.json({
      success: true,
      analysis: {
        description: "Mixed vegetables and grains",
        carbs_grams: 45,
        confidence: "Medium",
        notes: "This is a placeholder response. Food analysis API is temporarily unavailable."
      }
    });
  } catch (error) {
    console.error('Food analysis error:', error);
    return NextResponse.json(
      { success: false, error: "Analysis failed" },
      { status: 500 }
    );
  }
}

// Helper function to extract numbers from text
function extractNumber(text: string): number | null {
  const matches = text.match(/(\d+(?:\.\d+)?)\s*(?:grams?|g\b)/i);
  if (matches) {
    return parseFloat(matches[1]);
  }
  
  const numberMatches = text.match(/(\d+(?:\.\d+)?)/);
  if (numberMatches) {
    return parseFloat(numberMatches[1]);
  }
  
  return null;
}