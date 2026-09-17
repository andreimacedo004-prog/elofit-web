/**
 * Espelho dos DTOs do backend.
 *
 * Manter isto em dia é o que faz o TypeScript avisar na hora da escrita
 * quando a API muda — em vez de quebrar em runtime na mão do usuário.
 */

export type TipoAtleta = "HIBRIDO" | "SO_FORCA" | "SO_CORRIDA";
export type TemaPreferencia = "CLARO" | "ESCURO";

/** UsuarioResponse.java */
export interface Usuario {
  id: number;
  email: string;
  nome: string;
  fotoUrl: string | null;
  bio: string | null;
  tipoAtleta: TipoAtleta;
  tema: TemaPreferencia;
}

/** AuthResponse.java */
export interface RespostaDeAutenticacao {
  token: string;
  expiraEmMs: number;
  usuario: Usuario;
}

/** DashboardResponse.java */
export interface ResumoDoPeriodo {
  inicioSemana: string;
  fimSemana: string;
  treinosNaSemana: number;
  diasComTreino: number;
  tempoTotalTreinoMinutos: number;
  volumeTotalKg: number;
  corridasNaSemana: number;
  diasComCorrida: number;
  distanciaTotalKm: number;
  tempoTotalSegundos: number;
  paceMedioSegundosPorKm: number | null;
  paceMedioFormatado: string;
  diasAtivos: number;
  razaoForcaCorrida: number;
  equilibrio: "equilibrado" | "mais forca" | "mais corrida" | "sem atividade";
}

/** RunningSessionResponse.java */
export interface Corrida {
  id: number;
  distanciaKm: number;
  duracaoSegundos: number;
  data: string;
  splitsPorKm: string | null;
  paceSegundosPorKm: number;
  paceFormatado: string;
}

/** Resposta de GET /api/corridas/{id}/comparativo */
export interface Comparativo {
  paceAtual: number;
  paceAtualFormatado: string;
  diferencaSegundosPorKm: number | null;
  temCorridaAnterior: boolean;
}

/** ExerciseResponse.java */
export interface Exercicio {
  id: number;
  exerciseDbId: string;
  nome: string;
  grupoMuscular: string | null;
  equipamento: string | null;
  nivel: string | null;
  urlVideo: string | null;
  urlImagem: string | null;
  instrucoes: string | null;
}

/** WorkoutSetResponse.java */
export interface Serie {
  id: number;
  exercicioId: number;
  exercicioNome: string;
  numeroSerie: number;
  repeticoes: number;
  cargaKg: number | null;
  concluida: boolean;
  /** Null nas séries gravadas antes da migration V3. */
  registradaEm: string | null;
}

/** WorkoutSessionResponse.java */
export interface Treino {
  id: number;
  titulo: string;
  data: string;
  duracaoMinutos: number | null;
  volumeTotalKg: number;
  series: Serie[];
}

/** Envelope de paginação do Spring Data. */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
