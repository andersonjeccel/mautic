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

O GrapesJS aceita estilos inline e normalmente os converte em regras CSS com
IDs gerados. Isso funciona, mas classes próprias são mais fáceis de manter e
produzem menos alterações no HTML salvo.

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
pública. Teste pelo menos uma largura de desktop e uma largura móvel.

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
3. Confirme que o bloco `<style>` gerado ainda está no HTML público.
4. Compare o estilo calculado do mesmo elemento nas duas páginas.
5. Verifique se o texto continua dentro do elemento que possui os estilos.
6. Confirme que os tokens de formulário continuam no HTML salvo.
7. Reaplique o tema e salve novamente antes de concluir que a alteração não
   funcionou.

No caso Tele2, o CSS estava presente. A diferença visual era causada pelos
wrappers de texto criados durante a normalização. Adicionar os slots de texto
preservou a hierarquia e eliminou esses wrappers.

## Critérios de aceite

- O tema aparece na lista de temas de landing page.
- O Twig passa no lint.
- O builder abre sem erro.
- O HTML salvo não contém wrappers inesperados.
- Todos os slots de texto continuam presentes depois de salvar.
- Todos os tokens do Mautic continuam presentes depois de salvar.
- A página pública mantém alinhamento, cores, fontes, tamanhos e espaçamentos.
- O layout foi comparado em desktop e em tela móvel.
