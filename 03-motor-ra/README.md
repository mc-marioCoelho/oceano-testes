# Teste 03 · Motor de RA: MindAR × Zappar

Compara os dois motores de reconhecimento de imagem com **os mesmos alvos e o mesmo conteúdo** (um retângulo amarelo que deve cobrir o alvo). Serve para decidir o motor do site:
- o **MindAR** é gratuito, de código aberto, sem licença nem limite de views;
- o **Zappar** precisa de licença.

## Alvos (`alvos/`)

| Alvo | Imagem | MindAR | Zappar |
|---|---|---|---|
| Mosaico inteiro | `mosaico.jpg` (fotografia de Pavone, reduzida) | `mosaico.mind` | `mosaico.zpt` |
| Inscrição | `inscricao.jpg` (do Mário) | `inscricao.mind` | `inscricao.zpt` |
| Painel central | `painel-central.jpg` | `painel-central.mind` | `painel-central.zpt` |
| Vento Bóreas | `vento-boreas.jpg` (do Mário) | `vento-boreas.mind` | `vento-boreas.zpt` |
| Vento Zéfiro | `vento-zefiro.jpg` (do Mário) | `vento-zefiro.mind` | `vento-zefiro.zpt` |
| Painel central, perspetiva A *(7 out.)* | `painel-persp-a.jpg` (foto de 6 out., passadiço) | `painel-persp-a.mind` | `painel-persp-a.zpt` |
| Painel central, perspetiva B *(7 out.)* | `painel-persp-b.jpg` (foto de 6 out., passadiço) | `painel-persp-b.mind` | `painel-persp-b.zpt` |
| Inscrição, perspetiva *(7 out.)* | `inscricao-persp.jpg` (foto de 6 out., entrada) | `inscricao-persp.mind` | `inscricao-persp.zpt` |

- Para compilar alvos novos: `ferramentas/compilar-alvos.mjs` (instruções no topo do ficheiro).
- Os `.mind` foram compilados com o compilador do MindAR 1.2.5; os `.zpt` foram treinados com `@zappar/imagetraining` 4.3.2, a mesma ferramenta usada no Colab.
- A fotografia completa, em alta resolução, está no repositório privado `oceano-trabalho` (`media/fotografias/`).
- **Publicar ou imprimir as fotografias exige autorização.**

## Medições (no ecrã, por cima da câmara)
- **1.º reconhecimento:** segundos desde «Recomeçar» até reconhecer.
- **Perdas do alvo:** quantas vezes deixou de o reconhecer.
- **Tempo reconhecido:** % do tempo com o alvo reconhecido.
- **Tremor:** deslocação média do centro do alvo no ecrã, em px por imagem (com o telemóvel parado: quanto mais baixo, mais estável).

«Guardar resultado» junta tudo numa tabela na página inicial, que se pode copiar para uma folha de cálculo.

## Verificação no computador (2026-10-05)
Num navegador sem ecrã, com uma câmara simulada a mostrar a inscrição:
- **MindAR:** reconhecida em 0,4 s, 97–99 % do tempo, tremor de 0,2–0,3 px, retângulo alinhado;
- **Zappar:** a câmara funciona mas não reconheceu, provavelmente por limitação do navegador simulado (sem placa gráfica). **Tem de ser verificado no telemóvel.**

## Resultados
- [1.ª ronda na sala, 6 out. 2026](resultados/2026-10-06-sala.md) (Pixel 9a, só MindAR).

## Versão de 7 out.
Local obrigatório em cada medição, «Guardar» recomeça a medição, modelo verdadeiro do telemóvel, «Preparar para usar sem rede» (service worker, `sw.js`), «Partilhar resultados» e 3 alvos em perspetiva.
