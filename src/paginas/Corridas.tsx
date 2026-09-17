import { useMemo, useState, type FormEvent } from "react";
import { ErroDaApi } from "../api/client";
import { listarCorridas, registrarCorrida } from "../api/corridas";
import { useRequisicao } from "../ganchos/useRequisicao";
import {
  descreverDiferenca,
  formatarData,
  formatarDuracao,
  formatarPace,
} from "../tempo";
import type { Corrida } from "../tipos";

export default function Corridas() {
  const historico = useRequisicao(listarCorridas);

  const [distancia, setDistancia] = useState("");
  const [minutos, setMinutos] = useState("");
  const [segundos, setSegundos] = useState("");
  const [splits, setSplits] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const distanciaKm = Number(distancia.replace(",", "."));
  const duracaoSegundos = (Number(minutos) || 0) * 60 + (Number(segundos) || 0);

  // Pace ao vivo enquanto a pessoa digita: é o número que ela veio ver,
  // então mostrar antes de salvar evita o ciclo "salva, confere, corrige".
  const pacePrevisto = useMemo(() => {
    if (!distanciaKm || distanciaKm <= 0 || duracaoSegundos <= 0) return null;
    return duracaoSegundos / distanciaKm;
  }, [distanciaKm, duracaoSegundos]);

  const podeEnviar = distanciaKm > 0 && duracaoSegundos > 0 && !enviando;

  function limpar() {
    setDistancia("");
    setMinutos("");
    setSegundos("");
    setSplits("");
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      await registrarCorrida({
        distanciaKm,
        duracaoSegundos,
        splitsPorKm: splits.trim() || undefined,
      });
      limpar();
      await historico.recarregar();
    } catch (problema) {
      setErro(
        problema instanceof ErroDaApi
          ? problema.message
          : "Não foi possível salvar a corrida.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina">
      <header className="pagina__topo">
        <h1 className="pagina__titulo">Corrida</h1>
        <p className="pagina__apoio">
          Distância e tempo bastam. O pace sai do cálculo.
        </p>
      </header>

      <section className="cartao">
        <form onSubmit={aoEnviar} noValidate>
          {erro && (
            <p className="erro" role="alert">
              {erro}
            </p>
          )}

          <div className="grade-campos">
            <label className="campo">
              <span className="campo__rotulo">Distância (km)</span>
              <input
                className="campo__entrada"
                type="text"
                inputMode="decimal"
                placeholder="10"
                value={distancia}
                onChange={(e) => setDistancia(e.target.value)}
              />
            </label>

            <label className="campo">
              <span className="campo__rotulo">Minutos</span>
              <input
                className="campo__entrada"
                type="text"
                inputMode="numeric"
                placeholder="55"
                value={minutos}
                onChange={(e) => setMinutos(e.target.value)}
              />
            </label>

            <label className="campo">
              <span className="campo__rotulo">Segundos</span>
              <input
                className="campo__entrada"
                type="text"
                inputMode="numeric"
                placeholder="30"
                value={segundos}
                onChange={(e) => setSegundos(e.target.value)}
              />
            </label>
          </div>

          <label className="campo">
            <span className="campo__rotulo">Splits por km</span>
            <input
              className="campo__entrada"
              type="text"
              placeholder="5:52, 5:41, 5:32"
              value={splits}
              onChange={(e) => setSplits(e.target.value)}
            />
            <span className="campo__ajuda">Opcional.</span>
          </label>

          <div className="previa">
            <span className="previa__rotulo">Pace</span>
            <span className="numero previa__valor">
              {formatarPace(pacePrevisto)}
            </span>
          </div>

          <button className="botao" type="submit" disabled={!podeEnviar}>
            {enviando ? "Salvando..." : "Salvar corrida"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="secao__titulo">Suas corridas</h2>

        {historico.carregando && <p className="vazio">Carregando...</p>}

        {historico.erro && (
          <p className="erro" role="alert">
            {historico.erro}
          </p>
        )}

        {historico.dados?.length === 0 && (
          <p className="vazio">
            Nenhuma corrida ainda. A primeira que você salvar aparece aqui.
          </p>
        )}

        <ul className="lista">
          {historico.dados?.map((corrida, indice) => (
            <ItemDeCorrida
              key={corrida.id}
              corrida={corrida}
              anterior={historico.dados?.[indice + 1]}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * O histórico já vem ordenado do mais recente para o mais antigo, então a
 * corrida anterior é o próximo item da lista. Comparamos aqui em vez de
 * chamar /comparativo para cada linha — seriam N requisições para dados
 * que já estão na mão.
 */
function ItemDeCorrida({
  corrida,
  anterior,
}: {
  corrida: Corrida;
  anterior?: Corrida;
}) {
  const diferenca = anterior
    ? corrida.paceSegundosPorKm - anterior.paceSegundosPorKm
    : null;

  return (
    <li className="linha">
      <div className="linha__principal">
        <span className="numero linha__destaque">
          {corrida.distanciaKm.toLocaleString("pt-BR")} km
        </span>
        <span className="linha__meta">
          {formatarDuracao(corrida.duracaoSegundos)}
        </span>
        <span className="numero linha__pace">{corrida.paceFormatado}</span>
      </div>

      <div className="linha__rodape">
        <span>{formatarData(corrida.data)}</span>
        {diferenca !== null && (
          <span
            className={`linha__comparativo ${diferenca <= 0 ? "ganho" : "perda"}`}
          >
            {descreverDiferenca(diferenca)}
          </span>
        )}
      </div>

      {corrida.splitsPorKm && (
        <p className="linha__splits">{corrida.splitsPorKm}</p>
      )}
    </li>
  );
}
