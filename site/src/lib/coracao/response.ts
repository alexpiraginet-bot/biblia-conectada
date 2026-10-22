import { isRecord } from "@/lib/assistant/input";
import type { AssistantBlock } from "@/lib/assistant/types";
import { CoracaoFailure, type CoracaoFailureReason } from "./failure";
import { normalizeSearch, type CoracaoGrounding } from "./retrieval";
import type { CoracaoInput, CoracaoSuccess } from "./types";

export function coracaoSchema(ids: string[], mode: CoracaoInput["mode"]) {
  return {
    type: "object", additionalProperties: false,
    properties: {
      kind: { type: "string", enum: ["answer", "clarify", "redirect"] },
      title: { type: "string", description: "Título curto, com até 100 caracteres." },
      blocks: { type: "array", minItems: 1, description: "De 1 a 3 blocos breves; no máximo 4.", items: {
        type: "object", additionalProperties: false,
        properties: {
          text: { type: "string", description: "Prefira duas frases. Limite de 1100 caracteres; referências sempre por extenso, somente das fontes recebidas." },
          citationIds: { type: "array", description: "Em answer, de 1 a 4 IDs que sustentam o bloco. Em clarify ou redirect, lista vazia.", items: { type: "string", enum: ids } },
        },
        required: ["text", "citationIds"],
      } },
      suggestions: { type: "array", description: "Até 2 perguntas curtas; no máximo 3, com até 160 caracteres cada.", items: { type: "string" } },
      ...(mode === "jesus" ? { suggestedReply: { type: ["string", "null"], description: "Resposta humana breve para adaptar, até 500 caracteres, somente em answer. Caso contrário, null." } } : {}),
    },
    required: ["kind", "title", "blocks", "suggestions", ...(mode === "jesus" ? ["suggestedReply"] : [])],
  };
}
function rejected(reason: CoracaoFailureReason = "invalid_shape"): never {
  throw new CoracaoFailure(reason);
}
function plain(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]|<[^>]*>|https?:\/\/|javascript:|data:/i.test(value)) return rejected("invalid_prose");
  return value.trim();
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) rejected("invalid_fields");
}
export function coracaoNotice(mode: CoracaoInput["mode"]): string {
  return mode === "jesus"
    ? "Reflexão assistida por IA, inspirada nos evangelhos. Não é Jesus falando, revelação divina nem certeza sobre o que ele faria. Confira o texto e considere seu contexto."
    : "Conversa assistida por IA, em perspectiva cristã. As passagens são reais; uma referência válida não garante que a interpretação esteja correta. Confira o contexto.";
}
/** Only source IDs and plain prose may come from the model; quotations, credit and URLs are server-owned. */
export function validateCoracaoAnswer(value: unknown, input: CoracaoInput, grounding: CoracaoGrounding): CoracaoSuccess {
  if (!isRecord(value)) return rejected();
  keys(value, ["kind", "title", "blocks", "suggestions", ...(input.mode === "jesus" ? ["suggestedReply"] : [])]);
  if (value.kind !== "answer" && value.kind !== "clarify" && value.kind !== "redirect") return rejected();
  const kind = value.kind;
  const allowed = new Map(grounding.citations.map((citation) => [citation.id, citation]));
  const references = new Set(grounding.citations.map((c) => normalizeSearch(c.reference).replace(/\s/g, "")));
  const used = new Set<string>();
  function prose(raw: unknown, max: number) {
    const text = plain(raw, max);
    const normalized = normalizeSearch(text);
    if (/\b(?:eu sou jesus|sou eu,? jesus|deus me revelou|deus me disse|jesus com certeza (?:faria|diria))\b/.test(normalized)) return rejected("divine_identity");
    // A model cannot bypass citation IDs by inventing a numbered reference in its prose.
    for (const match of text.matchAll(/((?:[123]\s*)?[\p{L}]+\s*\d{1,3}:)(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/gu)) {
      const first = Number(match[2]), last = Number(match[3] ?? match[2]);
      if (last < first || last-first > 175) return rejected("invalid_reference");
      for (let verse = first; verse <= last; verse++) {
        if (!references.has(normalizeSearch(`${match[1]}${verse}`).replace(/\s/g, ""))) return rejected("invalid_reference");
      }
    }
    return text;
  }
  if (!Array.isArray(value.blocks) || value.blocks.length < 1 || value.blocks.length > 4 ||
      !Array.isArray(value.suggestions) || value.suggestions.length > 3) return rejected();
  const blocks: AssistantBlock[] = value.blocks.map((raw) => {
    if (!isRecord(raw)) return rejected();
    keys(raw, ["text", "citationIds"]);
    if (!Array.isArray(raw.citationIds) || raw.citationIds.length > 4 ||
      (kind === "answer" ? raw.citationIds.length < 1 : raw.citationIds.length !== 0) ||
      raw.citationIds.some((id) => typeof id !== "string" || !allowed.has(id))) return rejected("invalid_citations");
    const citationIds = [...new Set(raw.citationIds as string[])];
    citationIds.forEach((id) => used.add(id));
    return { text: prose(raw.text, 1100), citationIds };
  });
  let suggestedReply: string | undefined;
  if (value.suggestedReply !== undefined && value.suggestedReply !== null) {
    if (input.mode !== "jesus" || kind !== "answer") return rejected("invalid_suggested_reply");
    suggestedReply = prose(value.suggestedReply, 500);
  }
  return { ok: true, mode: input.mode, kind, title: prose(value.title, 100), blocks,
    citations: grounding.citations.filter((citation) => used.has(citation.id)),
    suggestions: value.suggestions.map((s) => prose(s, 160)),
    ...(suggestedReply ? { suggestedReply } : {}), source: grounding.source, notice: coracaoNotice(input.mode) };
}

export function clarifyCoracao(input: CoracaoInput, grounding: CoracaoGrounding): CoracaoSuccess {
  return { ok: true, mode: input.mode, kind: "clarify", title: "Vamos encontrar um ponto de partida",
    blocks: [{ text: input.mode === "jesus"
      ? "Você pode contar um pouco mais da situação? Assim podemos procurar um ensinamento dos evangelhos que tenha relação com ela, sem presumir o que Jesus faria."
      : "Ainda não encontrei uma passagem com apoio suficiente nesse recorte da busca. Você lembra alguma palavra, personagem ou situação? Também pode dizer qual sentimento ou tema quer explorar na Bíblia.", citationIds: [] }],
    citations: [], suggestions: [], source: grounding.source, notice: coracaoNotice(input.mode) };
}
