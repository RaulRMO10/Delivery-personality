"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";

export function FormularioVerificacao() {
  const router = useRouter();
  const [usarReserva, setUsarReserva] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function verificar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const codigo = String(dados.get("codigo")).trim();
    const confiar = dados.get("confiar") === "on";
    const { error } = usarReserva
      ? await authClient.twoFactor.verifyBackupCode({ code: codigo, trustDevice: confiar })
      : await authClient.twoFactor.verifyTotp({ code: codigo, trustDevice: confiar });
    setEnviando(false);
    if (error) {
      setErro(error.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "Código inválido.");
      return;
    }
    router.replace("/painel");
    router.refresh();
  }

  return (
    <Cartao>
      <h1 className="mb-1 text-xl font-bold">Verificação</h1>
      <p className="mb-5 text-sm text-texto-suave">
        {usarReserva ? "Informe um código de recuperação." : "Informe o código do aplicativo autenticador."}
      </p>
      <form onSubmit={verificar} className="flex flex-col gap-4">
        <Campo
          key={usarReserva ? "reserva" : "totp"}
          rotulo="Código"
          name="codigo"
          inputMode={usarReserva ? "text" : "numeric"}
          autoComplete="one-time-code"
          maxLength={usarReserva ? 20 : 6}
          autoFocus
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="confiar" className="size-4 accent-marca-600" />
          Confiar neste dispositivo por 30 dias
        </label>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" disabled={enviando}>
          {enviando ? "Verificando…" : "Confirmar"}
        </Botao>
        <Botao variante="fantasma" onClick={() => setUsarReserva(!usarReserva)}>
          {usarReserva ? "Usar aplicativo autenticador" : "Usar código de recuperação"}
        </Botao>
      </form>
    </Cartao>
  );
}
