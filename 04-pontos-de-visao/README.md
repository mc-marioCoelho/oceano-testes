# Teste 04 · Pontos de visão e alvos em perspetiva

Continuação do [teste 03](../03-motor-ra/) (MindAR × Zappar), depois da 1.ª ronda na sala ([resultados de 6 out.](../03-motor-ra/resultados/2026-10-06-sala.md)).
Mesmas medições (tempo até reconhecer, perdas, % reconhecido, tremor), com estas mudanças:

- **Pontos de visão P1–P10** (ilustração do Mário, 7 out. 2026): antes de medir escolhe-se o ponto onde se está, e o alvo sugerido para esse ponto fica escolhido. O ponto fica gravado em cada resultado.
- **Alvos em perspetiva**, recortados das fotografias do Mário tiradas desses pontos (6 out.), ao lado dos alvos do teste 03.
- **Uso sem rede:** «Preparar para usar sem rede» descarrega tudo para o telemóvel (service worker, `sw.js`). Necessário na sala e no Samsung sem cartão.
- «Guardar» recomeça a medição (sem linhas duplicadas); modelo verdadeiro do telemóvel; botão «Partilhar resultados».
- Os resultados ficam guardados à parte dos do teste 03, no mesmo telemóvel.

## Pontos de visão

| Ponto | O que se vê | Alvo sugerido |
|---|---|---|
| P1 (esquerda · centro · direita) | o mosaico inteiro, a partir da entrada | inscrição em perspetiva |
| P2 · P10 | o Oceano, na diagonal | medalhão em perspetiva A · B |
| P3 · P9 | o Oceano, de frente | painel central |
| P4 · P8 | Bóreas · Zéfiro | vento Bóreas · Zéfiro |
| P5 · P7 | a lacuna do tapete do fundo | tapete em perspetiva |
| P6 | o mosaico visto do fundo (sem RA prevista) | tapete em perspetiva |

O esquema `pontos-de-visao.svg` não usa a fotografia de Pavone (a autorização para este uso está pedida).

## Alvos novos (`alvos/`)

| Alvo | Fotografia de origem (6 out.) |
|---|---|
| `inscricao-persp` | `PXL_20261006_084254174` (P1) |
| `painel-persp-a` | `PXL_20261006_084318796` (P2) |
| `painel-persp-b` | `PXL_20261006_084410985` (P10) |
| `tapete-persp` | `PXL_20261006_084338217` (P5) |

Compilados para MindAR (`.mind`, 1.2.5) e Zappar (`.zpt`, imagetraining 4.3.2) com `ferramentas/compilar-alvos.mjs`.

**Atenção:** um alvo em perspetiva mede se o telemóvel encontra o mosaico a partir daquele ponto. O motor «pensa» que vê uma imagem plana de frente, por isso o conteúdo ainda não fica alinhado com o chão real (isso faz-se depois, retificando as fotografias dos pontos que funcionarem).
