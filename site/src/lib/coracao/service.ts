import "server-only";
import { assistantConfig } from "@/lib/assistant/config";
import { AssistantFault, readBoundedJson } from "@/lib/assistant/input";
import { redisCommand, reserve, settle, visitorIdentity } from "@/lib/assistant/ledger";
import { issueVoiceTextTicket } from "@/lib/assistant/voice";
import { voiceProvider } from "@/lib/assistant/voice-provider";
import { CORACAO_MODEL, CORACAO_UNAVAILABLE } from "./config";
import { CoracaoFailure, type CoracaoProviderDiagnostics } from "./failure";
import { CORACAO_MAX_BODY_BYTES, parseCoracaoRequest } from "./input";
import { retrieveCoracao } from "./retrieval";
import { callCoracaoProvider, coracaoMaximumCost, coracaoPayload } from "./provider";
import { clarifyCoracao, validateCoracaoAnswer } from "./response";
import type { CoracaoResponse } from "./types";

export async function handleCoracao(request: Request): Promise<{ body: CoracaoResponse; status: number }> {
  const started = Date.now();
  let phase = "request", sourceCount = 0;
  let diagnostics: CoracaoProviderDiagnostics | undefined;
  try {
    const config = assistantConfig();
    if (!config) throw new AssistantFault("unavailable", 503, CORACAO_UNAVAILABLE);
    if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new AssistantFault("invalid", 403, "Abra a conversa no Bíblia Conectada para continuar.");
    }
    const visitor = visitorIdentity(request, config.rateSecret);
    const input = parseCoracaoRequest(await readBoundedJson(request, CORACAO_MAX_BODY_BYTES));
    request.signal.throwIfAborted();
    phase = "retrieval";
    const grounding = await retrieveCoracao(input);
    sourceCount = grounding.citations.length;
    request.signal.throwIfAborted();
    if (!grounding.citations.length) return { body: clarifyCoracao(input, grounding), status: 200 };
    const payload = coracaoPayload(input, grounding);
    const command = redisCommand(config);
    // The operation/model are in the fingerprint. UUID, total, rate counters and Lua remain shared.
    phase = "reservation";
    const reservation = await reserve(command, { operation: "coracao-v1", model: CORACAO_MODEL, ...input }, visitor, coracaoMaximumCost(payload));
    request.signal.throwIfAborted();
    phase = "provider";
    const result = await callCoracaoProvider(config.apiKey, payload, request.signal);
    diagnostics = result.diagnostics;
    await settle(command, reservation, result.costMicros);
    if (result.failure) throw new CoracaoFailure(result.failure);
    phase = "validation";
    const body = validateCoracaoAnswer(result.answer, input, grounding);
    const voice = voiceProvider();
    if (voice && body.kind === "answer") {
      const prose = [body.title, ...body.blocks.map((block) => block.text),
        ...(body.suggestedReply ? [`Uma resposta que você pode adaptar: ${body.suggestedReply}`] : [])].join("\n\n");
      body.audio = issueVoiceTextTicket(prose, input.requestId, visitor, config.rateSecret, voice.profile);
    }
    return { body, status: 200 };
  } catch (error) {
    if (error instanceof CoracaoFailure) {
      // Deliberately omit request IDs, identity, text, references, raw errors and provider bodies.
      console.error("coracao_failure", { provider: "anthropic", model: CORACAO_MODEL, phase,
        reason: error.reason, sourceCount, durationMs: Math.max(0, Date.now() - started), ...diagnostics });
    }
    if (error instanceof AssistantFault) return { body: { ok: false, code: error.code, message: error.message,
      ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}) }, status: error.status };
    return { body: { ok: false, code: "provider", message: "A conversa não foi concluída. Tente novamente mais tarde." }, status: 502 };
  }
}
