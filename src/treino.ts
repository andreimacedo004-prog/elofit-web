import { segundosEntre } from "./tempo";
import type { Serie } from "./tipos";

export interface GrupoDeSeries {
  exercicioId: number;
  exercicioNome: string;
  series: Serie[];
  /** Média do intervalo entre séries consecutivas deste exercício. */
  descansoMedioSegundos: number | null;
}

/**
 * Agrupa as séries por exercício preservando a ordem em que apareceram
 * no treino — é assim que a pessoa lembra do que fez, exercício a exercício,
 * e não como uma lista solta de séries.
 */
export function agruparPorExercicio(series: Serie[]): GrupoDeSeries[] {
  const grupos: GrupoDeSeries[] = [];
  const indicePorExercicio = new Map<number, number>();

  for (const serie of series) {
    const existente = indicePorExercicio.get(serie.exercicioId);

    if (existente === undefined) {
      indicePorExercicio.set(serie.exercicioId, grupos.length);
      grupos.push({
        exercicioId: serie.exercicioId,
        exercicioNome: serie.exercicioNome,
        series: [serie],
        descansoMedioSegundos: null,
      });
    } else {
      grupos[existente].series.push(serie);
    }
  }

  for (const grupo of grupos) {
    grupo.descansoMedioSegundos = calcularDescansoMedio(grupo.series);
  }

  return grupos;
}

function calcularDescansoMedio(series: Serie[]): number | null {
  const intervalos: number[] = [];

  for (let i = 1; i < series.length; i++) {
    const intervalo = segundosEntre(
      series[i - 1].registradaEm,
      series[i].registradaEm,
    );
    // Acima de 15 minutos não foi descanso: a pessoa parou, atendeu alguém,
    // foi fazer outro exercício e voltou. Incluir distorceria a média.
    if (intervalo !== null && intervalo <= 900) intervalos.push(intervalo);
  }

  if (intervalos.length === 0) return null;
  return intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
}

/** "10 × 60 kg" ou "12" quando é peso do corpo. */
export function descreverSerie(serie: Serie): string {
  return serie.cargaKg !== null
    ? `${serie.repeticoes} × ${serie.cargaKg} kg`
    : `${serie.repeticoes}`;
}
