import { api } from "./client";
import type { Rotina, Treino } from "../tipos";

/** Payload de POST/PUT /api/rotinas — espelha CriarRotinaRequest/ItemRotinaRequest.java */
export interface ItemRotinaEntrada {
  exercicioId: number;
  seriesAlvo?: number;
  repeticoesAlvo?: number;
  cargaSugeridaKg?: number;
}

export function listarRotinas() {
  return api.get<Rotina[]>("/api/rotinas");
}

export function buscarRotina(id: number) {
  return api.get<Rotina>(`/api/rotinas/${id}`);
}

export function criarRotina(
  nome: string,
  descricao: string | undefined,
  exercicios: ItemRotinaEntrada[],
) {
  return api.post<Rotina>("/api/rotinas", { nome, descricao, exercicios });
}

export function atualizarRotina(
  id: number,
  nome: string,
  descricao: string | undefined,
  exercicios: ItemRotinaEntrada[],
) {
  return api.put<Rotina>(`/api/rotinas/${id}`, { nome, descricao, exercicios });
}

/**
 * Remove a rotina: o backend exclui de vez se ela nunca foi usada em nenhum
 * treino, ou so arquiva (some da lista, historico intacto) se ja tem sessoes
 * vinculadas a ela.
 */
export function removerRotina(id: number) {
  return api.delete(`/api/rotinas/${id}`);
}

/** Cria uma sessao de treino ja pre-preenchida a partir da rotina. */
export function iniciarSessaoDeRotina(id: number) {
  return api.post<Treino>(`/api/rotinas/${id}/iniciar`);
}
