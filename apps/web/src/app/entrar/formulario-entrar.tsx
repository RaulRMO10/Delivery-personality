"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";

export function FormularioEntrar() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const { data, error } = await authClient.signIn.email({
      email: String(dados.get("email")),
      password: String(dados.get("senha")),
    });
    setEnviando(false);
    if (error) {
      setErro(error.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "E-mail ou senha inválidos.");
      return;
    }
    const precisaVerificar = data && "twoFactorRedirect" in data && data.twoFactorRedirect;
    router.replace(precisaVerificar ? "/entrar/verificacao" : "/painel");
    router.refresh();
  }

  return (
    <Cartao>
      <h1 className="mb-5 text-xl font-bold">Entrar</h1>
      <form onSubmit={entrar} className="flex flex-col gap-4">
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
        <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Botao>
      </form>
    </Cartao>
  );
}
