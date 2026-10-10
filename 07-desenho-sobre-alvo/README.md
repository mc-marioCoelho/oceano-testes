# Teste 07 · Desenho sobre o alvo

Continuação do [teste 06](../06-alvo-no-local-v2/), que fica como estava. A 10 out. o teste 06 mostrou que as **lacunas servem de âncora** (com o MindAR: Euro 95 %, P7 100 %). Este teste responde à pergunta seguinte: **um desenho feito sobre o recorte fica em cima da lacuna verdadeira, parado e legível?** É o primeiro passo para reconstituir no sítio o tapete do fundo (P5, P7), os ventos perdidos (Noto, Euro) e as letras em falta da inscrição.

## Como funciona

O desenho é uma imagem **PNG transparente com as mesmas proporções do recorte** do alvo. Na RA é colado ao alvo, com o tamanho exato: o que se pinta em cima da lacuna no recorte fica em cima da lacuna verdadeira.

1. **Trazer os alvos dos testes 06 e 05** (passo 3): os alvos de P7 e do Euro de 10 out. vêm com eles, sem voltar a fotografar. Também se podem criar alvos novos (passo 2), como no teste 06.
2. **Desenhar sobre este alvo**, de duas maneiras, que se podem combinar:
   - **no telemóvel, com o dedo:** pincel; **tesselas** (quadradinhos encostados ao longo do traço); **mancha** (contorna-se uma zona e ela fica pintada); borracha; **conta-gotas** (tira a cor do mosaico naquele ponto); paleta com as cores mais frequentes do próprio recorte; tamanho, opacidade, transparência do recorte por baixo; zoom 1×/2×/4× com a ferramenta «Mover» para deslizar; desfazer (15 passos). Dois dedos não riscam.
   - **no Photoshop:** «Descarregar o recorte» (o nome do ficheiro diz o tamanho), desenhar numa camada nova, exportar só essa camada em PNG com transparência (mesmo tamanho, ou maior com as mesmas proporções) e «Carregar PNG» no telemóvel. Se o desenho estava vazio, guarda-se o PNG original, na resolução do Photoshop.
3. **Guardar desenho** e testar com MindAR ou Zappar. Na RA:
   - o desenho aparece no lugar do cubo (os pontos marcados, se houver, continuam a aparecer);
   - **«Desenho»** muda a opacidade: 100 → 60 → 30 % → escondido (para comparar com o mosaico verdadeiro);
   - **«Moldura»** mostra ou esconde o contorno amarelo (com desenho, começa escondido);
   - o estado do desenho entra nos resultados (coluna «Desenho na RA») e na faixa de «Fotografar a RA».

## Mudou também

- **Zappar:** o desenho e os objetos escondem-se quando o alvo se perde (no teste 06 ficavam à vista).
- A nota de cada resultado pergunta pelo que interessa aqui: o desenho ficou em cima da lacuna? Quanto fugiu e para que lado? Ficou parado? Lê-se bem?
- Envio para o GitHub (`teste-07/`): o desenho segue com o alvo, em `alvos/<id>/desenho-<data>-<hora>.png` (se for alterado, segue outra vez com a nova hora). A partilha de fotografias também o leva.
- Guarda alvos e resultados à parte do teste 06 (`oceano-teste07`).

## Estabilização do MindAR (acrescentado a 10 out., à noite)

O Mário notou que o desenho «dança» um bocadinho sobre o alvo. O MindAR tem um filtro (*One Euro*) que alisa a posição do alvo de imagem para imagem: com mais filtro, o desenho treme menos com o telemóvel parado, mas atrasa-se quando o telemóvel se mexe. O botão **«Estabilizar»** (só no MindAR) passa por três níveis e recarrega a página:

| Nível | filterMinCF | filterBeta | Esperado |
|---|---|---|---|
| normal | 0,001 | 1000 | valores de origem (os dos testes 03–06) |
| média | 0,0001 | 10 | menos tremor, algum atraso |
| forte | 0,0001 | 0,001 | o mínimo de tremor, mais atraso ao mexer |

O nível entra nos resultados (coluna «Estabilização») e na faixa de «Fotografar a RA». **Como comparar:** no mesmo ponto e com o mesmo alvo, para cada nível: «Recomeçar», segurar parado e «Medir tremor (5 s)», depois mexer devagar e reparar se o desenho se atrasa; «Guardar resultado» com uma nota. Comparar também com o Zappar, que a 10 out. tremia cerca de 3× menos.

Porque é que a lacuna treme mais: o motor segue os pormenores da parte conservada (a cara, as linhas); a lacuna é argamassa lisa, longe desses pormenores, e um erro pequeno na estimativa da inclinação do alvo cresce com a distância. Um recorte que inclua pormenores **dos dois lados** da lacuna (cercadura, círculo do medalhão) deve ajudar.

## O que observar na sala

- **P7** (melhor caso: 100 % nos dois motores) e **lacuna do Euro** (só MindAR).
- Alinhamento: o desenho fica sobre a lacuna ou foge (quanto, para que lado, se muda com o ângulo)?
- Estabilidade: parado ou a tremer, sobretudo perto dos bordos do recorte?
- Leitura: as cores e o traço lêem-se com a luz da sala? Que opacidade fica melhor?
- Uma fotografia da RA por situação (100 % e 30 %, por exemplo).

## Limites

Os do teste 06: medir no sítio da fotografia é o melhor caso; faltam os pontos vizinhos e outros telemóveis. O desenho feito no telemóvel tem a resolução do recorte (até 1024 px no lado maior); para mais pormenor, o Photoshop.
