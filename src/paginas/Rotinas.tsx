import { useMemo, useState, type FormEvent } from "react";
import { ErroDaApi } from "../api/client";
import {
  atualizarRotina,
  criarRotina,
  listarRotinas,
  removerRotina,
  type ItemRotinaEntrada,
} from "../api/rotinas";
import { listarExercicios } from "../api/treinos";
import { useRequisicao } from "../ganchos/useRequisicao";
import type { Rotina } from "../tipos";

export default function Rotinas() {
  const rotinas = useRequisicao(listarRotinas);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  return (
    <div className="pagina">
      <header className="pagina__topo">
        <h1 className="pagina__titulo">Rotinas</h1>
        <p className="pagina__apoio">
          Monte um treino com os exercícios e pesos que você sempre usa —
          depois é só iniciar a sessão já pré-preenchida.
        </p>
      </header>

      {rotinas.carregando && <p className="vazio">Carregando...</p>}
      {rotinas.erro && <p className="erro">{rotinas.erro}</p>}

      {!criando && editandoId === null && (
        <button className="botao" onClick={() => setCriando(true)}>
          Nova rotina
        </button>
      )}

      {criando && (
        <ul className="lista">
          <FormularioRotina
            aoSalvar={async () => {
              setCriando(false);
              await rotinas.recarregar();
            }}
            aoCancelar={() => setCriando(false)}
          />
        </ul>
      )}

      {rotinas.dados?.length === 0 && !criando && (
        <p className="vazio">Nenhuma rotina criada ainda.</p>
      )}

      <ul className="lista">
        {rotinas.dados?.map((rotina) =>
            editandoId === rotina.id ? (
              <FormularioRotina
                key={rotina.id}
                rotina={rotina}
                aoSalvar={async () => {
                  setEditandoId(null);
                  await rotinas.recarregar();
                }}
                aoCancelar={() => setEditandoId(null)}
              />
            ) : (
              <CartaoRotina
                key={rotina.id}
                rotina={rotina}
                aoEditar={() => setEditandoId(rotina.id)}
                aoRemover={async () => {
                  await removerRotina(rotina.id);
                  await rotinas.recarregar();
                }}
              />
            ),
          )}
      </ul>
    </div>
  );
}

/* ---------------- Cartão (visualizar) ---------------- */

function CartaoRotina({
  rotina,
  aoEditar,
  aoRemover,
}: {
  rotina: Rotina;
  aoEditar: () => void;
  aoRemover: () => Promise<void>;
}) {
  const [removendo, setRemovendo] = useState(false);
  const rotuloAcao = rotina.temHistorico ? "Arquivar" : "Excluir";

  return (
    <li className="linha cartao">
      <div className="sessao__topo">
        <div>
          <h2 className="sessao__titulo">{rotina.nome}</h2>
          {rotina.descricao && (
            <p className="sessao__meta">{rotina.descricao}</p>
          )}
        </div>
      </div>

      {rotina.exercicios.length === 0 ? (
        <p className="vazio">Nenhum exercício nesta rotina.</p>
      ) : (
        <ul className="exercicios">
          {rotina.exercicios.map((item) => (
            <li className="exercicio" key={item.id}>
              <span className="exercicio__nome">{item.exercicioNome}</span>
              <span className="exercicio__series">
                {item.seriesAlvo ?? "?"} × {item.repeticoesAlvo ?? "?"}
                {item.cargaSugeridaKg !== null &&
                  ` · ${item.cargaSugeridaKg} kg`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="serie__acoes">
        <button className="acao acao--primaria" onClick={aoEditar}>
          Editar
        </button>
        <button
          className="acao acao--remover"
          disabled={removendo}
          onClick={async () => {
            const mensagem = rotina.temHistorico
              ? `Arquivar "${rotina.nome}"? Ela some da lista, mas o histórico dos treinos já feitos com ela continua intacto.`
              : `Excluir "${rotina.nome}" de vez? Essa rotina ainda não foi usada em nenhum treino, então não há histórico a perder — mas não dá pra desfazer.`;
            if (!window.confirm(mensagem)) return;
            setRemovendo(true);
            await aoRemover();
          }}
        >
          {removendo ? `${rotuloAcao === "Excluir" ? "Excluindo" : "Arquivando"}...` : rotuloAcao}
        </button>
      </div>
    </li>
  );
}

/* ---------------- Formulário (criar e editar) ---------------- */

interface LinhaItem {
  chave: string;
  exercicioId: string;
  seriesAlvo: string;
  repeticoesAlvo: string;
  cargaSugeridaKg: string;
}

function linhaVazia(): LinhaItem {
  return {
    chave: crypto.randomUUID(),
    exercicioId: "",
    seriesAlvo: "3",
    repeticoesAlvo: "10",
    cargaSugeridaKg: "",
  };
}

function FormularioRotina({
  rotina,
  aoSalvar,
  aoCancelar,
}: {
  rotina?: Rotina;
  aoSalvar: () => Promise<void>;
  aoCancelar: () => void;
}) {
  const catalogo = useRequisicao(() => listarExercicios());

  const [nome, setNome] = useState(rotina?.nome ?? "");
  const [descricao, setDescricao] = useState(rotina?.descricao ?? "");
  const [itens, setItens] = useState<LinhaItem[]>(() =>
    rotina && rotina.exercicios.length > 0
      ? rotina.exercicios.map((item) => ({
          chave: String(item.id),
          exercicioId: String(item.exercicioId),
          seriesAlvo: item.seriesAlvo !== null ? String(item.seriesAlvo) : "",
          repeticoesAlvo:
            item.repeticoesAlvo !== null ? String(item.repeticoesAlvo) : "",
          cargaSugeridaKg:
            item.cargaSugeridaKg !== null ? String(item.cargaSugeridaKg) : "",
        }))
      : [linhaVazia()],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Agrupa por grupo muscular, mesmo padrão da tela de Treino.
  const porGrupo = useMemo(() => {
    const grupos: Record<string, { id: number; nome: string }[]> = {};
    for (const exercicio of catalogo.dados?.content ?? []) {
      const grupo = exercicio.grupoMuscular ?? "Outros";
      (grupos[grupo] ??= []).push({ id: exercicio.id, nome: exercicio.nome });
    }
    return grupos;
  }, [catalogo.dados]);

  function atualizarItem(chave: string, campo: keyof LinhaItem, valor: string) {
    setItens((anteriores) =>
      anteriores.map((item) =>
        item.chave === chave ? { ...item, [campo]: valor } : item,
      ),
    );
  }

  function removerItem(chave: string) {
    setItens((anteriores) => anteriores.filter((item) => item.chave !== chave));
  }

  function adicionarItem() {
    setItens((anteriores) => [...anteriores, linhaVazia()]);
  }

  const podeSalvar =
    nome.trim().length > 0 &&
    itens.length > 0 &&
    itens.every((item) => item.exercicioId !== "") &&
    !enviando;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const exerciciosEntrada: ItemRotinaEntrada[] = itens.map((item) => ({
      exercicioId: Number(item.exercicioId),
      seriesAlvo: item.seriesAlvo.trim() ? Number(item.seriesAlvo) : undefined,
      repeticoesAlvo: item.repeticoesAlvo.trim()
        ? Number(item.repeticoesAlvo)
        : undefined,
      cargaSugeridaKg: item.cargaSugeridaKg.trim()
        ? Number(item.cargaSugeridaKg.replace(",", "."))
        : undefined,
    }));

    try {
      if (rotina) {
        await atualizarRotina(
          rotina.id,
          nome.trim(),
          descricao.trim() || undefined,
          exerciciosEntrada,
        );
      } else {
        await criarRotina(
          nome.trim(),
          descricao.trim() || undefined,
          exerciciosEntrada,
        );
      }
      await aoSalvar();
    } catch (problema) {
      setErro(
        problema instanceof ErroDaApi
          ? problema.message
          : "Não foi possível salvar a rotina.",
      );
      setEnviando(false);
    }
  }

  return (
    <li className="linha cartao cartao--ativo">
      <form onSubmit={aoEnviar} noValidate>
        {erro && <p className="erro">{erro}</p>}
        {catalogo.erro && <p className="erro">{catalogo.erro}</p>}

        <label className="campo">
          <span className="campo__rotulo">Nome</span>
          <input
            className="campo__entrada"
            type="text"
            placeholder="Treino A"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>

        <label className="campo">
          <span className="campo__rotulo">Descrição</span>
          <input
            className="campo__entrada"
            type="text"
            placeholder="Peito e tríceps"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </label>

        <ul className="series">
          {itens.map((item) => (
            <li className="serie serie--editando" key={item.chave}>
              <div className="serie__campos">
                <label className="serie__campo">
                  <span>Exercício</span>
                  <select
                    className="campo__entrada"
                    value={item.exercicioId}
                    onChange={(e) =>
                      atualizarItem(item.chave, "exercicioId", e.target.value)
                    }
                    disabled={catalogo.carregando}
                  >
                    <option value="">
                      {catalogo.carregando ? "Carregando..." : "Escolha"}
                    </option>
                    {Object.entries(porGrupo).map(([grupo, exercicios]) => (
                      <optgroup label={grupo} key={grupo}>
                        {exercicios.map((exercicio) => (
                          <option value={exercicio.id} key={exercicio.id}>
                            {exercicio.nome}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>

                <label className="serie__campo">
                  <span>Séries</span>
                  <input
                    className="campo__entrada"
                    type="text"
                    inputMode="numeric"
                    value={item.seriesAlvo}
                    onChange={(e) =>
                      atualizarItem(item.chave, "seriesAlvo", e.target.value)
                    }
                  />
                </label>

                <label className="serie__campo">
                  <span>Reps</span>
                  <input
                    className="campo__entrada"
                    type="text"
                    inputMode="numeric"
                    value={item.repeticoesAlvo}
                    onChange={(e) =>
                      atualizarItem(item.chave, "repeticoesAlvo", e.target.value)
                    }
                  />
                </label>

                <label className="serie__campo">
                  <span>Carga (kg)</span>
                  <input
                    className="campo__entrada"
                    type="text"
                    inputMode="decimal"
                    value={item.cargaSugeridaKg}
                    onChange={(e) =>
                      atualizarItem(item.chave, "cargaSugeridaKg", e.target.value)
                    }
                  />
                </label>
              </div>

              <div className="serie__acoes">
                <button
                  type="button"
                  className="acao acao--remover"
                  onClick={() => removerItem(item.chave)}
                  disabled={itens.length === 1}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="botao botao--contorno"
          onClick={adicionarItem}
        >
          Adicionar exercício
        </button>

        <div className="serie__acoes">
          <button
            className="acao acao--primaria"
            type="submit"
            disabled={!podeSalvar}
          >
            {enviando ? "Salvando..." : "Salvar rotina"}
          </button>
          <button
            type="button"
            className="acao"
            onClick={aoCancelar}
            disabled={enviando}
          >
            Cancelar
          </button>
        </div>
      </form>
    </li>
  );
}
