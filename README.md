# Pawject-Patrol
Pawject Patrol is an animal profiling application developed as part of our academic requirements, in collaboration with Youth for Animals – UP Mindanao. The app is designed to support animal welfare efforts by providing an organized platform to document, track, and raise awareness about animals in the UP Mindanao community.

## Environment

Create a local `.env.local` from `.env.local.example` and fill in your Supabase credentials, AWS Bedrock credentials, and optional breed data API keys.

The adoption match flow uses AWS Bedrock through `@aws-sdk/client-bedrock-runtime` and runs against Anthropic Claude Haiku 4.5 with no automatic fallbacks.
