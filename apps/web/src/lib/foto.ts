import "server-only";

export const TAMANHO_MAXIMO_FOTO = 900 * 1024;

/** Identifica o formato pelos primeiros bytes (não confia na extensão nem no tipo enviado). */
export function tipoDaImagem(bytes: Uint8Array): "image/webp" | "image/jpeg" | "image/png" | null {
  const inicio = (...valores: number[]) => valores.every((v, i) => bytes[i] === v);
  if (inicio(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (inicio(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  const riff = inicio(0x52, 0x49, 0x46, 0x46);
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (riff && webp) return "image/webp";
  return null;
}
