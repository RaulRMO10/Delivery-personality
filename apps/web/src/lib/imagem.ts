/** Redimensiona e converte a foto para WebP no navegador, antes do envio. */
export async function prepararFoto(arquivo: File, ladoMaximo = 1000, qualidade = 0.82): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
  const largura = Math.round(imagem.width * escala);
  const altura = Math.round(imagem.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Não foi possível processar a imagem.");
  contexto.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();
  return new Promise((resolver, rejeitar) =>
    canvas.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error("Não foi possível processar a imagem."))), "image/webp", qualidade),
  );
}
