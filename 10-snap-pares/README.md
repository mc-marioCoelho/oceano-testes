# Teste 10 · Snap e pares (P2)

Cópia do [teste 09](../09-alvo-endireitado/) (que fica igual), para **reduzir o erro de marcação dos pontos** e preparar o teste da altura no P2.

**O que muda em relação ao 09:**

1. **Pontos do Mário (lista curta):** o mapa mostra os pontos marcados no Illustrator (camada «Pontos P2», `mapa/pontos-mario.json`) como M1, M2…, e escolhe-os um de cada vez; «Não se vê: saltar» passa ao seguinte. Os ~160 candidatos continuam disponíveis («Mostrar também os outros candidatos»).
2. **Mira e lupa:** pousa-se o dedo por baixo do ponto e arrasta-se. A mira fica 70 px acima do dedo e aparece uma lupa (5×, feita da fotografia original). **Setas de 1 píxel** com uma lupa fixa.
3. **Corrigir um par:** toca-se no par na lista «Pares» para o mover (mira ou setas), apagar ou largar. A calibração fica guardada com os pares e volta a abrir-se para corrigir, sem marcar tudo de novo.
4. **«Encaixar nos traços» (snap, `encaixe.js`):** à volta de cada toque, a fotografia é endireitada (vista de cima, à escala do mapa) e posta por baixo de um decalque das linhas do mapa. Desliza-se o decalque até assentar nos traços escuros:
   - **cruzamento ✓:** o ponto vai para o cruzamento;
   - **linha ↔:** linha sem cruzamento à volta, o ponto só desliza para o lado;
   - **duvidoso ?:** fica onde estava e sai do cálculo (fraco, ambíguo, ao fundo ou destoa dos outros).

   Depois, com a perspetiva melhorada, **os outros cruzamentos do mapa que caem na fotografia encaixam sozinhos** (ciano). Mostra o erro antes → depois (validação cruzada: um ponto de fora de cada vez) e a tabela por par. «Aceitar e colocar o desenho» grava.
5. **Teste da altura:** na RA, o botão «Posição» guarda a altura do telemóvel (1,0 / 1,25 / 1,5 m) e o passo (no ponto, 1 ou 2 passos para cada lado). Segue com cada resultado e aparece na faixa de cada «Fotografar a RA».
6. **Lente a 1×:** a página lê a distância focal da fotografia (EXIF) e avisa se não estiver a 1× (no Pixel 9a: 4,53 mm = 1×; 1,8 mm = 0,5×). «Criar alvo endireitado» continua igual e pede confirmação se a fotografia não for a 1×.

**Verificado no PC (16 out.):**
- **Fotografias artificiais de perspetiva conhecida.** São feitas a partir da fotografia vertical de Pavone, sobre a qual o mapa foi desenhado, com a perspetiva do P2 de 15 out. Os toques têm erro de dedo simulado, com 20 tentativas por linha. Erro **verdadeiro** perto do rosto, antes → depois do snap:

  | Dedo (σ) | Pontos M (7) | 12 pares de 15 out. |
  |---|---|---|
  | ≈ 1 cm | 1,7 → **0,6 cm** | 1,5 → **0,6 cm** |
  | ≈ 2 cm | 3,4 → **0,8 cm** | 3,0 → **1,0 cm** |
  | ≈ 4 cm | 6,2 → 3,1 cm | 4,8 → 1,7 cm |

- **Fotografia real de 15 out.** (12 pares a dedo; foto a 0,5×): validação cruzada 4,1 → **1,7 cm**, com 21 cruzamentos juntados pelo snap e 6 s no PC. Na fotografia endireitada, a malha do mapa passa a assentar nos traços escuros do painel de baixo.
- **No navegador:** abrir a calibração anterior, mover um par com a mira e as setas, marcar M1–M8 (M6 saltado, por estar fora da fotografia), snap, aceitar e gravar, e o botão «Posição» no MindAR. A página cabe a 375 px de largura.
- **Por confirmar no telemóvel:** o tempo do snap (no PC são 6 s; no Pixel deve andar pelos 10 a 30 s) e a mira com o dedo a sério.

**Observação da sala:** dentro da lacuna central, as linhas dos círculos e do painel estão pintadas na argamassa pelo restauro. Por isso, os pontos «onde a linha entra na lacuna» não são cruzamentos: o snap só os acerta de lado.
