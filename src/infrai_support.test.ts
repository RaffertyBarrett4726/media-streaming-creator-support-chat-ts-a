import { buildSupportPlan } from "./infrai_support.ts";

const plan = buildSupportPlan({
  visitorId: "v1",
  assetId: "asset-a",
  processingJobId: "job-9",
  creatorEmail: "owner@example.com",
  question: "Where is my delivery?",
});

if (plan.channel !== "support-asset-a-v1") throw new Error("channel must identify the visitor and asset");
if (plan.tokenRequest.channels[0] !== plan.channel) throw new Error("token must authorize the chat channel");
if (plan.tokenRequest.capabilities.join(",") !== "publish,presence") throw new Error("token capabilities must match the realtime contract");
if (!plan.transcript.body.includes("job-9")) throw new Error("email must preserve the processing job context");
console.log("support decision test passed");
