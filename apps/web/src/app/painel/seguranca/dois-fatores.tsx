"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Cartao } from "@/components/ui/cartao";
import { Aviso } from "@/components/ui/aviso";
import { Selo } from "@/components/ui/selo";

type Etapa =
  | { tipo: "inicio" }
  | { tipo: "escanear"; qrCode: string; chave: string; codigosReserva: string[] }
  | { tipo: "concluido"; codigosReserva: string[] };

function extrairChave(totpUri: string) {
  return new URL(totpUri).searchParams.get("secret") ?? "";
}

export function DoisFatores({ ativo, obrigatorio }: { ativo: boolean; obrigatorio: boolean }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "inicio" });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function iniciar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const senha = String(new FormData(evento.currentTarget).get("senha"));
    const { data, error } = await authClient.twoFactor.enable({ password: senha });
    setEnviando(false);
    if (error || !data || data.method !== "totp") {
      setErro("Senha incorreta.");
      return;
    }
    setEtapa({
      tipo: "escanear",
      qrCode: await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 }),
      chave: extrairChave(data.totpURI),
      codigosReserva: data.backupCodes,
    });
  }

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (etapa.tipo !== "escanear") return;
    setErro(null);
    setEnviando(true);
    const codigo = String(new FormData(evento.currentTarget).get("codigo")).trim();
    const { error } = await authClient.twoFactor.verifyTotp({ code: codigo });
    setEnviando(false);
    if (error) {
      setErro("Código inválido.");
      return;
    }
    setEtapa({ tipo: "concluido", codigosReserva: etapa.codigosReserva });
  }

  async function desativar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const senha = String(new FormData(evento.currentTarget).get("senha"));
    const { error } = await authClient.twoFactor.disable({ password: senha });
    setEnviando(false);
    if (error) {
      setErro("Senha incorreta.");
      return;
    }
    router.refresh();
  }

  return (
    <Cartao className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Verificação em duas etapas</h2>
        <Selo className={ativo ? "bg-status-pronto/10 text-status-pronto" : undefined}>
          {ativo ? "Ativa" : "Inativa"}
        </Selo>
      </div>

      {etapa.tipo === "inicio" && !ativo && (
        <form onSubmit={iniciar} className="flex flex-col gap-4">
          <Campo rotulo="Senha atual" name="senha" type="password" autoComplete="current-password" required />
          <Botao type="submit" disabled={enviando}>
            Ativar
          </Botao>
        </form>
      )}

      {etapa.tipo === "escanear" && (
        <form onSubmit={confirmar} className="flex flex-col gap-4">
          <p className="text-sm text-texto-suave">Escaneie o código no aplicativo autenticador.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada localmente (data URL) */}
          <img src={etapa.qrCode} alt="QR Code" width={220} height={220} className="self-center rounded-xl" />
          <p className="break-all text-center font-mono text-sm">{etapa.chave}</p>
          <Campo rotulo="Código" name="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
          <Botao type="submit" disabled={enviando}>
            Confirmar
          </Botao>
        </form>
      )}

      {etapa.tipo === "concluido" && (
        <div className="flex flex-col gap-4">
          <Aviso tipo="sucesso">Verificação ativada.</Aviso>
          <p className="text-sm font-semibold">Códigos de recuperação. Guarde em local seguro; cada um vale uma vez.</p>
          <ul className="grid grid-cols-2 gap-2 rounded-xl bg-fundo p-4 font-mono text-sm">
            {etapa.codigosReserva.map((codigo) => (
              <li key={codigo}>{codigo}</li>
            ))}
          </ul>
          <Botao onClick={() => router.push("/painel")}>Continuar</Botao>
        </div>
      )}

      {etapa.tipo === "inicio" && ativo && !obrigatorio && (
        <form onSubmit={desativar} className="flex flex-col gap-4">
          <Campo rotulo="Senha atual" name="senha" type="password" autoComplete="current-password" required />
          <Botao type="submit" variante="secundario" disabled={enviando}>
            Desativar
          </Botao>
        </form>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </Cartao>
  );
}
