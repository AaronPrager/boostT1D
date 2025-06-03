import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "Google AI API key not configured. Please add GOOGLE_AI_API_KEY to your environment variables."
      }, { status: 500 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({
        success: false,
        error: "No image file provided"
      }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this food image and estimate the carbohydrate content. Please provide:
1. A brief description of the food items you see
2. An estimated total carbohydrates in grams
3. Your confidence level (High/Medium/Low)
4. Any important notes about the estimation

Please be as accurate as possible and consider typical serving sizes. Respond in this exact JSON format:
{
  "description": "description of food items",
  "carbs_grams": number,
  "confidence": "High/Medium/Low",
  "notes": "relevant notes about the estimation"
}`;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: imageFile.type
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Try to parse the JSON response
    let analysis;
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Google AI response:', text);
      // Return a fallback response
      return NextResponse.json({
        success: true,
        analysis: {
          description: "Food items detected but couldn't parse detailed analysis",
          carbs_grams: 30,
          confidence: "Low",
          notes: "Unable to provide detailed analysis. Please try another photo with better lighting."
        }
      });
    }

    // Validate the response structure
    if (!analysis.description || typeof analysis.carbs_grams !== 'number' || !analysis.confidence) {
      throw new Error('Invalid response structure from Google AI');
    }

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Food analysis error:', error);
    
    // Check if it's a Google AI API error
    if (error instanceof Error && error.message && error.message.includes('API key')) {
      return NextResponse.json({
        success: false,
        error: "Invalid or missing Google AI API key. Please check your configuration."
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: "Failed to analyze the food image. Please try again with a clearer photo."
    }, { status: 500 });
  }
}