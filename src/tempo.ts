/**
 * Conversões de tempo. Ficam separadas porque são regra pura —
 * dá para testar sem React e sem API.
 */

/** 330 → "5'30"/km". Espelha o formatarPace do RunningService. */
export function formatarPace(segundosPorKm: number | null): string {
  if (segundosPorKm === null || segundosPorKm <= 0) return "--";
  const total = Math.round(segundosPorKm);
  return `${Math.floor(total / 60)}'${String(total % 60).padStart(2, "0")}"/km`;
}

/** 3300 → "55min" | 3900 → "1h05" */
export function formatarDuracao(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return horas > 0 ? `${horas}h${String(minutos).padStart(2, "0")}` : `${minutos}min`;
}

/** "2026-09-16T07:12:03" → "16/09, 07:12" */
export function formatarData(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Diferença de pace em segundos → texto pronto para o card comparativo. */
export function descreverDiferenca(segundos: number): string {
  const absoluto = Math.abs(Math.round(segundos));
  const texto = absoluto >= 60
    ? `${Math.floor(absoluto / 60)}min${String(absoluto % 60).padStart(2, "0")}`
    : `${absoluto}s`;

  if (absoluto === 0) return "mesmo pace da anterior";
  return segundos < 0
    ? `${texto} mais rápido por km que a anterior`
    : `${texto} mais lento por km que a anterior`;
}

/** 90 → "1min30" | 45 → "45s" */
export function formatarDescanso(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)}s`;
  const minutos = Math.floor(segundos / 60);
  const resto = Math.round(segundos % 60);
  return resto === 0 ? `${minutos}min` : `${minutos}min${String(resto).padStart(2, "0")}`;
}

/** Segundos entre dois instantes ISO, ou null se faltar algum. */
export function segundosEntre(antes: string | null, depois: string | null): number | null {
  if (!antes || !depois) return null;
  const diferenca = (new Date(depois).getTime() - new Date(antes).getTime()) / 1000;
  return diferenca >= 0 ? diferenca : null;
}

/** Duração de um treino em texto. Devolve null quando não vale a pena mostrar. */
export function descreverDuracaoTreino(minutos: number | null): string | null {
  if (minutos === null) return null;
  if (minutos < 1) return "menos de 1 minuto";
  return minutos === 1 ? "1 minuto no total" : `${minutos} minutos no total`;
}

/** 3300 → "55min" com horas quando passa de 60min. Usa no total de corrida. */
export function formatarTempoTotal(segundos: number): string {
  if (segundos === 0) return "--";
  return formatarDuracao(segundos);
}
