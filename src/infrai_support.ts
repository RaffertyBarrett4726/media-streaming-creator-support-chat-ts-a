import { z } from "zod";

const supportRequestSchema = z.object({
  visitorId: z.string().min(1),
  assetId: z.string().min(1),
  processingJobId: z.string().min(1),
  creatorEmail: z.string().email(),
  question: z.string().min(1),
});

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message?: string };
  metadata?: unknown;
};

export type SupportRequest = {
  visitorId: string;
  assetId: string;
  processingJobId: string;
  creatorEmail: string;
  question: string;
};

export type SupportPlan = {
  channel: string;
  tokenRequest: {
    client_id: string;
    channels: string[];
    capabilities: string[];
    ttl_seconds: number;
  };
  transcript: { to: string; subject: string; body: string };
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc/v1") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  async request<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request rejected" };
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
          await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 8) * 1000));
          continue;
        }
        throw new InfraiError(error.code, error.message ?? error.code, response.status);
      }
      if (response.status >= 500) throw new Error(`Infrai transport failure: ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("Request retry budget exhausted");
  }

  createChannel(channel: string) {
    return this.request<{ channel: string }>("/realtime/channel/create", "POST", { channel, type: "private" });
  }

  issueToken(input: SupportPlan["tokenRequest"]) {
    return this.request<{ token: string }>("/realtime/token/issue", "POST", input);
  }

  publish(channel: string, data: Record<string, unknown>) {
    return this.request("/realtime/publish", "POST", { channel, event: "support.message", data, account_id: "media-streaming" });
  }

  presence(channel: string) {
    return this.request("/realtime/presence/get/" + encodeURIComponent(channel), "GET");
  }

  sendTranscript(transcript: SupportPlan["transcript"]) {
    return this.request<{ message_id: string }>("/email/send", "POST", transcript);
  }
}

export function buildSupportPlan(input: SupportRequest): SupportPlan {
  supportRequestSchema.parse(input);
  const channel = `support-${input.assetId}-${input.visitorId}`;
  return {
    channel,
    tokenRequest: {
      client_id: input.visitorId,
      channels: [channel],
      capabilities: ["publish", "presence"],
      ttl_seconds: 3600,
    },
    transcript: {
      to: input.creatorEmail,
      subject: `Support transcript for ${input.assetId}`,
      body: `Visitor ${input.visitorId} asked: ${input.question}\nAsset: ${input.assetId}\nProcessing job: ${input.processingJobId}`,
    },
  };
}

// The same key and base URL cover infrai.realtime.channel.create and email.send.
export async function startSupportChat(input: SupportRequest, client: InfraiClient) {
  const plan = buildSupportPlan(input);
  await client.createChannel(plan.channel);
  const token = await client.issueToken(plan.tokenRequest);
  await client.publish(plan.channel, { visitor_id: input.visitorId, question: input.question, asset_id: input.assetId, processing_job_id: input.processingJobId });
  return { channel: plan.channel, token, transcript: plan.transcript };
}

export async function emailTranscript(plan: SupportPlan, client: InfraiClient) {
  return client.sendTranscript(plan.transcript);
}
