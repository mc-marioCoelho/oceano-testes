# Teste 05 · Alvo criado no local

Continuação do [teste 04](../04-pontos-de-visao/) ([resultados de 8 out.](../04-pontos-de-visao/resultados/2026-10-08-sala.md)). O teste 04 fica como estava.

**Ideia do Mário (8 out. 2026):** em vez de usar alvos feitos a partir de fotografias de outro dia, a página tira a fotografia no próprio ponto, transforma-a em alvo no telemóvel e testa-a logo a seguir.

## Como funciona

1. Escolhe-se o ponto (P1–P10, parede).
2. **Tira-se uma fotografia** com a câmara do telemóvel e **recorta-se** só o mosaico (arrastando o dedo), sem passadiço nem corrimão.
3. **«Criar alvo»** faz, a partir da **mesma imagem**, os dois alvos: MindAR (`.mind`, compilador 1.2.5) e Zappar (`.zpt`, imagetraining 4.3.2). A imagem é reduzida a 1024 px no lado maior. Fica registado quanto tempo cada motor levou.
4. O alvo fica guardado **neste telemóvel** (IndexedDB) e testa-se com MindAR ou Zappar, com as mesmas medições do teste 04.
5. **«Enviar ficheiros do alvo»** partilha a fotografia e os dois alvos, para se juntarem ao site.
6. Os resultados registam onde o alvo foi **fotografado** e onde foi **testado**, para se saber se um alvo serve também nos pontos vizinhos.

## Verificado no computador (8 out.)

Com a fotografia do alvo `tapete-persp` do teste 04, recortada: MindAR em 10,6 s e Zappar em 22,1 s. Os alvos são iguais em tamanho aos que se fazem no PC com `../04-pontos-de-visao/ferramentas/compilar-alvos.mjs`. A página MindAR lê o alvo guardado e pede a câmara.

## Limites

- **Ecrã ligado enquanto cria o alvo:** com a página escondida, o navegador para o compilador do MindAR.
- **O Zappar só funciona com o teste publicado na ZapWorks.** No github.io fica sem licença. Os alvos ficam guardados em cada endereço: os criados no github.io não aparecem na versão da ZapWorks, nem o contrário.
- O programa da Zappar foi feito para o Node: junta-se-lhe uma versão para navegador do `Buffer` (`buffer@6.0.3`) e corre na própria página (a versão com *worker* fica parada). Enquanto cria o alvo Zappar, a página pode ficar presa uns segundos.
- **Medir no sítio exato da fotografia é o melhor caso possível.** Se nem assim reconhecer, aquela parte do mosaico não serve de alvo. Se reconhecer, falta testar dos pontos vizinhos e noutros telemóveis.
- Uma fotografia em perspetiva continua a ser tratada pelo motor como uma imagem plana, vista de frente: serve para saber onde há reconhecimento, não para alinhar o conteúdo com o chão.
