import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { diaRelativo, resumoDaSemana, resumoDoPeriodo } from "../api/dashboard";
import { useAutenticacao } from "../auth/AuthContext";
import { useRequisicao } from "../ganchos/useRequisicao";
import { formatarDuracao, formatarTempoTotal } from "../tempo";
import type { ResumoDoPeriodo } from "../tipos";

type Janela = "semana" | "mes";

export default function Inicio() {
  const { usuario } = useAutenticacao();
  const [janela, setJanela] = useState<Janela>("semana");

  const buscar = useCallback(
    () =>
      janela === "semana"
        ? resumoDaSemana()
        : resumoDoPeriodo(diaRelativo(-29), diaRelativo(0)),
    [janela],
  );

  const resumo = useRequisicao(buscar, [janela]);

  return (
    <div className="pagina">
      <header className="pagina__topo">
        <h1 className="pagina__titulo">Oi, {usuario?.nome.split(" ")[0]}</h1>

        <div className="janelas" role="group" aria-label="Período">
          <button
            className={janela === "semana" ? "janela janela--ativa" : "janela"}
            onClick={() => setJanela("semana")}
          >
            Esta semana
          </button>
          <button
            className={janela === "mes" ? "janela janela--ativa" : "janela"}
            onClick={() => setJanela("mes")}
          >
            Últimos 30 dias
          </button>
        </div>
      </header>

      {resumo.carregando && <p className="vazio">Carregando...</p>}
      {resumo.erro && <p className="erro">{resumo.erro}</p>}
      {resumo.dados && <Resumo dados={resumo.dados} />}
    </div>
  );
}

function Resumo({ dados }: { dados: ResumoDoPeriodo }) {
  const semAtividade =
    dados.diasComTreino === 0 && dados.diasComCorrida === 0;

  if (semAtividade) {
    return (
      <section className="cartao">
        <p className="convite">Nada registrado neste período ainda.</p>
        <div className="convite__acoes">
          <Link className="botao botao--link" to="/treinos">
            Começar um treino
          </Link>
          <Link className="botao botao--link botao--contorno" to="/corridas">
            Registrar uma corrida
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <Balanco dados={dados} />

      <div className="paineis">
        <section className="painel">
          <h2 className="painel__titulo">Força</h2>
          <p className="painel__destaque numero">
            {dados.tempoTotalTreinoMinutos === 0
              ? "--"
              : formatarDuracao(dados.tempoTotalTreinoMinutos * 60)}
          </p>
          <dl className="detalhes">
            <div>
              <dt>Sessões</dt>
              <dd className="numero">{dados.treinosNaSemana}</dd>
            </div>
          </dl>
        </section>

        <section className="painel painel--corrida">
          <h2 className="painel__titulo">Corrida</h2>
          <p className="painel__destaque numero">
            {dados.distanciaTotalKm.toLocaleString("pt-BR")}
            <span className="painel__unidade"> km</span>
          </p>
          <dl className="detalhes">
            <div>
              <dt>Pace médio</dt>
              <dd className="numero">{dados.paceMedioFormatado}</dd>
            </div>
            <div>
              <dt>Tempo</dt>
              <dd className="numero">
                {formatarTempoTotal(dados.tempoTotalSegundos)}
              </dd>
            </div>
            <div>
              <dt>Sessões</dt>
              <dd className="numero">{dados.corridasNaSemana}</dd>
            </div>
          </dl>
        </section>
      </div>

      <p className="rodape-resumo">
        {dados.diasAtivos === 1
          ? "1 dia com atividade no período."
          : `${dados.diasAtivos} dias com atividade no período.`}
      </p>
    </>
  );
}

/**
 * A barra é o elemento central da tela: mostra de relance se o período pendeu
 * para a academia ou para a rua. É a única coisa que um app só de musculação
 * ou só de corrida não conseguiria mostrar.
 */
function Balanco({ dados }: { dados: ResumoDoPeriodo }) {
  // A barra compara dias, nao sessoes: dois treinos no mesmo dia nao
  // deveriam pesar o dobro de um.
  const total = dados.diasComTreino + dados.diasComCorrida;
  const fatiaForca = total === 0 ? 50 : (dados.diasComTreino / total) * 100;

  return (
    <section className="balanco">
      <div className="balanco__contagens">
        <span
          className={`contagem contagem--forca${
            dados.diasComTreino === 0 ? " contagem--zerada" : ""
          }`}
        >
          <span className="numero contagem__valor">{dados.diasComTreino}</span>
          <span className="contagem__rotulo">
            {dados.diasComTreino === 1 ? "dia de treino" : "dias de treino"}
          </span>
        </span>

        <span
          className={`contagem contagem--corrida${
            dados.diasComCorrida === 0 ? " contagem--zerada" : ""
          }`}
        >
          <span className="numero contagem__valor">
            {dados.diasComCorrida}
          </span>
          <span className="contagem__rotulo">
            {dados.diasComCorrida === 1 ? "dia de corrida" : "dias de corrida"}
          </span>
        </span>
      </div>

      <div
        className="barra"
        role="img"
        aria-label={`${dados.diasComTreino} dias de treino de força e ${dados.diasComCorrida} dias de corrida no período`}
      >
        <span className="barra__forca" style={{ width: `${fatiaForca}%` }} />
        <span
          className="barra__corrida"
          style={{ width: `${100 - fatiaForca}%` }}
        />
      </div>
    </section>
  );
}
