import {
	BedrockRuntimeClient,
	ConverseCommand,
	type ConverseCommandOutput,
	type ConverseCommandInput,
} from "@aws-sdk/client-bedrock-runtime";

let client: BedrockRuntimeClient | null = null;

const bedrockModelId = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

function getBedrockRegion() {
	const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;

	if (!region) {
		throw new Error("AWS_REGION is required");
	}

	return region;
}

function getBedrockClient() {
	if (!client) {
		client = new BedrockRuntimeClient({
			region: getBedrockRegion(),
		});
	}

	return client;
}

function extractTextFromResponse(response: ConverseCommandOutput) {
	const output = response as {
		output?: {
			message?: {
				content?: Array<{ text?: string }>;
			};
		};
	};

	return output.output?.message?.content?.map((part) => part.text ?? "").join("") ?? "";
}

export async function generateBedrockText(prompt: string) {
	const modelId = bedrockModelId;
	const input: ConverseCommandInput = {
		modelId,
		messages: [
			{
				role: "user",
				content: [{ text: prompt }],
			},
		],
		inferenceConfig: {
			maxTokens: 4096,
			temperature: 0.2,
		},
	};

	try {
		console.info(`bedrock: attempting model ${modelId}`);
		const response = await getBedrockClient().send(new ConverseCommand(input));
		const text = extractTextFromResponse(response);

		if (text) {
			console.info(`bedrock: success model ${modelId}`);
			return text;
		}

		throw new Error("Bedrock returned an empty response");
	} catch (error) {
		console.error(`bedrock: error using model ${modelId}`, error);
		throw error instanceof Error ? error : new Error("Bedrock request failed");
	}
}