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

### Separe estrutura visual de unidades de rich text

O contêiner que monta a linha, coluna ou card deve continuar estrutural. Dentro
dele, cada conteúdo que deve abrir junto no CKEditor vira uma unidade explícita
com `div[data-slot="text"]`.

Para um texto simples, use desde o início a mesma estrutura estável que o
CKEditor produziria depois do primeiro clique:

```html
<div class="contentbuilder-landingpage-richtext section-copy">
    <div data-slot="text" class="text-block">
        <p>Parágrafo editável</p>
    </div>
</div>
```

Para introdução, lista e continuação que pertencem ao mesmo texto:

```html
<div class="contentbuilder-landingpage-richtext section-copy">
    <div data-slot="text" class="richtext-group">
        <p>Introdução</p>
        <ul>
            <li>Primeiro item</li>
            <li>Segundo item</li>
        </ul>
        <p>Continuação</p>
    </div>
</div>
```

O resultado esperado no GrapesJS é:

- o contêiner visual externo como `default`;
- cada `div[data-slot="text"]` como um único componente `text`;
- o HTML interno guardado como conteúdo do rich text, não como componentes
  estruturais separados;
- o `ul` editado com os controles nativos do CKEditor;
- nenhum `gjs-heading-wrapper`, ID gerado, `draggable`,
  `data-gjs-type` ou `data-list-item-id` no tema.

Na importação inicial e depois de usar o editor de código, o builder de páginas
deve condensar os filhos de cada `div[data-slot="text"]` no conteúdo do
componente `text`. Sem essa normalização, o HTML pode estar correto e ainda
assim o GrapesJS expor `p`, `ul` e `li` separadamente até o primeiro clique no
CKEditor.

Um título isolado pode continuar como `h1` a `h6` diretamente dentro do
contêiner, pois ele já é uma unidade de texto única. Não coloque um título,
uma lista e um card inteiro no mesmo slot apenas por estarem próximos.

### Use HTML válido e uma hierarquia simples

- Use `p` para parágrafos.
- Use `ul` ou `ol` com filhos `li` para listas.
- Use `a` para links e mantenha o conteúdo clicável dentro dele.
- Use `table`, `tbody`, `tr` e `td` somente para dados tabulares reais.
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
        <div class="offer-text contentbuilder-landingpage-richtext">
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

As variantes precisam ter especificidade suficiente para substituir a regra
base. Se a base usa `.button.tele2-button`, uma variante que altera a borda
deve incluir também a classe `.button`:

```css
.button.tele2-button--outline {
    border-width: 1px;
}
```

Usar somente `.tele2-button--outline` não substitui `border-width: 0` da regra
base, mesmo que a variante apareça depois no CSS.

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
um formato diferente. Para títulos, prefira uma tag semântica `h1` a `h6`. O
contêiner visual deve permanecer estrutural; os elementos inline ficam
restritos ao conteúdo textual.

### Use o contêiner visual como base estável

Em blocos compostos, mantenha família, tamanho básico, espaçamento e cor
contextual em uma classe estável do contêiner. Não é necessário transformá-lo
em um slot de texto:

```html
<div
    class="contentbuilder-landingpage-richtext offer-copy offer-copy--light"
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

.offer-copy--light * {
    color: inherit;
}
```

Use a herança de cor somente em contextos que exigem uma cor única, como texto
branco sobre fundo escuro. Uma regra antiga diretamente no `p`, por exemplo
`color: #333`, vence a cor do contêiner sem essa correção. Não aplique
`font: inherit` globalmente: isso substitui a fonte serif e o tamanho dos
títulos.

Quando uma seção inteira tem fundo escuro, coloque a garantia de contraste na
seção, não em um único parágrafo. Limite a herança aos rich texts para não
alterar kickers, preços ou botões que tenham cores próprias:

```css
.dark-section {
    color: #fafafa;
}

.dark-section .contentbuilder-landingpage-richtext,
.dark-section .contentbuilder-landingpage-richtext * {
    color: inherit;
}
```

Assim, duplicar ou simplificar o conteúdo interno não reintroduz texto escuro
no fundo escuro.

Evite `span` aninhado quando ele só repete fonte, cor ou tamanho.
Texto simples deve ficar diretamente dentro de `p`, `li` ou do elemento
semântico correspondente. Reserve `span` para uma diferença real, como o
preço com cor própria.

Marcadores puramente visuais, como `✓`, não devem existir como texto editável.
Gere-os com CSS:

```css
.feature-list > li {
    padding-left: 28px;
    position: relative;
}

.feature-list > li::before {
    content: '✓';
    left: 0;
    position: absolute;
}
```

Assim o usuário não consegue clicar no marcador, digitar dentro dele ou fazer
o texto invadir o espaço do item.

### Use um contêiner HTML para tokens do Mautic

```html
<div class="contentbuilder-landingpage-html">
    <div>{form=INSERT_YOUR_ID_HERE}</div>
</div>
```

O token aparece literalmente no builder e é processado somente na página
pública. Um ID inexistente ou o texto `INSERT_YOUR_ID_HERE` não renderiza um
formulário na página publicada.

Quando o formulário fica abaixo de um título, use uma classe compartilhada para
dar ao contêiner do token o mesmo recuo horizontal do título em cada
breakpoint. Aplique essa classe a todos os pares equivalentes. Formulários
intencionalmente centralizados devem manter sua própria classe de alinhamento e
não receber o recuo lateral.

### Use uma única linha de alinhamento por breakpoint

No mobile, títulos, textos, imagens contidas, botões full-width, kickers e
tokens relacionados devem começar e terminar no mesmo gutter. Não deixe cada
componente manter um padding herdado diferente do desktop. Imagens
intencionalmente full-width são a exceção e devem ser identificadas como tal.

Meça o retângulo real dos componentes no canvas do GrapesJS e na página
pública. Uma seção pode parecer centralizada e ainda ter texto a 32 px, mídia a
36 px e ações a 66 px. A correção responsiva deve atingir a família inteira de
wrappers equivalentes e produzir a mesma linha de conteúdo nos dois ambientes.

Quando uma faixa de fundo deve alcançar as bordas da tela, faça somente o
contêiner visual ultrapassar o padding do `contentRoot`. Use largura calculada e
margens negativas iguais ao gutter do breakpoint. Compense esse deslocamento
no padding dos conteúdos internos para que textos, mídia contida, kickers e
ações continuem alinhados com o restante da página.

Não remova o padding do `contentRoot` inteiro para obter o efeito full-bleed:
isso também desloca cards e seções que devem continuar contidos. Marque ou
selecione apenas a família de faixas intencionalmente full-bleed e valide o
retângulo do fundo separadamente do retângulo do conteúdo.

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

1. Feche qualquer sessão antiga do builder.
2. Atualize o tema.
3. Migre o HTML e o estado salvo da página quando a estrutura mudou.
4. Recompile o bundle do builder quando o JavaScript mudou.
5. Abra a edição da landing page em uma carga sem cache.
6. Abra o builder e teste os componentes alterados.
7. Feche o builder sem salvar os textos usados apenas no teste.
8. Recarregue a URL pública.

Em uma página nova, também teste a aplicação do tema desde o início. Em uma
página com edições reais, não troque o tema somente para forçar uma
reimportação: isso pode substituir o conteúdo do usuário.

Compare a renderização direta do Twig, o conteúdo dentro do builder e a página
pública. Teste pelo menos uma largura de desktop, tablet e móvel. Duplique um
texto, uma coluna e uma linha; as cópias devem manter fonte, espaçamento,
largura, alinhamento, fundo e comportamento responsivo.

Não valide apenas pela aparência. Inspecione também:

- o tipo e a tag do componente selecionado;
- o HTML retornado pelo componente;
- o conteúdo ativo do CKEditor;
- os estilos calculados antes e durante a edição;
- o HTML e o CSS serializados;
- a resposta da página pública.

Para um título isolado, o esperado é selecionar diretamente `type: text` com
tag `h2`. Para um parágrafo ou grupo rico, o esperado é selecionar o
`div[data-slot="text"]` e abrir todo o seu conteúdo como uma única edição,
enquanto o contêiner visual permanece `default`.

Quando uma troca de tema fizer parte do teste de uma página descartável, trate
a confirmação exibida pelo navegador. Sem isso, o teste pode ficar parado
antes de o novo HTML entrar no canvas.

## Não faça

### Não transforme o contêiner visual inteiro em texto

Evite:

```html
<div class="contentbuilder-landingpage-richtext" data-slot="text">
    <h2>Título</h2>
    <p>Descrição</p>
    <ul>
        <li>Item</li>
    </ul>
</div>
```

O `data-slot="text"` força esse `div` a ser um único componente `text`. Isso é
correto para uma unidade editorial, mas não para o contêiner que também monta
layout, imagem, botão, formulário ou card. O limite do slot deve ser o limite do
conteúdo que o usuário espera editar de uma vez.

O builder de páginas deve reconhecer corretamente o contexto da landing page e
preservar `h1` a `h6` sem criar `gjs-heading-wrapper`. A detecção não pode
depender apenas de um contexto opcional; o formulário `page_customHtml` é um
fallback confiável.

### Não use tabelas para montar cards ou seções

Uma tabela de apresentação vira um widget de tabela do CKEditor. Ao clicar, o
usuário passa a editar uma célula redimensionável e o layout pode ser
reescrito:

```html
<table>
    <tbody>
        <tr>
            <td>
                <h2>Oferta</h2>
                <p>Descrição</p>
            </td>
        </tr>
    </tbody>
</table>
```

Use a estrutura direta:

```html
<div class="offer-card">
    <h2>Oferta</h2>
    <p>Descrição</p>
</div>
```

Depois da migração, confirme que não existem `<table>` nem `figure.table` no
template, no HTML salvo, no estado do editor ou no conteúdo ativo do CKEditor.

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

### Não coloque a estrutura da página dentro de um componente de texto

Linhas, colunas, cards, imagens, vídeos e formulários devem ser componentes
estruturais. Apenas o elemento semântico que contém texto deve ser editável.

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

Na página Tele2, as imagens oficiais hospedadas no Salesforce e o vídeo do
YouTube são dependências remotas intencionais para preservar o material
publicado pelo cliente. Esse risco é aceito para essas mídias. As fontes ficam
no próprio tema e os formulários usam tokens do Mautic. Antes de usar o tema
sem acesso externo, substitua também essas mídias por arquivos locais
autorizados.

### Mantenha todas as listas dentro do rich text nativo

Um `ul` de conteúdo não deve ser filho estrutural solto de uma linha, coluna ou
card. Coloque a lista e os parágrafos relacionados dentro de um único bloco de
texto interno:

```html
<div class="contentbuilder-landingpage-richtext tele2-edit-safe"
     role="presentation">
    <div data-slot="text" class="tele2-richtext-group">
        <p>Introdução da seção</p>
        <ul>
            <li>Primeiro item</li>
            <li>Segundo item</li>
        </ul>
        <p>Continuação da seção</p>
    </div>
</div>
```

O contêiner externo continua sendo apenas estrutura. O
`.tele2-richtext-group` é o único componente de texto da seção. Assim, o
CKEditor edita parágrafos e bullets como um conteúdo só, e inserir ou remover
itens usa o comportamento normal do editor. Listas comuns mantêm os bullets
nativos. Uma lista com aparência especial também fica dentro do rich text: use
uma classe no próprio `ul`, como `.tele2-feature-list`, somente para trocar o
marcador por um checkmark. A classe visual não transforma o `ul` em componente
estrutural separado.

Não termine o parágrafo anterior à lista com `<br>`, `&nbsp;` ou um parágrafo
vazio para criar espaço. O CKEditor preserva ou normaliza esses nós e pode
transformá-los numa linha editável em branco antes do primeiro item. Controle a
distância com a margem do `ul`. Ao carregar ou fechar o rich text, o builder
remove quebras finais vazias e parágrafos vazios imediatamente anteriores a
`ul` ou `ol`.

Ao testar, confirme que:

1. o contêiner externo não abre o CKEditor;
2. o grupo interno abre como um único bloco de texto;
3. o conteúdo do editor contém os parágrafos e o `ul`;
4. nenhum `ul` aparece como componente estrutural selecionável;
5. listas comuns mostram bullets e listas de benefícios mantêm os checkmarks;
6. criar e apagar itens não desloca o marcador para cima do texto;
7. clicar na lista não cria uma linha vazia antes do primeiro item;
8. salvar e reabrir mantém a mesma estrutura.

### Faça uma linha visual ser uma unidade de texto

Quando dois textos inline formam uma única linha visual, não deixe cada parte
virar um componente editável independente. Use um `div` de texto dedicado:

```html
<div data-slot="text" class="price-line">
    <p>
        <strong>1 599 kr/mån</strong>
        <small>månadsavgift</small>
    </p>
</div>
```

Não use um `p` estrutural contendo componentes de texto independentes. Ao
ativar somente uma parte, o CKEditor pode fechar o `p`, mover o texto seguinte
para fora e criar outro `p` vazio. O `div[data-slot="text"]` faz a linha inteira
ser aberta e salva como uma única unidade. Dentro dele, mantenha todo o conteúdo
inline no mesmo `p`: elementos inline diretamente na raiz também podem ser
normalizados em blocos separados pelo CKEditor.

Para a descrição secundária, prefira um elemento inline que o modelo do editor
aceite dentro do parágrafo, como `small`. Um `span` com classe de HTML geral
pode ser preservado como um bloco separado pelo CKEditor e sair do `p`, mesmo
quando o HTML de entrada era válido.

Ancore o CSS dessa marcação na classe do componente de texto:

```css
.price-line strong {
    color: #419952;
    display: inline-block;
    margin-right: 0.3em;
}

.price-line small {
    color: #555;
    font-size: 15px;
}
```

O GrapesJS pode guardar o HTML interno de um componente `text` como uma string.
Nesse caso, classes usadas somente em filhos como `strong` e `small` não entram
na árvore de componentes. Ao salvar, o gerador de CSS remove como não utilizada
uma regra isolada como `.price`, mesmo que a classe ainda esteja no HTML.
Um seletor ancorado em `.price-line`, que é um componente conhecido pelo
builder, permanece no CSS público e continua funcionando depois de reabrir.

### Corrija famílias, não ocorrências

Uma correção descoberta em um componente deve ser aplicada a todas as
estruturas equivalentes da página. Antes de concluir:

1. pesquise todas as ocorrências da marcação, classe ou comportamento;
2. separe variações editoriais das que têm função visual especial;
3. aplique a mesma unidade de edição e as mesmas classes a toda a família;
4. confira também componentes repetidos em outra seção, variante de cor e
   breakpoint;
5. migre todas as ocorrências correspondentes na página já salva;
6. registre qualquer exceção intencional e o motivo.

Não aceite uma correção que funcione somente no texto usado para reproduzir o
problema. O exemplo revela a regra; ele não define o limite da correção.

### Mantenha HTML e estado do editor sincronizados

O Mautic salva o HTML público e o projeto do GrapesJS separadamente. Alterar
somente o Twig ou `custom_html` não corrige uma página que já possui estado
salvo. A estrutura usada pelo builder fica em:

```text
content
└── grapesjsbuilder
    └── editorState
        ├── pages
        └── styles
```

Ao migrar uma página existente:

1. preserve o conteúdo e as edições do usuário;
2. atualize `custom_html`;
3. atualize os componentes e estilos dentro de
   `grapesjsbuilder.editorState`;
4. feche sessões antigas do builder antes da migração;
5. reabra o builder e confira o projeto efetivamente carregado;
6. verifique novamente o banco, pois uma sessão antiga pode sobrescrever a
   migração com o estado anterior.

Não adicione `styles` no nível externo de `content`: o GrapesJS não lê esse
local. Não descarte todo o estado quando uma migração pequena e direcionada
consegue preservar as edições existentes.

## Diagnóstico rápido

Se o preview e a página pública forem diferentes:

1. Conte ocorrências de `gjs-heading-wrapper` no HTML salvo.
2. Confirme que `data-slot="text"` aparece somente em unidades editoriais e
   nunca no contêiner que monta a seção, coluna ou card.
3. Procure `<table>` e `figure.table` em rich text; o esperado é zero.
4. Confirme que o contêiner visual é `default` e cada unidade editorial é um
   único componente `text`, sem `ul` ou `li` estruturais dentro dela.
5. Procure regras CSS ligadas a IDs gerados e mova os estilos para classes.
6. Confirme que o bloco `<style>` gerado ainda está no HTML público.
7. Compare o estilo calculado antes, durante e depois da edição.
8. Compare `custom_html` com `grapesjsbuilder.editorState`.
9. Confirme que os tokens de formulário continuam no HTML salvo.
10. Faça uma carga sem cache depois de recompilar o bundle do builder.
11. Confirme que regras de filhos guardados como texto continuam no CSS público;
    se sumirem, ancore o seletor na classe estável do componente `text`.

No caso Tele2, os problemas tinham a mesma causa: estrutura visual e conteúdo
editável estavam misturados. Contêineres inteiros viravam texto, tabelas de
layout viravam células do CKEditor, marcadores visuais podiam ser editados e
estilos presos a IDs não sobreviviam à duplicação. A correção separou estrutura,
conteúdo e decoração e manteve as duas representações salvas sincronizadas.

## Critérios de aceite

- O tema aparece na lista de temas de landing page.
- O Twig passa no lint.
- O builder abre sem erro.
- O HTML salvo não contém wrappers inesperados.
- Contêineres visuais não são componentes `text`.
- Títulos isolados e unidades de rich text podem ser selecionados sem expor
  seus `p`, `ul` ou `li` internos como componentes estruturais separados.
- O conteúdo rico não contém tabelas usadas apenas para layout.
- Marcadores decorativos não existem como texto editável.
- Todos os tokens do Mautic continuam presentes depois de salvar.
- Botões continuam editáveis como botões, sem uma `div` interna.
- Títulos mantêm família, cor, tamanho e altura de linha ao entrar e sair da
  edição de texto.
- Parágrafos mantêm alinhamento, cor e tipografia mesmo quando o editor troca a
  estrutura interna.
- Texto, coluna e linha duplicados mantêm todos os estilos do original.
- A página pública mantém alinhamento, cores, fontes, tamanhos e espaçamentos.
- O layout foi comparado em desktop, tablet e tela móvel, sem rolagem horizontal.
