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

export function concluirSerie(treinoId: number, serieId: number) {
  return api.patch<Serie>(`/api/treinos/${treinoId}/series/${serieId}/concluir`);
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
