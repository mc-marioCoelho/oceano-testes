# Teste 09 · Alvo endireitado (P2)

Continuação do [teste 08](../08-calibracao-mapa/). Na sala (12 out.), com o alvo do P2 calibrado, a barba ficou na lacuna junto aos pontos de controlo, mas **a geometria verde levantava-se do chão** longe deles: o motor trata a fotografia oblíqua como se fosse o chão, e o plano que calcula está inclinado em relação ao chão verdadeiro.

**O que este teste faz:** depois de calibrar um alvo (pontos de controlo), **«Criar alvo endireitado»** põe a fotografia de frente e à escala do mapa (cada píxel é um ponto do mapa; a cor vem do recorte pela homografia da calibração), cria com ela um alvo novo (MindAR e, se ligado, Zappar) e deixa-o já calibrado, com a barba, os ventos e a geometria. Com este alvo, o plano que o motor calcula deve ser **o próprio chão**.

**Pergunta:** o MindAR e o Zappar reconhecem o alvo endireitado a partir do P2? Se sim, a geometria verde e a barba ficam assentes no mosaico em toda a zona?

**Risco:** os pormenores do alvo endireitado ficam esticados em relação ao que a câmara vê de lado; a fotografia de Pavone (vista de cima) não era reconhecida. Este alvo vem da fotografia tirada no P2, o que pode ajudar. Só a sala responde.

Só o P2. «Trazer os alvos dos testes 08 e 07» traz os alvos com a calibração.

**Verificado no PC** (fotografia artificial de perspetiva conhecida): a imagem endireitada coincide com a vista de cima verdadeira (correlação 0,95; deslocada 4 cm, 0,41). A criação do alvo MindAR usa o mesmo código do passo 2 (não terminou no PC por o painel do navegador estar escondido; por confirmar no telemóvel).
