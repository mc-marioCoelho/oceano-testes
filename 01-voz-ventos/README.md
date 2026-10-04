# Teste 01 — Voz + legendas (paragem «Os Ventos»)

**O que testa:** o princípio «ouvir primeiro, ler se quiser». Um liberto (Gaio Víbio) fala; a legenda acompanha; o vento nomeado acende-se no esquema do mosaico. Ainda **sem RA**.

**Ficheiros:**
- `index.html`: a página;
- `style.css`: o aspeto;
- `app.js`: a lógica. O **guião está no topo do ficheiro**, na lista `FALAS`; para mudar uma frase, basta editar o texto entre aspas;
- `guiao.md`: o guião para rever, com as fontes.

## Como experimentar
- **No PC:** abre `index.html` no Chrome ou no Edge (duplo clique, ou Live Server no VS Code) e toca em «▶ Ouvir».
- **No telemóvel:** precisa de estar *online*. Quando o GitHub Pages estiver ativo no `oceano-testes` (Settings › Pages › Branch `main` / pasta raiz), o endereço será:
  `https://mc-mariocoelho.github.io/oceano-testes/01-voz-ventos/`

## Pôr a tua fotografia em vez do esquema
Guarda nesta pasta uma fotografia **quadrada** do painel central (o medalhão com os quatro cantos), recortada pelo quadro e orientada com a inscrição em baixo. Dá-lhe o nome **`painel-central.jpg`**. A página passa a usá-la automaticamente, e os realces aparecem por cima dela.
⚠️ Se for a fotografia de D. Pavone / MMF, este repositório é **público**: só com autorização.

## O que observar no teste
1. O ritmo das falas: rápido, lento, pausas?
2. A voz portuguesa do telemóvel: soa a PT-PT ou a PT-BR? (Depende das vozes instaladas no aparelho.)
3. Com «🔇 Só legendas»: dá tempo para ler?
4. O realce chama a atenção para o sítio certo?
5. A duração total (cerca de 35 s): sabe a pouco ou a muito?

## O narrador em silhueta (camada sobreposta)
- Quando começa a falar, **entra pelo canto inferior esquerdo** uma silhueta 2D de um romano de toga, de perfil, a apresentar o mosaico.
- Enquanto fala, balança ligeiramente e aparecem **ondas de som** junto ao rosto. A legenda passa a **balão de fala** que aponta para ele.
- Em pausa fica visível mas calado. **No fim despede-se e desaparece.**
- A silhueta é **provisória**, desenhada em código. Para usar a tua ilustração, grava nesta pasta um **`narrador.png`** com fundo transparente (figura em pé, voltada para a direita); a página usa-a automaticamente.
