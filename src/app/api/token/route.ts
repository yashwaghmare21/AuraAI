import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/systemPrompt';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    const tokenResponse = await (ai as any).authTokens.create({
      model: "gemini-2.0-flash-exp",
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Aoede" }
          }
        },
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "get_order_details",
                description: "Get the current details, tracking status, and deterministic policy eligibility of an order.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    order_id: {
                      type: "STRING",
                      description: "The order ID, e.g., ORD-101"
                    }
                  },
                  required: ["order_id"]
                }
              },
              {
                name: "check_return_eligibility",
                description: "Check if an order is eligible for return based on the 7-day policy.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    order_id: { 
                      type: "STRING",
                      description: "The order ID to check" 
                    }
                  },
                  required: ["order_id"]
                }
              },
              {
                name: "check_cancellation_eligibility",
                description: "Check if an order can be cancelled (only if status is Processing).",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    order_id: { 
                      type: "STRING",
                      description: "The order ID to check" 
                    }
                  },
                  required: ["order_id"]
                }
              }
            ]
          }
        ]
      }
    });

    const tokenStr = typeof tokenResponse === 'string' ? tokenResponse : (tokenResponse.name || tokenResponse.value || JSON.stringify(tokenResponse));

    return NextResponse.json({ token: tokenStr });
  } catch (e: any) {
    console.error("Token creation error:", e);
    return NextResponse.json({ error: e.message || "Failed to create token" }, { status: 500 });
  }
}
