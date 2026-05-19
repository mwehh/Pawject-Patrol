import {
	BedrockRuntimeClient,
	ConverseCommand,
	type ConverseCommandOutput,
	type ConverseCommandInput,
} from "@aws-sdk/client-bedrock-runtime";

let client: BedrockRuntimeClient | null = null;

const bedrockModelId = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

function getBedrockRegion() {
	// Use only the Amplify-safe per-service region env.
	const region = process.env.PAWJECT_AWS_REGION_BEDROCK;

	if (!region) {
		throw new Error("PAWJECT_AWS_REGION_BEDROCK is required for Bedrock");
	}

	return region;
}

function getBedrockClient() {
	if (!client) {
		const region = getBedrockRegion();

		const accessKeyId = process.env.PAWJECT_AWS_ACCESS_KEY_ID_BEDROCK;
		const secretAccessKey = process.env.PAWJECT_AWS_SECRET_ACCESS_KEY_BEDROCK;

		const opts: any = { region };
		if (accessKeyId && secretAccessKey) {
			opts.credentials = { accessKeyId, secretAccessKey };
		}

		client = new BedrockRuntimeClient(opts);
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