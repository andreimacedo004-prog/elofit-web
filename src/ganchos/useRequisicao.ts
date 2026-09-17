import { useCallback, useEffect, useState } from "react";
import { ErroDaApi } from "../api/client";

interface Estado<T> {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
}

/**
 * Carrega algo da API e devolve os três estados que toda tela precisa:
 * carregando, erro e dados.
 *
 * Existe para que nenhuma tela repita o mesmo useEffect com try/catch.
 * `recarregar` serve para atualizar a lista depois de criar um item novo.
 */
export function useRequisicao<T>(
  buscar: () => Promise<T>,
  dependencias: unknown[] = [],
) {
  const [estado, setEstado] = useState<Estado<T>>({
    dados: null,
    carregando: true,
    erro: null,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buscarEstavel = useCallback(buscar, dependencias);

  const carregar = useCallback(async () => {
    setEstado((anterior) => ({ ...anterior, carregando: true, erro: null }));

    try {
      const dados = await buscarEstavel();
      setEstado({ dados, carregando: false, erro: null });
    } catch (problema) {
      setEstado({
        dados: null,
        carregando: false,
        erro:
          problema instanceof ErroDaApi
            ? problema.message
            : "Não foi possível carregar os dados.",
      });
    }
  }, [buscarEstavel]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { ...estado, recarregar: carregar };
}
