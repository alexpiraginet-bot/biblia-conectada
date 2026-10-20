import "server-only";
import { assistantConfig, UNAVAILABLE_MESSAGE } from "./config";
import { retrieveGrounding } from "./grounding";
import { AssistantFault, parseAssistantRequest, readBoundedJson } from "./input";
import { redisCommand, reserve, settle, visitorIdentity } from "./ledger";
import { callProvider, maximumCostMicros, providerPayload } from "./provider";
import { validateAnswer } from "./response";
import type { AssistantResponse } from "./types";

export async function handleStudy(request: Request): Promise<{ body: AssistantResponse; status: number }> {
  try {
    const config = assistantConfig();
    if (!config) throw new AssistantFault("unavailable", 503, UNAVAILABLE_MESSAGE);
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin ||
      request.headers.get("sec-fetch-site") === "cross-site") {
      throw new AssistantFault("invalid", 403, "Abra o companheiro de estudo no Bíblia Conectada para continuar.");
    }
    const visitor = visitorIdentity(request, config.rateSecret);
    const input = parseAssistantRequest(await readBoundedJson(request));
    const grounding = await retrieveGrounding(input);
    const payload = providerPayload(input, grounding);
    const amount = maximumCostMicros(payload);
    request.signal.throwIfAborted();
    const command = redisCommand(config);
    const reservation = await reserve(command, input, visitor, amount);
    // Abort after reservation retains it, because delivery cannot be proved absent across a race.
    request.signal.throwIfAborted();
    const result = await callProvider(config.apiKey, payload, request.signal);
    await settle(command, reservation, result.costMicros);
    return { body: validateAnswer(result.answer, input, grounding), status: 200 };
  } catch (error) {
    if (error instanceof AssistantFault) {
      return {
        body: {
          ok: false, code: error.code, message: error.message,
          ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
        },
        status: error.status,
      };
    }
    // Never expose provider errors, keys, prompts or user questions in logs or responses.
    return { body: { ok: false, code: "provider", message: "O estudo não foi concluído. Tente novamente mais tarde." }, status: 502 };
  }
}
