import { z } from "zod";
import { db, eq, schema } from "@delivery/db";

/** Foto pública do produto. A URL leva a versão (?v=), por isso o cache pode ser longo. */
export async function GET(_requisicao: Request, { params }: RouteContext<"/api/fotos/produto/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const [foto] = await db.select().from(schema.produtoFotos).where(eq(schema.produtoFotos.produtoId, id));
  if (!foto) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(foto.conteudo), {
    headers: {
      "Content-Type": foto.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
