import { api } from "./client";
import type { ResumoDoPeriodo } from "../tipos";

export function resumoDaSemana() {
  return api.get<ResumoDoPeriodo>("/api/dashboard/semana");
}

/** Datas no formato aaaa-mm-dd, que é o que o LocalDate do Java espera. */
export function resumoDoPeriodo(inicio: string, fim: string) {
  return api.get<ResumoDoPeriodo>(
    `/api/dashboard/periodo?inicio=${inicio}&fim=${fim}`,
  );
}

/** Data de hoje deslocada em N dias, em aaaa-mm-dd no fuso local. */
export function diaRelativo(deslocamento: number): string {
  const data = new Date();
  data.setDate(data.getDate() + deslocamento);

  // toISOString converteria para UTC e, de madrugada no Brasil, viraria
  // o dia seguinte. Montamos a string manualmente para ficar no fuso local.
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}
