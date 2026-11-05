import { InfraiClient, emailTranscript, startSupportChat, type SupportRequest } from "./infrai_support.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
const recipient = process.env.SUPPORT_RECIPIENT;
if (!recipient) throw new Error("Set SUPPORT_RECIPIENT before running the example");

const request: SupportRequest = {
  visitorId: "visitor-42",
  assetId: "episode-1080",
  processingJobId: "transcode-1080p-7",
  creatorEmail: recipient,
  question: "Why is my 1080p delivery still processing?",
};

const client = new InfraiClient(key);
const session = await startSupportChat(request, client);
const email = await emailTranscript({ channel: session.channel, tokenRequest: { client_id: request.visitorId, channels: [session.channel], capabilities: ["publish"], ttl_seconds: 3600 }, transcript: session.transcript }, client);
console.log(JSON.stringify({ channel: session.channel, message_id: email.message_id }, null, 2));
