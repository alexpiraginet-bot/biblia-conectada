import { AssistantFault, isRecord } from "./input";
import type { Grounding } from "./grounding";
import type { AssistantBlock, AssistantRequest, AssistantSuccess } from "./types";

export function responseSchema(ids: string[], narrate: boolean) {
  const cited = {
    type: "object",
    properties: {
      text: { type: "string" },
      citationIds: { type: "array", items: { type: "string", enum: ids }, minItems: 1, description: "De 1 a 4 IDs de fontes que sustentam o texto." },
    },
    required: ["text", "citationIds"], additionalProperties: false,
  };
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      blocks: { type: "array", items: cited, minItems: 1, description: "De 1 a 4 blocos breves." },
      suggestions: { type: "array", items: { type: "string" }, description: "Até 3 perguntas breves para continuar a leitura." },
      ...(narrate ? { scenes: {
        type: "array", minItems: 1, description: "Exatamente 3 cenas breves, sem acrescentar fatos às passagens.",
        items: {
          ...cited,
          properties: { title: { type: "string" }, ...cited.properties },
          required: ["title", "text", "citationIds"],
        },
      } } : {}),
    },
    required: ["title", "blocks", "suggestions", ...(narrate ? ["scenes"] : [])],
    additionalProperties: false,
  };
}

function rejected(): never {
  throw new AssistantFault("provider", 502, "Não consegui preparar uma resposta com fontes verificáveis. Tente uma pergunta mais específica.");
}
function plain(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]|<[^>]*>|https?:\/\/|javascript:|data:/i.test(value)) return rejected();
  return value.trim();
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) rejected();
}

/** The model supplies prose and source IDs only. Every route, quotation and image comes from our data. */
export function validateAnswer(value: unknown, request: AssistantRequest, grounding: Grounding): AssistantSuccess {
  if (!isRecord(value)) return rejected();
  keys(value, ["title", "blocks", "suggestions", ...(request.mode === "narrar" ? ["scenes"] : [])]);
  const allowed = new Map(grounding.citations.map((citation) => [citation.id, citation]));
  const used = new Set<string>();
  function block(raw: unknown, scene = false): AssistantBlock {
    if (!isRecord(raw)) return rejected();
    keys(raw, scene ? ["title", "text", "citationIds"] : ["text", "citationIds"]);
    if (!Array.isArray(raw.citationIds) || raw.citationIds.length < 1 || raw.citationIds.length > 4 ||
      raw.citationIds.some((id) => typeof id !== "string" || !allowed.has(id))) return rejected();
    const citationIds = [...new Set(raw.citationIds as string[])];
    citationIds.forEach((id) => used.add(id));
    return { text: plain(raw.text, scene ? 650 : 1300), citationIds };
  }
  if (!Array.isArray(value.blocks) || value.blocks.length < 1 || value.blocks.length > 4 ||
    !Array.isArray(value.suggestions) || value.suggestions.length > 3) return rejected();
  const title = plain(value.title, 110);
  const blocks = value.blocks.map((item) => block(item));
  const suggestions = value.suggestions.map((item) => plain(item, 160));
  let scenes: AssistantSuccess["scenes"];
  if (request.mode === "narrar") {
    if (!Array.isArray(value.scenes) || value.scenes.length !== 3) return rejected();
    scenes = value.scenes.map((raw, index) => {
      const content = block(raw, true);
      const citation = allowed.get(content.citationIds[0])!;
      return {
        ...content, id: `scene-${index + 1}`, title: plain((raw as Record<string, unknown>).title, 100),
        art: { ...grounding.art }, action: { href: citation.href, label: `Ler ${citation.reference}` },
      };
    });
  }
  return {
    ok: true, mode: request.mode, title, blocks,
    citations: grounding.citations.filter((citation) => used.has(citation.id)),
    suggestions, ...(scenes ? { scenes } : {}),
    source: grounding.source,
    notice: `Interpretação assistida por IA, em perspectiva cristã. Confira as passagens ${request.translation === "open-nbv" ? "da Open Nova Bíblia Viva" : "BLIVRE"}; uma citação válida não garante que a interpretação seja correta.`,
  };
}
