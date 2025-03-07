import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    return NextResponse.json({
      isSet: !!apiKey,
    });
  } catch (error) {
    console.error("Error checking OpenAI API key:", error);
    return NextResponse.json(
      { error: "Failed to check API key status" },
      { status: 500 }
    );
  }
} 