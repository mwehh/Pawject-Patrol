import { NextResponse } from "next/server";
import type { LifestyleData } from "@/types/pawfect-match";
import { generateBedrockText } from "@/lib/bedrock";

export const runtime = "nodejs";

function parseErrorResponse() {
	return NextResponse.json(
		{ message: "AI response could not be parsed" },
		{ status: 500 },
	);
}

function unwrapJsonText(text: string) {
	const trimmed = text.trim();
	return trimmed
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { userInput?: string };
		const userInput = body.userInput?.trim();

		if (!userInput) {
			return NextResponse.json({ message: "userInput is required" }, { status: 400 });
		}

		const rawLifestyle = await generateBedrockText(`Extract structured lifestyle preferences from the user input below.
Return only valid JSON with no explanation or markdown.
Return JSON matching this schema exactly:
{
  "pet_type": "dog" | "cat" | "any",
  "preferred_breed": string | null,
  "preferred_color": string | null,
  "preferred_size": "small" | "medium" | "large" | "any",
  "activity_level": number,
  "hours_away_per_day": number,
  "living_space": "apartment" | "house_no_yard" | "house_with_yard",
  "experience_level": "none" | "some" | "experienced",
  "preferred_energy": number
}

User input: "${userInput}"`);

		if (!rawLifestyle) {
			return parseErrorResponse();
		}

		const lifestyle = JSON.parse(unwrapJsonText(rawLifestyle)) as LifestyleData;
		return NextResponse.json(lifestyle);
	} catch (error) {
		console.error("parse-intent route error", error);
		if (error instanceof SyntaxError) {
			return parseErrorResponse();
		}
		return NextResponse.json({ message: "Failed to parse adoption intent" }, { status: 500 });
	}
}