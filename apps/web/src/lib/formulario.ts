import { startTransition, type FormEvent } from "react";

/**
 * Envia o formulário para uma ação sem o reset automático que o React aplica em `<form action>`.
 * Assim, quando há erro de validação, o que a pessoa digitou continua na tela.
 */
export function aoEnviar(acao: (dados: FormData) => void) {
  return (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acao(dados));
  };
}
