# Teste 06 · Alvo criado no local (2.ª versão)

Continuação do [teste 05](../05-alvo-no-local/), que fica como estava. Funciona da mesma maneira (fotografia no próprio ponto, recorte, alvos MindAR e Zappar a partir da mesma imagem, teste logo a seguir). Muda o que a ronda de 9 out. na sala mostrou.

## O que mudou em relação ao teste 05

1. **Zappar no github.io:** a 9 out. o Zappar reconheceu o alvo de P4 no github.io, mas a faixa da licença («Visit our licensing page…») tapava os botões. Na página do Zappar os botões sobem para ficarem acima da faixa.
2. **Cronómetro do Zappar:** o Zappar pede um toque em «GRANT ACCESS» antes de ligar a câmara; o MindAR não. O cronómetro recomeça nesse toque, para os tempos dos dois motores se poderem comparar. (A medição de 9 out., 8,2 s, contou o tempo da autorização e não serve para a comparação.)
3. **Confirmação nos botões:** depois de guardar, enviar, partilhar, copiar ou criar um alvo, o botão fica **verde com ✓ durante 2 s** e não aceita outro toque nesse tempo. Evita envios repetidos por dúvida.
4. **«Trazer os alvos do teste 05»:** copia para o teste 06 os alvos criados no teste 05 no mesmo telemóvel, sem os tirar do teste 05. Assim os alvos de 9 out. podem testar-se com o Zappar sem voltar a fotografar.
5. O teste 06 guarda alvos e resultados à parte do teste 05 (`oceano-teste06`).

## Acrescentado a 10 out. (pedido do Mário, antes da ida à sala)

6. **Objetos 3D com sombra** por cima do alvo reconhecido, no MindAR e no Zappar (`objetos.js`): um cubo semitransparente ao centro, com uma luz e um «chão» invisível que só mostra a sombra. O cubo mostra melhor do que o retângulo plano o tremor e os erros de perspetiva que um visitante vai ver. Não muda as medições (o tremor mede-se pela posição do alvo).
7. **Forma do recorte:** retângulo, **trapézio** (arrasta-se e depois puxa-se cada canto até ao limite do mosaico visto em perspetiva), triângulo, elipse ou polígono livre. O alvo continua retangular (é o que os dois motores aceitam): o que fica fora da forma é pintado com a **cor média de dentro**, com uma **passagem suave** e toda dentro da forma, para o motor não aprender um contorno falso nem o passadiço. Substitui a edição no Photoshop combinada a 9 out. para o P5. Na RA, a moldura amarela segue a forma.
8. **Pontos marcados:** «Marcar pontos neste alvo» (também nos alvos já criados, sem os criar outra vez). Cada toque marca um sítio e recebe um nome. Na RA aparece um objeto diferente em cada ponto (cubo, esfera, cilindro, cone; cores diferentes) e a legenda no painel. **Uso previsto: a inscrição**, com um ponto em cada um dos quatro libertos (C. Calpurnius, G. Vibius Quintilianus, L. Attius, M. Verrius Geminus). Não é leitura do texto (OCR): o motor reconhece a inscrição como imagem e os objetos ficam onde os nomes foram marcados, que é o método que a experiência final vai usar.

Os resultados exportados passam a ter as colunas «Forma do recorte» e «Pontos marcados».

9. **Imagem da página inteira (para o DDB):** o «Enviar tudo para o GitHub» junta uma imagem JPG da página de cima a baixo, como está nesse momento (alvos, tabela de resultados), em `envios/<data>-<aparelho>/pagina.jpg` (opção ligada por omissão). Há também um botão para a guardar só no telemóvel. Faz-se com o html2canvas, que redesenha a página numa imagem (o navegador não deixa a página fotografar o ecrã); a secção da chave do GitHub fica de fora. No PC, vai para `media-local/fotos/teste-06-<data>/capturas/`.
10. **«Fotografar a RA»** (barra de baixo do MindAR e do Zappar): junta numa imagem a câmara, a moldura e os objetos 3D, com uma faixa em cima com motor, alvo, ponto, aparelho, hora, 1.º reconhecimento, tremor e a legenda dos pontos marcados. Um clarão branco confirma. As fotografias ficam no telemóvel (loja `capturas`, IndexedDB versão 2) e seguem com «Partilhar resultados e fotografias» e com «Enviar tudo para o GitHub» (`teste-06/capturas-ra/ra-<motor>-<ponto>-<data>-<hora>.jpg`). No PC, também vão para `capturas/`.

## Limites

Os mesmos do teste 05: ecrã ligado enquanto cria o alvo; medir no sítio da fotografia é o melhor caso possível; falta testar dos pontos vizinhos, a outra hora e noutros telemóveis.

Problemas conhecidos (deixados assim por decisão do Mário, 10 out.):
- **O Zappar mantém os objetos à vista quando perde o alvo** (o MindAR esconde-os). Na sala, guiar-se pelo painel («RECONHECIDO» / «à procura»), não pelo cubo; os números guardados vêm do painel e estão certos. Para o protótipo: os dois motores devem esconder o conteúdo ao perder o alvo.
- Na imagem da página, a tabela de resultados sai cortada (só as primeiras colunas); os números completos vão no `resultados.txt`/`.json`.
- Os botões da forma do recorte passam despercebidos: escolher a forma **antes** de arrastar o dedo.
- Medir sempre no local: fotografar um ecrã cria interferência (moiré) e os números não valem.

## Envio para o PC no fim da sessão (via GitHub)

Botão **«Enviar tudo para o GitHub»** (no fim da página): envia resultados, recortes, alvos `.mind`/`.zpt` e, se a opção estiver ligada, as fotografias originais para o repositório **privado** `oceano-dados-testes`, que serve só de passagem. Só envia o que ainda não foi enviado deste telemóvel (os resultados vão sempre).

- A chave de acesso (*fine-grained token*, só para o `oceano-dados-testes`, só «Contents: read and write», com prazo) é criada pelo Mário no GitHub e colada uma vez na página; fica só no navegador do telemóvel. Nunca vai para o código.
- No PC, o Claude faz `git pull` do `oceano-dados-testes`, copia as fotografias e os alvos para `media-local` e os resultados para `resultados/`, e repõe o `oceano-dados-testes` vazio (só o README, histórico descartado), para não acumular peso.
- A chave fica guardada no telemóvel com um nome comum a todos os testes (`oceano-gh-chave`): os testes seguintes reutilizam-na.
- Estrutura (cada teste na sua pasta): `teste-06/envios/<data>-<aparelho>/resultados.txt|json`, `teste-06/alvos/<id>/recorte.jpg|alvo.mind|alvo.zpt`, `teste-06/originais/foto-<id>.jpg`.
