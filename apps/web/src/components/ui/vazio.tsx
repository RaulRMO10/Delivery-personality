import { Cartao } from "./cartao";

export function Vazio({ texto }: { texto: string }) {
  return <Cartao className="py-10 text-center text-texto-suave">{texto}</Cartao>;
}
