import { api } from "./client";
import type { Exercicio, Pagina, Serie, Treino } from "../tipos";

export function listarTreinos() {
  return api.get<Treino[]>("/api/treinos");
}

export function buscarTreino(id: number) {
  return api.get<Treino>(`/api/treinos/${id}`);
}

export function iniciarTreino(titulo: string) {
  return api.post<Treino>("/api/treinos", { titulo });
}

export function adicionarSerie(
  treinoId: number,
  dados: {
    exercicioId: number;
    numeroSerie: number;
    repeticoes: number;
    cargaKg?: number;
  },
) {
  return api.post<Serie>(`/api/treinos/${treinoId}/series`, dados);
}

/** Alterna entre feita e nao feita. */
export function alternarConclusao(treinoId: number, serieId: number) {
  return api.patch<Serie>(`/api/treinos/${treinoId}/series/${serieId}/concluir`);
}

export function editarSerie(
  treinoId: number,
  serieId: number,
  dados: { repeticoes: number; cargaKg?: number },
) {
  return api.put<Serie>(`/api/treinos/${treinoId}/series/${serieId}`, dados);
}

export function removerSerie(treinoId: number, serieId: number) {
  return api.delete(`/api/treinos/${treinoId}/series/${serieId}`);
}

export function finalizarTreino(treinoId: number) {
  return api.patch<Treino>(`/api/treinos/${treinoId}/finalizar`);
}

export function listarExercicios(grupoMuscular?: string) {
  const busca = grupoMuscular
    ? `?grupoMuscular=${encodeURIComponent(grupoMuscular)}&size=100`
    : "?size=200";
  return api.get<Pagina<Exercicio>>(`/api/exercicios${busca}`);
}

export function listarGruposMusculares() {
  return api.get<string[]>("/api/exercicios/grupos-musculares");
}
