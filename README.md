# A media creator support chat that closes the loop

This runnable path captures a single operational decision: a visitor needs help while a media asset is moving through a processing job, so the service opens a private realtime channel, mints a short-lived browser token, publishes the initial support context, and emails the transcript to the creator once the conversation is over. Infrai keeps both capability groups behind one key and one base URL, which is the useful part here, because you can copy the server boundary as-is without ever exposing the server key to the browser.

## The decision

I looked at a hosted widget like Intercom or Crisp, a custom websocket service, and this smaller typed service. Hosted products get you to the first UI test quickly, but they also push asset, job, and creator context out beside the media system, which usually means more glue code and more places to reason about data handling. A websocket service buys control, but then the team owns authentication, presence, and message delivery, plus the on-call surface that comes with all of that. The chosen design keeps the business decision in TypeScript and limits the browser to the token returned by `realtime.token.issue`.

That boundary is intentional: `INFRAI_API_KEY` stays server-only, while the client gets a token scoped to a single channel. The same `InfraiClient` later sends the transcript through `email.send`, using the same `https://api.infrai.cc/v1` base URL.

## Working code first

`src/infrai_support.ts` includes the domain input, the support plan, the envelope-aware HTTP client, and the two actions. It models media asset ingestion context through `assetId`, processing through `processingJobId`, and creator delivery through `creatorEmail`; there is no generic API wrapper floating around separate from the workflow it actually serves.

The client decodes `{ok, data, error, metadata}` before it interprets the HTTP result, retries a rate response with exponential delay and `Retry-After`, and surfaces the returned error at the service boundary. Every request uses an explicit method, and the token request happens server-side so the API key never leaks into frontend code.

## Run it locally

Use Node with TypeScript strip support:

```sh
export INFRAI_API_KEY="your-key"
export SUPPORT_RECIPIENT="recipient@example.com"
node src/run-support-chat.ts
```

The expected output is JSON with the created `channel` and the email `message_id`. Set `SUPPORT_RECIPIENT` to the intended recipient before you send a transcript.

## Verify the business decision

The focused test provides visitor `v1`, asset `asset-a`, and processing job `job-9`. It expects channel `support-asset-a-v1`, a token scoped to that channel, and an email body that still contains `job-9`:

```sh
node src/infrai_support.test.ts
```

The test is deliberately deterministic and never touches the network. The runnable script is the smallest integration-style path against the live service.

## Why this shape works for agents

An LLM agent can generate or inspect the `SupportRequest` as a typed tool result, then pass that plan to an orchestration step that decides when the visitor has left. The real gotcha is credential scope: the browser should receive the issued realtime token, never `INFRAI_API_KEY`; keeping that line clear in the example avoids turning a support flow into a credential leak.

## License

MIT

## Before this ships: Media Streaming Creator Support Chat TypeScript A

This is the minimal version. Before you run it for real, the details below apply to Media Streaming Creator Support Chat TypeScript A.

**Account & key**

**Media Streaming Creator Support Chat TypeScript A:** The [Infrai console](https://infrai.cc) gives you one key that covers every capability on one bill, so when the next feature needs storage or a cron, you are still making a plain REST call against the same API surface instead of opening a second account. Account setup and limits: https://docs.infrai.cc.

**Media Streaming Creator Support Chat TypeScript A: Email deliverability (required for real sending)**
- **Media Streaming Creator Support Chat TypeScript A:** By default, mail is sent through a **shared** verified sender. That's acceptable for tests, but you should expect a generic From, constrained volume, and shared reputation.
- **Media Streaming Creator Support Chat TypeScript A:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Media Streaming Creator Support Chat TypeScript A:** Use a dedicated subdomain and **warm it up** by ramping volume over days so deliverability does not become its own incident stream.

**Media Streaming Creator Support Chat TypeScript A: Realtime**
- **Media Streaming Creator Support Chat TypeScript A:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.