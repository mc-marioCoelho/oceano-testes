# Teste 06 · ensaio em casa (10 out. 2026)

*Ensaio de funcionamento, não medição: o «mosaico» foi uma fotografia da inscrição aberta no ecrã do PC. Os números servem só para confirmar que se registam; fotografar um ecrã cria interferência (moiré) que baralha os dois motores. Dados e imagens em `media-local/fotos/teste-06-2026-10-10-ensaio/` (fora do Git).*

## O que testei e porquê

Antes de voltar à sala, confirmar que a versão 06 faz o percurso completo no telemóvel com as funções acrescentadas a 10 out.: recorte por forma (trapézio) com máscara, alvos MindAR **e** Zappar criados no telemóvel a partir do mesmo recorte, objetos 3D com sombra, «Fotografar a RA», imagem da página e envio para o PC pelo GitHub. Uma falha na sala custa uma ida ao museu.

## Como

Pixel 9a (Android 17), github.io, 10 out., 13:47–13:53. Fotografia do ecrã → recorte em trapézio sobre a lacuna da inscrição → «Criar alvo» com Zappar → teste com MindAR e com Zappar → «Fotografar a RA» nos dois → «Enviar tudo para o GitHub» → transferência para o PC pelo Claude (cópia, comparação sha256, repositório de passagem esvaziado).

## Resultado

| Passo | Resultado |
|---|---|
| Recorte em trapézio + máscara | ✓ lacuna e letras dentro; fora, cor média com passagem suave |
| Criação dos alvos no telemóvel | ✓ MindAR 22,7 s · Zappar 18,7 s (1024 × 731 px) |
| Objetos 3D | ✓ cubo de pé, com sombra, nos dois motores; moldura em trapézio encaixada |
| «Fotografar a RA» | ✓ câmara + objetos + faixa de dados |
| Imagem da página | ✓ página inteira (822 × 8726 px) |
| Envio → PC | ✓ 9 ficheiros, todos idênticos (sha256); repositório esvaziado |

Problemas encontrados:
1. **O Zappar deixa os objetos visíveis quando perde o alvo** (o MindAR esconde-os): o visitante julga que funciona e as fotografias mostram objetos que já não estão a ser seguidos.
2. **Na imagem da página, a tabela de resultados sai cortada** (só 4 colunas).
3. **Os botões da forma do recorte passam despercebidos** (o Mário não os viu à primeira).

## O que ganhei

- O teste 06 está pronto para a sala: o circuito completo funciona no telemóvel, incluindo o Zappar a partir de alvos criados no local.
- O recorte em trapézio resolve no telemóvel o problema do passadiço, sem Photoshop.
- Para o protótipo: os dois motores têm de se comportar da mesma maneira quando perdem o alvo (esconder o conteúdo); medir sempre no local e nunca a partir de um ecrã.

**Serve a tese:** 6.10.8 (testes) · 6.10.4 (preparação de conteúdos: alvos criados no local) · 6.10.2 (comparação MindAR/Zappar).

Execução do teste: Mário Coelho. Funções do teste 06, transferência e relatório: Claude (Anthropic).
