import { describe, expect, it } from "vitest";
import { buildHeartRequest } from "@/components/coracao/HeartConversation";
import { parseCoracaoRequest, CORACAO_MAX_BODY_BYTES } from "@/lib/coracao/input";
import type { CoracaoMode, CoracaoRequest, CoracaoSuccess } from "@/lib/coracao/types";

const answer: CoracaoSuccess = {
  ok: true, kind: "answer", mode: "encontrar", title: "Um caminho de paz",
  blocks: [{ text: "Um convite para ler o contexto.", citationIds: ["verse-1"] }],
  citations: [{ id: "verse-1", reference: "João 14:27", text: "Texto de teste.", href: "/ler/open-nbv/joao/14/27" }],
  suggestions: [], notice: "Confira o contexto.",
  source: { name: "Open NBV", credit: "Crédito de teste", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
};
function turn(question: string, mode: CoracaoMode = "encontrar", completed = true) {
  const request: CoracaoRequest = { requestId: crypto.randomUUID(), question, mode, translation: "open-nbv" };
  return { request, ...(completed ? { answer: { ...answer, mode } } : {}) };
}

describe("heart conversation request contract", () => {
  it("sends a valid Open NBV first question without history or an assumed passage", () => {
    const request = buildHeartRequest("  Estou precisando de paz  ", "encontrar", []);
    expect(parseCoracaoRequest(request)).toEqual(request);
    expect(request.question).toBe("Estou precisando de paz");
    expect(request.translation).toBe("open-nbv");
    expect(request.history).toBeUndefined();
  });

  it("keeps only two completed turns from the chosen mode and includes verifiable reference names", () => {
    const request = buildHeartRequest("Quem disse isso?", "encontrar", [
      turn("Primeira pergunta"), turn("Segunda pergunta"), turn("Falha de rede", "encontrar", false),
      turn("Como posso responder?", "jesus"), turn("Última pergunta"),
    ]);
    expect(parseCoracaoRequest(request)).toEqual(request);
    expect(request.history?.map((item) => item.question)).toEqual(["Segunda pergunta", "Última pergunta"]);
    expect(request.history?.every((item) => item.answer.endsWith("Passagens consultadas: João 14:27"))).toBe(true);
  });

  it("fits the API byte limit with multibyte context without losing the current question or its mode", () => {
    const previous = [turn("🌿".repeat(400)), turn("🌿".repeat(400))].map((item) => ({
      ...item, answer: { ...answer, blocks: [{ text: "🌿".repeat(2000), citationIds: ["verse-1"] }] },
    }));
    const request = buildHeartRequest("🌿".repeat(400), "encontrar", previous);
    expect(new TextEncoder().encode(JSON.stringify(request)).byteLength).toBeLessThanOrEqual(CORACAO_MAX_BODY_BYTES);
    expect(parseCoracaoRequest(request)).toEqual(request);
    expect(request.question).toHaveLength(800);
    expect(request.mode).toBe("encontrar");
    expect(request.history?.every((item) => item.answer.length <= 2000 && item.answer.includes("João 14:27"))).toBe(true);
  });
});
