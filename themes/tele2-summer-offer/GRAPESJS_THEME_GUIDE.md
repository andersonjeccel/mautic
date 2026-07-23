# Guia para temas de landing page no GrapesJS

Este guia registra o que funcionou na landing page Tele2 e os problemas
encontrados ao transformar HTML externo em um tema editável do Mautic.

## Estrutura mínima

Um tema de landing page deve ter:

```text
theme-name/
├── composer.json
├── config.json
└── html/
    ├── base.html.twig
    └── page.html.twig
```

O `config.json` deve declarar o builder e o recurso:

```json
{
  "builder": ["grapesjsbuilder"],
  "features": ["page"]
}
```

O `base.html.twig` deve estender o tema base do Mautic:

```twig
{% extends '@MauticCore/Theme/base.html.twig' %}
```

O `page.html.twig` deve estender o arquivo base do próprio tema:

```twig
{% extends "@themes/"~template~"/html/base.html.twig" %}
```

## Faça

### Marque cada área de texto editável

Use `data-slot="text"` no contêiner que envolve parágrafos, títulos, listas e
outros textos editáveis:

```html
<div class="contentbuilder-landingpage-richtext" data-slot="text">
    <p>
        <span>Texto editável</span>
    </p>
</div>
```

Essa marcação informa ao builder que a hierarquia interna é texto rico e deve
ser preservada. Sem ela, o GrapesJS pode tratar `p`, `span` e títulos como
componentes independentes.

### Use HTML válido e uma hierarquia simples

- Use `p` para parágrafos.
- Use `ul` ou `ol` com filhos `li` para listas.
- Use `a` para links e mantenha o conteúdo clicável dentro dele.
- Use `table`, `tbody`, `tr` e `td` na ordem correta quando uma tabela for
  realmente necessária.
- Mantenha elementos inline, como `span`, `strong` e `em`, dentro do mesmo
  fluxo de texto.
- Feche todas as tags.

### Mantenha o CSS estrutural dentro do conteúdo da página

O GrapesJS importa o bloco `content` de `page.html.twig`, mas não carrega
automaticamente as regras colocadas apenas no bloco `stylesheets` de
`base.html.twig`.

Coloque dentro do bloco `content` as regras necessárias para montar o layout no
builder, como `display: flex`, larguras, alinhamento e media queries:

```twig
{% block content %}
<style>
    .landing-page__row {
        display: flex;
    }

    @media (max-width: 480px) {
        .landing-page__row {
            flex-direction: column;
        }
    }
</style>

{# conteúdo da página #}
{% endblock %}
```

Mantenha no `base.html.twig` apenas recursos usados fora do canvas, como
favicon e metadados.

### Hospede as fontes dentro do próprio tema

Coloque os arquivos em `assets/fonts/` e gere a URL com `getAssetUrl()`. Isso
evita depender de um servidor externo e mantém as fontes disponíveis no builder
e na página publicada:

```twig
@font-face {
    font-family: 'Tele2 Sans';
    src: url('{{ getAssetUrl('themes/tele2-summer-offer/assets/fonts/Tele2Sans-Regular.woff2', null, null, true) }}') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}
```

Declare separadamente cada combinação disponível de família, peso e estilo.
Use uma pilha de fallback depois da fonte principal:

```css
font-family: 'Tele2 Sans', Arial, Helvetica, sans-serif;
```

**Não faça:** copie os arquivos sem criar as regras `@font-face`, use o caminho
de outro tema ou declare um peso que não existe nos arquivos.

### Coloque os estilos em classes estáveis

Não use `style=""` nos elementos que o usuário pode duplicar. Ao importar o
tema, o GrapesJS pode mover esse estilo para uma regra ligada ao ID gerado:

```css
#texto-original {
    font-size: 24px;
}
```

Ao duplicar o texto, a coluna ou a linha, o novo componente recebe outro ID,
mas não recebe outra regra CSS. O resultado é uma cópia sem tamanho de fonte,
espaçamento, largura, cor de fundo ou outros estilos.

Use classes estáveis para todos os estilos visuais e estruturais:

```html
<div class="offer-row">
    <div class="offer-column">
        <div class="offer-text contentbuilder-landingpage-richtext" data-slot="text">
            <p class="offer-title">Texto editável</p>
        </div>
    </div>
</div>
```

```css
.offer-row {
    display: flex;
    background: #000;
}

.offer-title {
    margin: 0;
    font-size: 24px;
}
```

O ID pode mudar quando o componente é duplicado. A classe continua igual e
preserva o visual.

### Faça botões como links diretos

Para que o botão seja reconhecido e editado como o componente de botão do
GrapesJS, deixe o texto diretamente dentro do link:

```html
<a href="#" class="button tele2-button tele2-button--dark">Texto do botão</a>
```

Não coloque uma `div` dentro do link. O elemento editável e o elemento visual
devem ser o mesmo.

### Coloque o estilo completo no elemento de texto editável

O editor rico pode simplificar vários `span`s aninhados quando o usuário abre
um texto para edição. Não divida a aparência principal de um título entre
vários elementos internos:

```html
<p class="text-default">
    <span class="white">
        <span class="serif">
            <span class="large">Título</span>
        </span>
    </span>
</p>
```

Se os `span`s forem normalizados, o título volta para o estilo de
`text-default`. Aplique cor, família, tamanho e altura de linha diretamente na
tag de título que o editor preserva:

```html
<h2 class="page-heading page-heading--large page-heading--white">Título</h2>
```

```css
.page-heading {
    font-family: 'Tele2 Serif', Georgia, serif;
}

.page-heading--large {
    font-size: 28px;
}

.page-heading--white {
    color: #fafafa;
}
```

Use elementos internos somente quando uma parte do texto realmente precisa de
um formato diferente. Para títulos, prefira uma tag semântica `h1` a `h6`;
essas tags também entram no modo de edição inline do builder.

### Use o slot de texto como base visual estável

Em blocos compostos, o editor pode trocar um `p` por `span`, separar o texto ou
remover wrappers durante a edição. A classe do contêiner com
`data-slot="text"` permanece. Coloque nele os valores básicos que devem
sobreviver a qualquer estrutura interna:

```html
<div
    class="contentbuilder-landingpage-richtext offer-copy offer-copy--light"
    data-slot="text"
>
    <p>Texto editável</p>
</div>
```

```css
.offer-copy {
    font-family: 'Tele2 Sans', Arial, sans-serif;
    font-size: 16px;
}

.offer-copy--light {
    color: #fafafa;
}

.offer-copy > *,
.offer-copy > .ck-editor__editable {
    color: inherit;
    font: inherit;
    text-align: inherit;
}
```

Assim, mesmo que o `p` vire outro elemento, o texto continua herdando fonte,
cor, tamanho e alinhamento do slot. Regras internas devem ficar restritas a
diferenças locais, como um preço destacado ou um marcador de lista.

Evite `span` aninhado quando ele só repete a fonte, a cor ou o tamanho do slot.
Texto simples deve ficar diretamente dentro de `p`, `li` ou do elemento
semântico correspondente. Reserve `span` para uma diferença real, como o
marcador `✓` ou um preço com cor própria.

### Use um contêiner HTML para tokens do Mautic

```html
<div class="contentbuilder-landingpage-html">
    <div>{form=INSERT_YOUR_ID_HERE}</div>
</div>
```

O token aparece literalmente no builder e é processado somente na página
pública. Um ID inexistente ou o texto `INSERT_YOUR_ID_HERE` não renderiza um
formulário na página publicada.

### Use nomes de classes estáveis

Prefira classes com significado, por exemplo:

```html
<section class="offer">
    <div class="offer__content"></div>
    <div class="offer__media"></div>
</section>
```

Classes continuam compreensíveis depois que o builder adiciona IDs próprios.

### Valide o ciclo completo

Depois de alterar um tema já usado por uma página:

1. Abra a edição da landing page.
2. Selecione outro tema.
3. Selecione novamente o tema alterado.
4. Abra o builder.
5. Clique em **Apply changes**.
6. Feche o builder.
7. Salve a landing page.
8. Recarregue a URL pública.

Compare a renderização direta do Twig, o conteúdo dentro do builder e a página
pública. Teste pelo menos uma largura de desktop, tablet e móvel. Duplique um
texto, uma coluna e uma linha; as cópias devem manter fonte, espaçamento,
largura, alinhamento, fundo e comportamento responsivo.

Ao automatizar a troca de tema, trate a confirmação exibida pelo navegador e
só prossiga depois de aceitá-la. Sem isso, o teste pode ficar parado antes de o
novo HTML entrar no canvas.

## Não faça

### Não deixe texto rico fora de `data-slot="text"`

Sem o slot, a normalização do builder pode transformar isto:

```html
<p style="text-align: center">
    <span style="font-size: 16px">Texto centralizado</span>
</p>
```

em algo equivalente a:

```html
<p></p>
<div class="gjs-heading-wrapper">
    <span>Texto centralizado</span>
</div>
```

O texto deixa de ser filho do parágrafo e perde estilos herdados como
alinhamento, cor, fonte, tamanho, margem e altura de linha.

### Não confie somente no preview do builder

O preview mostra o estado atual do editor. A página pública usa o HTML e o CSS
serializados pelo builder e ainda processa tokens do Mautic. Um preview correto
não prova que a publicação ficou correta.

### Não use IDs repetidos

Evite:

```html
<div id="contentRegion"></div>
<div id="contentRegion"></div>
```

IDs devem ser únicos. Para elementos repetidos, use classes. O GrapesJS pode
renomear IDs duplicados, mas isso cria seletores instáveis e torna o resultado
mais difícil de depurar.

### Não prenda o visual ao ID gerado

Mesmo um ID que começa único deixa de ser uma base segura quando o componente
é duplicado. Evite:

```html
<div id="offer-row" style="display: flex; background: #000"></div>
```

Mova as declarações para uma classe. IDs podem servir para âncoras e
identificação, mas não devem ser a única fonte do estilo de um componente
duplicável.

### Não use CSS inválido

Não gere declarações como:

```css
background-color: undefined;
background-color: ;
```

Remova a propriedade quando não houver valor. O navegador ignora valores
inválidos, mas o builder ainda pode salvá-los e aumentar o CSS gerado.

### Não coloque a estrutura da página dentro de um único slot de texto

Marque somente a área de texto. Não coloque linhas, colunas, imagens, vídeos e
formulários dentro de um único `data-slot="text"`, pois o editor de texto rico
pode tentar editar toda a estrutura como conteúdo textual.

### Não dependa de tags antigas em temas novos

Evite `font`, atributos de apresentação antigos e HTML criado por editores
legados. Prefira classes e CSS. Ao importar uma página antiga, preserve essas
tags somente quando removê-las mudar o visual e sempre valide o resultado no
builder.

### Não dependa de recursos remotos sem aceitar o risco

Imagens, fontes, vídeos e scripts externos podem mudar, bloquear acesso ou
ficar indisponíveis. Para um tema autossuficiente, salve os arquivos permitidos
em `assets/` e gere as URLs com `getAssetUrl()`.

Não copie scripts externos de rastreamento ou formulários para o tema. Use as
integrações e os tokens do próprio Mautic.

## Diagnóstico rápido

Se o preview e a página pública forem diferentes:

1. Conte ocorrências de `gjs-heading-wrapper` no HTML salvo.
2. Confirme que cada bloco de rich text tem `data-slot="text"`.
3. Procure regras CSS ligadas a IDs gerados e mova os estilos para classes.
4. Confirme que o bloco `<style>` gerado ainda está no HTML público.
5. Compare o estilo calculado do mesmo elemento nas duas páginas.
6. Verifique se o texto continua dentro do elemento que possui os estilos.
7. Confirme que os tokens de formulário continuam no HTML salvo.
8. Reaplique o tema e salve novamente antes de concluir que a alteração não
   funcionou.

No caso Tele2, havia dois problemas. Os wrappers de texto criados durante a
normalização alteravam a hierarquia, e os estilos inline eram serializados em
seletores presos aos IDs originais. Os slots de texto preservaram a hierarquia;
as classes estáveis fizeram as cópias manterem o mesmo visual.

## Critérios de aceite

- O tema aparece na lista de temas de landing page.
- O Twig passa no lint.
- O builder abre sem erro.
- O HTML salvo não contém wrappers inesperados.
- Todos os slots de texto continuam presentes depois de salvar.
- Todos os tokens do Mautic continuam presentes depois de salvar.
- Botões continuam editáveis como botões, sem uma `div` interna.
- Títulos mantêm família, cor, tamanho e altura de linha ao entrar e sair da
  edição de texto.
- Parágrafos mantêm alinhamento, cor e tipografia mesmo quando o editor troca a
  estrutura interna.
- Texto, coluna e linha duplicados mantêm todos os estilos do original.
- A página pública mantém alinhamento, cores, fontes, tamanhos e espaçamentos.
- O layout foi comparado em desktop, tablet e tela móvel, sem rolagem horizontal.
