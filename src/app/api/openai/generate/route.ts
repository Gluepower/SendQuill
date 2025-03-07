import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const body = await request.json();
    const {
      prompt,
      temperature = 0.7,
      max_tokens = 200,
      top_p = 1,
      frequency_penalty = 0,
      presence_penalty = 0,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
    });

    const generatedText = response.choices[0]?.message?.content || "";

    return NextResponse.json({ text: generatedText });
  } catch (error) {
    console.error("Error generating text with OpenAI:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { error: `Failed to generate text: ${errorMessage}` },
      { status: 500 }
    );
  }
} 