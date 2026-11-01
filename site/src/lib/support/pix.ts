import { validCents } from "./campaign";

export const ORIGINAL_PIX = "00020126470014br.gov.bcb.pix0125alexpiraginet@outlook.com5204000053039865802BR5922ALEX PIRAGINE TEIXEIRA6009Sao Paulo62290525REC6AE76AC0BF7CB5304699476304348C";
/** BCB BR Code: CRC-CCITT, polynomial 0x1021, initial value 0xffff, including 6304. */
export function pixCrc(value: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
export function pixFields(value: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!/^[\x20-\x7e]+$/.test(value) || value.length > 512) throw new Error("Invalid Pix payload");
  for (let offset = 0; offset < value.length;) {
    const header = value.slice(offset, offset + 4);
    if (!/^\d{4}$/.test(header)) throw new Error("Invalid Pix field");
    const id = header.slice(0, 2), length = Number(header.slice(2));
    if (result.has(id) || length === 0 || offset + 4 + length > value.length) throw new Error("Invalid Pix length");
    result.set(id, value.slice(offset + 4, offset + 4 + length)); offset += 4 + length;
  }
  return result;
}
function field(id: string, value: string): string { return id + String(value.length).padStart(2, "0") + value; }
/** Preserve the user's receiver, key and reference; change only the selected amount and checksum. */
export function campaignPix(cents: number): string {
  if (!validCents(cents)) throw new Error("Invalid Pix amount");
  const fields = pixFields(ORIGINAL_PIX);
  if (fields.get("63") !== pixCrc(ORIGINAL_PIX.slice(0, -4)) || fields.get("53") !== "986" || fields.get("58") !== "BR") throw new Error("Invalid campaign Pix");
  const amount = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
  let payload = "";
  for (const [id, value] of fields) {
    if (id === "54" || id === "63") continue;
    if (id === "58") payload += field("54", amount);
    payload += field(id, value);
  }
  payload += "6304";
  return payload + pixCrc(payload);
}
