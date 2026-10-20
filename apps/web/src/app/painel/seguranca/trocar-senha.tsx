"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";

const TAMANHO_MINIMO = 10;

export function TrocarSenha() {
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function trocar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    const nova = String(dados.get("nova"));
    if (nova.length < TAMANHO_MINIMO) {
      setMensagem({ tipo: "erro", texto: `A nova senha deve ter ao menos ${TAMANHO_MINIMO} caracteres.` });
      return;
    }
    if (nova !== dados.get("confirmacao")) {
      setMensagem({ tipo: "erro", texto: "As senhas não conferem." });
      return;
    }
    setEnviando(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(dados.get("atual")),
      newPassword: nova,
      revokeOtherSessions: true,
    });
    setEnviando(false);
    if (error) {
      setMensagem({ tipo: "erro", texto: "Senha atual incorreta." });
      return;
    }
    formulario.reset();
    setMensagem({ tipo: "sucesso", texto: "Senha alterada. Outras sessões foram encerradas." });
  }

  return (
    <Cartao>
      <h2 className="mb-4 text-lg font-bold">Alterar senha</h2>
      <form onSubmit={trocar} className="flex flex-col gap-4">
        <Campo rotulo="Senha atual" name="atual" type="password" autoComplete="current-password" required />
        <Campo rotulo="Nova senha" name="nova" type="password" autoComplete="new-password" minLength={TAMANHO_MINIMO} required />
        <Campo rotulo="Confirmar nova senha" name="confirmacao" type="password" autoComplete="new-password" required />
        {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}
        <Botao type="submit" disabled={enviando}>
          Salvar
        </Botao>
      </form>
    </Cartao>
  );
}
