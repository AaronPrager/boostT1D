import { NextResponse } from 'next/server';

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