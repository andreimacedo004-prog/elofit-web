import { api } from "./client";
import type { Comparativo, Corrida } from "../tipos";

export function listarCorridas() {
  return api.get<Corrida[]>("/api/corridas");
}

export function registrarCorrida(dados: {
  distanciaKm: number;
  duracaoSegundos: number;
  splitsPorKm?: string;
}) {
  return api.post<Corrida>("/api/corridas", dados);
}

export function compararComAnterior(corridaId: number) {
  return api.get<Comparativo>(`/api/corridas/${corridaId}/comparativo`);
}
