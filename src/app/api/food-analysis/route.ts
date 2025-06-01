import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded image from form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Convert the image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    
    // Get the image mime type
    const mimeType = imageFile.type;

    // Create the image part for Gemini
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    // Create the prompt for food carb analysis
    const prompt = `Analyze this food image and provide a detailed carbohydrate estimate. Please respond with a JSON object containing:
    - description: A brief description of the food items you see
    - carbs_grams: Your best estimate of total carbohydrates in grams (number only)
    - confidence: Your confidence level (low/medium/high)
    - notes: Any additional notes about the analysis, portion size assumptions, or limitations

    Focus on identifying common foods and their typical carb content. If you see multiple items, sum up the total carbs. Be conservative in your estimates and mention if portion sizes are difficult to determine.`;

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate content with the image and prompt
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    // Try to parse the JSON response
    let analysis;
    try {
      // Remove any markdown formatting if present
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanText);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from the text
      analysis = {
        description: "Food items detected in image",
        carbs_grams: extractNumber(text) || 30, // Try to extract a number, default to 30
        confidence: "medium",
        notes: text.substring(0, 200) + (text.length > 200 ? "..." : "")
      };
    }

    // Validate and clean the response
    const cleanedAnalysis = {
      description: analysis.description || "Food items detected in image",
      carbs_grams: typeof analysis.carbs_grams === 'number' ? analysis.carbs_grams : parseInt(analysis.carbs_grams) || 30,
      confidence: analysis.confidence || "medium",
      notes: analysis.notes || "AI analysis completed"
    };

    return NextResponse.json({
      success: true,
      analysis: cleanedAnalysis
    });

  } catch (error) {
    console.error('Food analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze food image. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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