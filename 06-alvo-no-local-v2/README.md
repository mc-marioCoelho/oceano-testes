# Teste 06 · Alvo criado no local (2.ª versão)

Continuação do [teste 05](../05-alvo-no-local/), que fica como estava. Funciona da mesma maneira (fotografia no próprio ponto, recorte, alvos MindAR e Zappar a partir da mesma imagem, teste logo a seguir). Muda o que a ronda de 9 out. na sala mostrou.

## O que mudou em relação ao teste 05

1. **Zappar no github.io:** a 9 out. o Zappar reconheceu o alvo de P4 no github.io, mas a faixa da licença («Visit our licensing page…») tapava os botões. Na página do Zappar os botões sobem para ficarem acima da faixa.
2. **Cronómetro do Zappar:** o Zappar pede um toque em «GRANT ACCESS» antes de ligar a câmara; o MindAR não. O cronómetro recomeça nesse toque, para os tempos dos dois motores se poderem comparar. (A medição de 9 out., 8,2 s, contou o tempo da autorização e não serve para a comparação.)
3. **Confirmação nos botões:** depois de guardar, enviar, partilhar, copiar ou criar um alvo, o botão fica **verde com ✓ durante 2 s** e não aceita outro toque nesse tempo. Evita envios repetidos por dúvida.
4. **«Trazer os alvos do teste 05»:** copia para o teste 06 os alvos criados no teste 05 no mesmo telemóvel, sem os tirar do teste 05. Assim os alvos de 9 out. podem testar-se com o Zappar sem voltar a fotografar.
5. O teste 06 guarda alvos e resultados à parte do teste 05 (`oceano-teste06`).

## Limites

Os mesmos do teste 05: ecrã ligado enquanto cria o alvo; medir no sítio da fotografia é o melhor caso possível; falta testar dos pontos vizinhos, a outra hora e noutros telemóveis.

## Envio para o PC no fim da sessão (via GitHub)

Botão **«Enviar tudo para o GitHub»** (no fim da página): envia resultados, recortes, alvos `.mind`/`.zpt` e, se a opção estiver ligada, as fotografias originais para o repositório **privado** `oceano-dados`, que serve só de passagem. Só envia o que ainda não foi enviado deste telemóvel (os resultados vão sempre).

- A chave de acesso (*fine-grained token*, só para o `oceano-dados`, só «Contents: read and write», com prazo) é criada pelo Mário no GitHub e colada uma vez na página; fica só no navegador do telemóvel. Nunca vai para o código.
- No PC, o Claude faz `git pull` do `oceano-dados`, copia as fotografias e os alvos para `media-local` e os resultados para `resultados/`, e repõe o `oceano-dados` vazio (só o README, histórico descartado), para não acumular peso.
- Estrutura: `envios/<data>-<aparelho>/resultados.txt|json`, `alvos/<id>/recorte.jpg|alvo.mind|alvo.zpt`, `originais/foto-<id>.jpg`.
