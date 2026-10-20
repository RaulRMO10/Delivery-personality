/** Toca um aviso curto (dois bipes) com a Web Audio API, sem arquivos de som. */
let contexto: AudioContext | null = null;

export function prepararSom() {
  contexto ??= new AudioContext();
  if (contexto.state === "suspended") void contexto.resume();
}

export function tocarAviso() {
  if (!contexto || contexto.state !== "running") return;
  const inicio = contexto.currentTime;
  for (const [atraso, frequencia] of [
    [0, 880],
    [0.25, 1175],
  ] as const) {
    const oscilador = contexto.createOscillator();
    const volume = contexto.createGain();
    oscilador.type = "sine";
    oscilador.frequency.value = frequencia;
    volume.gain.setValueAtTime(0.0001, inicio + atraso);
    volume.gain.exponentialRampToValueAtTime(0.4, inicio + atraso + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + atraso + 0.22);
    oscilador.connect(volume).connect(contexto.destination);
    oscilador.start(inicio + atraso);
    oscilador.stop(inicio + atraso + 0.25);
  }
}
