# Site do WCIA / SBSeg 2026: documento de design

Data: 2026-08-14
Repositório: `sbseg26-wcia/sbseg26-wcia.github.io`
URL de publicação: `https://sbseg26-wcia.github.io/`

## Histórico de escopo

A primeira versão deste documento previa três páginas: artigos aceitos,
estatísticas gerais e sugestões para apresentações. Durante a implementação, o
escopo foi reduzido por decisão do cliente para as sugestões apenas, com uma
referência à página oficial do WCIA.

Numa terceira rodada, o cliente pediu de volta a lista de artigos e as
estatísticas, agora com um motivo concreto que a referência sozinha não atende:
publicar, ao lado de cada artigo, o PDF do trabalho e o PDF dos slides da
apresentação, como fazem as páginas de programa do USENIX, e convidar as pessoas
autoras a enviarem seus slides. Um link para outra página não tem onde pendurar
esses arquivos.

A objeção anterior continua válida: copiar a lista cria divergência silenciosa no
dia em que a página oficial corrigir um nome. Três medidas a contêm, em vez de
evitá-la por omissão:

1. A seção informa a data da coleta e declara que, em caso de divergência, vale a
   página oficial.
2. Os dados vivem num arquivo só, `data/papers.json`, e não espalhados pelos três
   idiomas.
3. Nenhum percentual é copiado. Todos são derivados das contagens, e o total
   declarado na fonte serve de conferência automática contra a soma por tipo.

## 1. Objetivo

Publicar um site estático e trilíngue (português do Brasil, inglês e espanhol)
para o Workshop de Cibersegurança em IA (WCIA), realizado junto ao XXVI Simpósio
Brasileiro de Cibersegurança (SBSeg 2026), em Armação dos Búzios (RJ), de 01 a 04
de setembro de 2026.

O site cobre:

1. A lista dos 16 artigos aceitos, com um gancho para o PDF do artigo e um para o
   PDF dos slides de cada um.
2. Um convite às pessoas autoras para enviarem os slides da apresentação.
3. As estatísticas gerais do processo de avaliação.
4. As sugestões gerais para as apresentações, derivadas do material do SBSeg
   2024, com os créditos originais preservados.
5. Um espaço reservado para o template de slides próprio do WCIA, que ainda não
   existe.

## 2. Fonte de dados

| Fonte | Uso |
| --- | --- |
| `https://sbseg2024.ita.br/autores/sugestoes-para-apresentacoes/` | Texto integral das sugestões e a lista de colaboradores |
| `https://www.sbseg2026.uff.br/workshops/wcia/` | Dados do evento, coordenação, lista de artigos aceitos e estatísticas gerais |

O apêndice A congela a transcrição literal do material de origem, de forma que a
manutenção futura não dependa de nova coleta na web.

A coleta da lista de artigos e das estatísticas foi feita em 14 de agosto de
2026, e essa data fica registrada em `data/papers.json`, no campo `collected`, de
onde a página a exibe. Duas normalizações tipográficas foram aplicadas aos nomes
como estavam no sistema de submissão, e apenas elas:

* Caixa: "GUILHERME HENRIQUE VIEIRA DE ALENCAR", "Marcos paulo pereira da silva"
  e "inss" passaram a "Guilherme Henrique Vieira de Alencar", "Marcos Paulo
  Pereira da Silva" e "INSS".
* Acentuação: "Universidade de Brasilia" passou a "Universidade de Brasília".

Nada mais foi alterado. Afiliações ausentes continuam ausentes, e as grafias
divergentes de uma mesma instituição, como "Facti" e "FacTI", foram preservadas
como estão na fonte.

## 3. Decisões de arquitetura

### 3.1 Stack

HTML5, CSS e JavaScript vanilla. Sem framework, sem etapa de build, sem
dependências externas em tempo de execução. GitHub Pages serve os arquivos
diretamente do branch `main`, e um arquivo vazio `.nojekyll` desliga o
processamento Jekyll.

O site é mantido por coordenadores do workshop, não por desenvolvedores
dedicados. Corrigir um texto pela interface web do GitHub precisa ser suficiente.

### 3.2 Dado que não se traduz mora fora do i18n

Títulos de artigos, nomes de pessoas, contagens e URLs de PDF não mudam com o
idioma. Colocá-los nos arquivos de idioma criaria três cópias dos mesmos 16
registros, e a primeira correção feita em um só idioma já produziria divergência.

Por isso existe `data/papers.json`, carregado uma vez e reutilizado nos três
idiomas. Os arquivos de `i18n/` guardam apenas os rótulos ao redor: "Artigos
completos", "PDF dos slides", "Taxa de aceitação".

A consequência aceita é uma segunda requisição de rede. Ela falha de forma
isolada: sem os dados, as seções de artigos e de estatísticas exibem um aviso com
o link para a página oficial, e o resto da página, inclusive as dicas e a
calculadora, continua funcionando.

### 3.3 O português é a fonte da estrutura

Três arquivos de idioma, `i18n/pt.json`, `i18n/en.json` e `i18n/es.json`, contêm
todo o texto. O HTML não carrega texto de conteúdo.

A estrutura das seções vem exclusivamente do `pt.json`. O JavaScript monta as
seções a partir dele e sobrepõe as traduções por cima, campo a campo. Uma
tradução com um item faltando, ou com um item vazio, exibe o texto em português
naquela posição e registra um aviso no console.

Essa decisão nasceu de um defeito encontrado em teste. A versão anterior
resolvia a chave `sections` inteira de uma só vez, o que fazia o mecanismo de
fallback nunca ser consultado para o conteúdo interno do array: um item vazio no
espanhol renderizava um marcador em branco na página.

Pela mesma razão, os percentuais da divisão de tempo são lidos apenas do
`pt.json`. Das traduções aproveita-se somente o rótulo. Assim, um erro de edição
numa tradução não consegue fazer a soma das fatias sair de 100%.

### 3.4 Estrutura de arquivos

```
sbseg26-wcia.github.io/
├─ .nojekyll
├─ index.html
├─ assets/
│  ├─ css/style.css
│  ├─ js/app.js
│  └─ img/favicon.svg
├─ data/papers.json
├─ i18n/{pt,en,es}.json
├─ docs/superpowers/specs/
├─ LICENSE
└─ README.md
```

### 3.5 Mecanismo de internacionalização

* Elementos traduzíveis carregam `data-i18n="chave.aninhada"`, e o script
  substitui o `textContent`. Atributos usam `data-i18n-attr="aria-label:chave"`.
* Ordem de resolução do idioma: parâmetro `?lang=`, depois `localStorage`,
  depois `navigator.language`, e por fim português.
* Ao trocar de idioma, o script atualiza `document.documentElement.lang`, o
  `<title>`, a meta descrição, grava a escolha e reescreve a URL com
  `history.replaceState`, preservando `?lang=` para compartilhamento.
* Os `id` das seções vêm do `pt.json` e são iguais nos três idiomas, de modo que
  uma âncora compartilhada continua válida depois da troca de idioma.

Consequência aceita: o site depende de JavaScript, e um `<noscript>` informa o
leitor e mantém visível o link para a página oficial.

Consequência aceita: os JSON são carregados via `fetch`, o que exige servidor
HTTP. O README documenta `python3 -m http.server`.

## 4. Página

Página única, com os blocos nesta ordem:

1. Barra superior fixa, com a sigla WCIA e o seletor de idioma.
2. Hero: título, subtítulo e texto de abertura.
3. Artigos aceitos, com os ganchos de PDF e a nota de fonte.
4. Convite às pessoas autoras para o envio dos slides.
5. Estatísticas gerais.
6. Template de slides do WCIA.
7. Calculadora de divisão do tempo da apresentação.
8. Dicas gerais.
9. Dicas de conteúdo, com a demonstração comparativa de slide.
10. Dicas de preparação.
11. Créditos.
12. Rodapé.

Os artigos vêm antes das dicas porque são o que a pessoa autora procura primeiro,
e porque o convite para o envio dos slides só faz sentido logo depois de ela ver
o próprio artigo com o espaço dos slides ainda vazio.

Um índice lateral fixo acompanha a rolagem e destaca a seção visível.

### 4.1 Artigos aceitos

Os 16 artigos em dois grupos, completos e curtos, na mesma ordem da página
oficial, para que a comparação com a fonte seja direta. Cada entrada traz o
número dentro do grupo, o título, a autoria com as afiliações e dois ganchos de
arquivo, no estilo das páginas de programa do USENIX: o PDF do artigo e o PDF dos
slides.

O estado de cada gancho vem de um único campo em `data/papers.json`:

* URL preenchida: pílula sólida, que é um link.
* URL vazia: pílula tracejada com o texto "em breve", que não é um link.

O espaço reservado permanece visível de propósito. Removê-lo enquanto o arquivo
não existe esconderia justamente a informação que motiva o convite: falta enviar.

Cada artigo tem uma âncora estável, `#artigo-f1` a `#artigo-f12` e `#artigo-s1` a
`#artigo-s4`, derivada do `id` do registro, e não da posição na lista, para que um
link compartilhado sobreviva a uma reordenação.

O rodapé da seção informa a data da coleta, formatada no idioma ativo, declara
que a página oficial prevalece em caso de divergência e leva até ela.

### 4.2 Convite para o envio dos slides

Cartão com quatro instruções práticas: enviar depois da sessão, enviar em PDF e
não no formato de edição, nomear o arquivo de forma reconhecível e confirmar com
as pessoas coautoras que a versão pode ser publicada.

Tem os mesmos dois estados do template de slides, controlados por
`slidesCall.email` no `pt.json`: vazio exibe o aviso de que o endereço ainda será
publicado, preenchido troca o aviso por um botão `mailto:` com o assunto já
traduzido.

### 4.3 Estatísticas

Seis números em destaque, numa grade de fio de cabelo: submetidos, aceitos, taxa
de aceitação, membros do Comitê de Programa, autores únicos e instituições. São
respostas de um valor só, então são números grandes, e não gráfico.

Abaixo, duas barras de proporção de um total, uma para artigos completos e outra
para curtos. Cada barra tem apenas duas fatias, aceitos e não aceitos, separadas
por luminosidade, com um vão de 2 pixels que mostra a superfície da página entre
elas. A divisão interna dos não aceitos, entre rejeitados e retirados, fica na
legenda em texto: uma terceira cor para uma fatia de 2,7%, o artigo retirado,
seria ilegível. Cada fatia é rotulada na legenda, então a identidade nunca depende
só da cor, e a barra tem `role="img"` com um `aria-label` que enuncia os valores.

Nenhum percentual é copiado da fonte. Todos saem das contagens, formatados pelo
`Intl.NumberFormat` do idioma ativo: 32,4% em português e espanhol, 32.4% em
inglês. O total declarado em `stats.submitted` é conferido contra a soma por tipo
e, se divergir, o console avisa e a soma prevalece.

O plural de cada contagem é escolhido caso a caso, e não por uma regra única, para
que "1 retirado" não vire "1 retirados". Contagens em zero somem da legenda em vez
de aparecer como "0 retirados".

### 4.4 Template de slides

O template ainda não existe. A seção tem dois estados, controlados por um único
campo, `template.url` no `pt.json`:

* Vazio: exibe o aviso "em breve", sem botão.
* Preenchido: o aviso some e o botão de acesso aparece nos três idiomas.

A URL é lida apenas do `pt.json`, porque é a mesma nos três idiomas. Isso evita
que o link precise ser atualizado em três lugares.

### 4.5 Calculadora de tempo

Converte a divisão sugerida pelo material original, 30% para fundamentação, 15%
para objetivo e problema, 45% para contribuição e 10% para considerações, em
minutos concretos do slot informado.

Exibe também a janela de tolerância de 5%, que é a meta dos ensaios, a de 10%,
que é o limite que não deve ser ultrapassado, e a quantidade de slides de
referência.

A barra é uma proporção de um único total, com rampa sequencial de matiz única
ordenada por magnitude: a maior fatia é a mais escura. A identidade das fatias
nunca depende só de cor, porque cada uma é rotulada diretamente na legenda, com
rótulo, percentual e minutos. A barra tem `role="img"` e um `aria-label`
traduzido que enuncia todos os valores.

Os números seguem o idioma ativo via `Intl.NumberFormat`: "14,3" em português e
espanhol, "14.3" em inglês.

### 4.6 Créditos

Bloco destacado, nos três idiomas:

> Colaboradores: Diego Kreutz (UNIPAMPA), Marco A. Amaral Henriques (UNICAMP),
> Charles Christian Miers (UDESC), Cintia Borges Margi (USP), Rodrigo Brandão
> Mansilha (UNIPAMPA)

Com nota de origem informando que o material foi produzido para o SBSeg 2024 e
adaptado para o WCIA / SBSeg 2026, e link para a página original. A palavra
"Colaboradores" e a nota são traduzidas. Nomes próprios e siglas, não.

## 5. Direção visual

O conceito é que a página pratique o que ela ensina: tipografia grande, linha
curta, títulos em estilo manchete, pouca cor e destaque seletivo.

* Face de display em monoespaçada, corpo em pilha de fontes do sistema. Nenhuma
  requisição a servidores de fonte externos.
* Toda cor nasce em variáveis no `:root`, sem media query. O bloco de tema
  escuro apenas redefine os mesmos nomes. Nenhuma cor tem sua única definição
  dentro de uma media query.
* O único gesto decorativo é um marca-texto aplicado a uma frase por seção, o
  que cita uma das próprias dicas do material: destacar seletivamente em vez de
  colorir tudo.
* A demonstração comparativa de slide usa o exemplo do próprio texto de origem,
  contrapondo a frase transcrita do artigo à manchete "XPTO: desempenho 30%
  superior ao estado da arte".
* Alvos de toque de no mínimo 44 por 44 pixels, foco visível, `prefers-reduced-motion`
  respeitado e uma folha de impressão que esconde a navegação.

## 6. Tratamento de erros

* Chave ausente ou vazia no idioma ativo: usa o português e avisa no console.
* Falha ao carregar o dicionário do idioma: tenta o português. Se este também
  falhar, a página exibe uma mensagem de erro com link para a página oficial do
  WCIA, em vez de ficar vazia silenciosamente.
* Idioma inválido em `?lang=`: o valor é ignorado e a resolução segue a ordem
  normal, sem lançar exceção.
* Valor inválido ou fora da faixa na calculadora: é limitado à faixa de 5 a 90
  minutos, e um valor não numérico volta ao padrão de 20.
* Falha ao carregar `data/papers.json`: as seções de artigos e de estatísticas
  exibem um aviso com o link para a página oficial, o console registra o erro e o
  restante da página continua funcionando. A falha é isolada de propósito, porque
  as dicas e a calculadora não dependem desses dados.
* Total declarado divergente da soma por tipo nas estatísticas: o console avisa e
  a soma prevalece, já que é ela que alimenta as barras.
* Marcador `{desconhecido}` numa frase traduzida: fica como está, em vez de virar
  `undefined` na página.

## 7. Verificação executada

Não havia Node.js neste ambiente, e o Chrome headless disponível trava ao
encerrar, então a verificação foi montada em três frentes.

Análise estática, em Python:

1. Os três dicionários têm forma idêntica: mesmas chaves, mesmos `id` de seção,
   37 itens de primeiro nível, 41 subitens e 3 links em cada idioma.
2. As 43 chaves `data-i18n` presentes no `index.html` resolvem nos três idiomas.
3. Todos os `id` usados pelo `app.js` existem no `index.html`.
4. Nenhum `id` do `index.html` se repete nem colide com um `id` de seção vindo
   do JSON.
5. Os percentuais da divisão de tempo somam 100 nos três idiomas.

Execução do código real, com o `app.js` rodando sob o `jsc` do JavaScriptCore,
com um shim de DOM construído a partir do próprio `index.html`:

6. Renderização: 3 seções, 37 dicas, 13 listas de subitens, 7 itens de índice,
   4 fatias na barra, 4 itens de legenda e 2 slides de demonstração.
7. Calculadora com slot de 20 minutos: 6, 3, 9 e 2 minutos; tolerâncias de
   19 a 21 e de 18 a 22 minutos.
8. Calculadora com slot de 15 minutos: frações formatadas conforme o idioma,
   com vírgula em português e espanhol e ponto em inglês.
9. Limites do campo: 500 é reduzido a 90, e um valor não numérico volta a 20.
10. Índice: seção ativa correta em cinco posições de rolagem simuladas, do topo
    ao fim da página.
11. Troca de idioma para espanhol e inglês, com atualização de `html lang`,
    `<title>`, conteúdo das dicas e gravação da escolha.
12. `?lang=es` inicia em espanhol. `?lang=zz` é ignorado e a resolução recai
    sobre o idioma do navegador.
13. Com uma chave apagada e um item esvaziado no espanhol, ambos caem para o
    português e emitem aviso no console.

Renderização real, em Chrome headless, com medições feitas por uma página de
instrumentação temporária que carregava o site num iframe de 390 pixels:

14. Nenhum estouro horizontal: `scrollWidth` do documento igual ao
    `clientWidth`, e nenhum elemento ultrapassando a viewport, exceto o link de
    pulo, que fica fora da tela por design.
15. Posições das seções monotônicas e índice ativo correto no topo da página.
16. Conferência visual do tema claro, do tema escuro e da largura de 390 pixels,
    nos três idiomas.

Defeitos encontrados e corrigidos durante essa verificação:

* O fallback de tradução não alcançava o interior do array `sections`, o que
  fazia um item vazio renderizar um marcador em branco. Corrigido tratando o
  português como fonte da estrutura.
* O botão do template de slides aparecia mesmo marcado como `hidden`, porque
  `.btn { display: inline-flex }` vence a regra do navegador. Corrigido com uma
  regra explícita para `[hidden]`.
* A ordem do índice não correspondia à ordem dos blocos na página.
* O `<main>` usava `id="conteudo"`, o mesmo `id` da seção "Dicas de conteúdo"
  gerada pelo JSON, e `getElementById` devolvia o elemento errado, travando o
  destaque do índice. O `<main>` passou a usar `id="principal"`.
* O destaque do índice era calculado uma única vez, antes de o layout
  estabilizar. Passou a ser recalculado por um `ResizeObserver` no corpo.
* As três seções não tinham espaçamento entre si, porque o `gap` do contêner
  pai só separa filhos diretos e todas viviam dentro de um mesmo `div`.

Verificação que permanece pendente: o comportamento do índice durante rolagem
real. O Chrome headless deste ambiente não entrega eventos de `scroll` nem
quadros de `requestAnimationFrame` ao iframe, o que foi confirmado por
instrumentação. A lógica de decisão está coberta pelos testes sob o `jsc`, mas o
disparo por rolagem só pode ser confirmado num navegador comum.

### 7.1 Verificação da lista de artigos e das estatísticas

Análise estática, em Python, além das conferências anteriores:

17. Os três dicionários continuam com forma idêntica depois das chaves novas,
    sem chave faltando, sobrando ou vazia, exceto os dois ganchos de configuração,
    `template.url` e `slidesCall.email`.
18. As 52 chaves `data-i18n` do HTML e as 38 chaves usadas pelo `app.js`
    resolvem nos três idiomas.
19. Nenhum `id` gerado, incluindo os 16 `artigo-*`, colide com um `id` do HTML.
20. `data/papers.json` tem 16 artigos, 12 completos e 4 curtos, batendo com as
    contagens de `stats`; aceitos, rejeitados e retirados somam os submetidos em
    cada tipo; e a soma por tipo bate com o total declarado.
21. Os percentuais derivados reproduzem exatamente os publicados na página
    oficial: 33,3% no geral, 32,4% nos completos e 36,4% nos curtos.
22. Todo marcador `{x}` presente nos três idiomas está entre os fornecidos pelo
    código.

Execução do código real sob o `jsc`, com o shim de DOM:

23. 16 artigos renderizados em 2 grupos, com 32 ganchos de arquivo, todos no
    estado "em breve" enquanto as URLs estão vazias, e nenhum link de PDF.
24. Âncoras `artigo-f1` e `artigo-s1` corretas, e a numeração recomeça em 1 no
    grupo dos curtos.
25. Seis cartões de número com os valores 48, 16, 33,3%, 45, 135 e 39, e as duas
    barras com fatias proporcionais a 12 e 25, e a 4 e 7.
26. Plural correto por contagem: "24 rejeitados · 1 retirado" nos completos, e
    apenas "7 rejeitados" nos curtos, sem menção a retirados, que são zero.
27. Data da coleta formatada por idioma: "14 de agosto de 2026", "August 14,
    2026" e "14 de agosto de 2026".
28. Na troca de idioma, os títulos dos artigos não são traduzidos, os rótulos
    são, os separadores decimais acompanham o idioma e `data/papers.json` não é
    buscado de novo.
29. Com `data/papers.json` indisponível, as duas seções exibem o aviso com o link
    oficial, o console registra exatamente um erro, e as 37 dicas, a calculadora e
    o índice continuam íntegros.
30. Com `slidesCall.email` preenchido, o aviso "em breve" some e o botão vira um
    `mailto:` com o assunto traduzido e codificado.
31. O índice tem 9 entradas, na ordem dos blocos da página, e toda âncora tem
    destino no DOM.

Renderização real em Chrome headless, pela mesma página de instrumentação:

32. Em 390 pixels, `scrollWidth` igual a `clientWidth` e nenhum elemento
    estourando a viewport, com os 16 artigos, os 32 ganchos, os 6 cartões e as 2
    barras presentes.
33. Posições das nove seções monotônicas, na ordem projetada.
34. Conferência visual da lista, dos cartões de número e das barras nos temas
    claro e escuro, em 390 e em 1000 pixels.

Defeito encontrado e corrigido nesta rodada:

* A nota do WAvg saía como "superior a 8", e não "8,0", porque o formatador
  suprimia a casa decimal zero. O `num()` ganhou um modo que preserva as casas.

Ponto conhecido, anterior a esta mudança e não alterado aqui: os botões de idioma
têm 38 pixels de altura, abaixo dos 44 declarados na seção 5. As pílulas de
arquivo dos artigos, que são novas, respeitam os 44.

## 8. Publicação

O repositório é um site de organização, então o conteúdo do branch `main` é
publicado na raiz do domínio. Nenhum workflow do GitHub Actions é necessário.

## 9. Fora de escopo

* Hospedagem dos PDFs em si. O site reserva o lugar e o link; os arquivos entram
  depois, quando existirem.
* Endereços de e-mail das pessoas autoras. O convite pede o envio para a
  coordenação, e não expõe contato de ninguém.
* Programação detalhada das sessões, com dia e horário de cada apresentação.
* Formulário de contato, upload de arquivos ou qualquer coleta de dados de
  visitantes. O envio dos slides é por e-mail, fora do site.
* Geração do template de slides do WCIA. O site apenas reserva o espaço.
* Sincronização automática com a página oficial. A atualização é manual, e a data
  da coleta fica visível para que a defasagem seja perceptível.

---

## Apêndice A: conteúdo integral das sugestões (SBSeg 2024)

Transcrição literal da fonte, base para `i18n/pt.json` e para as traduções.

### Introdução

Este documento foi criado para oferecer um conjunto de ideias e sugestões, além
de referências úteis, que podem ajudar na preparação de apresentações de alta
qualidade para os trabalhos aceitos.

Aqui você encontrará dicas práticas para uma boa apresentação. Os exemplos seguem
boa parte das dicas oferecidas e são de livre uso pelos autores.

### Dicas gerais

* Utilize slides clean, preferencialmente com fundo branco e texto preto.
* Não exagere na quantidade de cores, exceto se for absolutamente necessário para
  diferenciar dados em gráficos.
* Use esquemas de cores que tenham bom contraste. Leitura recomendada:
  * `https://www.thinkoutsidetheslide.com/choosing-colors-for-your-presentation-slides/`
  * `https://presentationteam.com/psychology-of-color-in-powerpoint-presentations/`
  * `https://visme.co/blog/how-to-choose-a-color-scheme/`
* Dedique tempo e energia à qualificação do conteúdo dos slides.
* Use os slides apenas como um guia para sua fala, evitando sobrecarregá-los com
  informações.
* Não fique só lendo os slides, pois isso passa uma impressão muito ruim de
  despreparo: ao ver o novo slide, o conteúdo já despontará em sua cabeça e você
  poderá elaborar sobre o mesmo sem precisar ficar lendo.
* Não deixe de olhar para o público: isso é muito importante. A apresentação não é
  para você, para a tela, para o computador, para o chão, para o teto e nem para
  as paredes: é para o público. Se for tímido ou tímida, basta ficar mudando o
  olhar de um lugar para outro da plateia, ou um pouquinho acima da cabeça das
  pessoas em um ponto no fundo da sala.
* Treine sua apresentação para garantir que você respeite o tempo estabelecido
  pelo evento, em pé e falando alto.
* Inclua numeração nos slides, pois facilita discussões ou perguntas.
* Faça várias iterações de melhoria nos slides. Assim como um bom texto, uma boa
  apresentação demanda trabalho e ciclos de refinamento.
* Inspire-se em bons exemplos de outras apresentações.
* Experimente fugir do clássico. Em vez de começar com o tradicional slide de
  roteiro, considere iniciar com uma motivação forte ou uma problemática
  relevante. Muitas vezes isso torna a apresentação mais envolvente e fluida.
* Lembre-se de que a finalidade de uma apresentação é fazer com que quem está
  assistindo possa compreender uma ideia, consiga entender os seus argumentos e a
  sua linha de raciocínio. Se ao final da apresentação isso não for atingido,
  então a apresentação foi falha. Apresentar um trabalho é um ato de fazer a
  plateia entender os seus argumentos, não necessariamente que concordem com as
  informações apresentadas.

### Dicas de conteúdo

* Quantos slides fazer? Não há uma resposta única. Algumas pessoas falam em torno
  de um slide por minuto. Porém, isso pode variar de acordo com o conteúdo dos
  slides e o que o apresentador deseja explicar. Slides com muito texto tendem a
  consumir mais tempo e a ser menos motivacionais para a plateia durante a
  apresentação.
* Evite blocos de texto, como parágrafos e frases longas:
  * Prefira itens curtos e diretos, que sirvam apenas como guia para sua fala.
  * Não faça transcrição de sentenças ou parágrafos do texto para slides.
  * Evite sentenças completas com artigo, adjetivo, sujeito, preposição, verbo,
    objetos direto e indireto. Isso é para textos, não para slides.
  * A melhor forma de passar o conteúdo de maneira simples e direta é se inspirar
    em manchetes de jornal. Por exemplo, em vez de escrever "O novo sistema XPTO
    desenvolvido neste trabalho teve um desempenho que superou em 30% a melhor
    versão da literatura", procure criar uma manchete como "XPTO: desempenho 30%
    superior ao estado da arte", e complemente com detalhes na sua fala, a qual
    poderá conter sentenças mais completas e explicativas.
* Use fontes grandes, muito grandes:
  * Preferencialmente 24pt ou maior para o conteúdo dos slides, imagens e tabelas.
  * Títulos dos slides devem ter 32pt ou mais.
  * Não deixe muito espaço em branco em seus slides: se há espaço em branco, é
    porque você pode estar com fontes ou figuras que poderiam ser maiores e
    ocupar um espaço super nobre que não está sendo devidamente aproveitado.
  * Observe que isso não significa encher o slide com conteúdo excessivo.
* Utilize boas imagens:
  * Prefira imagens significativas, representativas e de alta qualidade.
  * Dê preferência a imagens vetoriais ou de alta definição, por exemplo SVG, PNG
    e PDF.
  * Se, ao fazer um zoom, seu slide apresenta fontes ou figuras borradas ou com
    artefatos quadriculados, considere trocar por uma versão de mais alta
    definição ou vetorial.
  * Figuras baseadas em copiar e colar regiões de tela são as piores alternativas
    e devem ser evitadas.
* Melhore a apresentação das tabelas:
  * Reconstrua tabelas complexas para que fiquem mais claras nos slides.
  * Nem sempre é necessário mostrar a tabela completa. Apresente apenas os dados
    mais relevantes.
  * Nem sempre é necessário mostrar todas as tabelas e dados de seu artigo. É
    melhor explicar bem e com calma os dados mais relevantes do que tentar
    mostrar tudo de forma corrida e pouco compreensível.
  * Exiba tabelas e imagens de forma progressiva nos slides, destacando com
    círculos, retângulos ou setas as partes que estão sendo explicadas.
* Use técnicas simples para destacar e explicar gradualmente imagens e gráficos:
  * Por exemplo, use um retângulo branco ou parcialmente transparente para cobrir
    partes da imagem que serão explicadas depois, ou distribua o conteúdo do
    slide em vários outros, acrescentando conteúdo a cada novo slide apresentado.
  * É muito importante que você conquiste e mantenha cativa a atenção do público
    para o ponto que estiver explicando: se o slide tiver muita informação, texto
    ou figuras, boa parte do público poderá estar tentando ler e entender partes
    diferentes da que você está explicando.
* Apesar de recomendável, não é obrigatório colocar títulos em todos os slides:
  * Em alguns casos, aumentar o tamanho da imagem ou da tabela pode ser mais
    eficaz do que incluir um título.
* Evite sobrecarregar os slides:
  * Muito conteúdo, seja em forma de texto ou de imagens e tabelas complexas,
    pode distrair o público. É fundamental selecionar cuidadosamente o que será
    apresentado em cada slide. Menos é mais.
  * Se há várias imagens em um mesmo slide, considere dividi-las em mais slides a
    fim de aumentar o tamanho e a inteligibilidade delas e a fim de manter o foco
    do público na imagem que você está explicando.
* Escolha seletivamente o conteúdo mais relevante a apresentar dentro do tempo
  disponível:
  * Foque no problema, na solução, nos desafios e nos resultados.
  * Apresentar um contexto longo é pouco relevante. Você poderá perder a atenção
    do público no meio do caminho.
  * Não é necessário gastar tempo justificando a sua pesquisa, pois basta
    apresentar claramente o problema que está sendo resolvido.
  * É recomendado não gastar muito tempo nos trabalhos relacionados.
* Procure enumerar os seus slides. A numeração possui dois propósitos principais:
  * Facilitar que a plateia faça anotações e possa direcionar melhor as perguntas.
  * Como apresentador, se você treinou, pode controlar o seu tempo de apresentação
    e saber se está no tempo correto, adiantado ou atrasado.

### Dicas de preparação

* Visualize sua apresentação em um celular a 50 cm de distância:
  * Se tudo estiver legível e compreensível, seus slides estarão bem preparados
    para diferentes ambientes.
* Realize pelo menos duas revisões do conteúdo da apresentação com seus coautores.
* Planeje sua apresentação dentro do tempo estipulado no slot da sua apresentação
  no evento.
* Se tiver dúvidas sobre o tempo, contate o chair da sua trilha ou evento.
* Algumas pessoas sugerem que se prepare um slide por minuto de apresentação,
  excluindo as capas inicial e final. Essa dica é boa, mas deve ser tomada com
  cuidado, pois ela é mais precisa para apresentações mais curtas. Nas mais longas
  as pessoas acabam relaxando e gastando mais de um minuto por slide.
* Se ficar muito tempo, dois minutos ou mais, falando de um mesmo slide,
  provavelmente ele está com conteúdo demais e deve ser dividido em dois ou três
  outros. É muito maçante para o público ficar ouvindo uma apresentação que quase
  não troca o slide.
* Também não é nada bom que a pessoa fique falando de um monte de coisas que não
  estão cobertas pelo slide. O público fica facilmente perdido se não encontra no
  slide o suporte para o que está sendo falado. Não é para ficar lendo só o que
  está no slide, e é sempre bom complementar com algumas frases mais elaboradas,
  mas não ao ponto de passar informações fundamentais só pela fala, isto é, sem
  estar presente no slide.
* Respeite, respeite e respeite o tempo que lhe foi alocado: tenha como meta nos
  ensaios uma tolerância de 5% do tempo alocado, sem incluir tempo de perguntas,
  para terminar antes ou depois do prazo. Normalmente os presidentes de sessão
  toleram um pouco mais que isso se for necessário, mas não devemos jamais
  ultrapassar a marca de 10% de tolerância, para mais ou para menos, no momento
  da apresentação. Podemos perder o direito a concluir ou perder uma ótima
  oportunidade de passar nosso recado.
* Um dos problemas mais comuns e constrangedores em apresentações ocorre quando a
  pessoa não termina ao final de seu tempo, obrigando o presidente da sessão a
  interrompê-la sem que ela tenha concluído, ou quando a pessoa termina muito
  antes do tempo que lhe foi alocado. O primeiro caso mostra um certo desprezo
  pelas regras e um desrespeito aos organizadores e ao público. O segundo caso
  mostra também um desprezo pelo tempo, de ouro, que lhe foi concedido e não
  aproveitado.
* Tipicamente a sua contribuição está na parte final do artigo, logo essa deve ser
  a maior parte do tempo. Uma boa sugestão de divisão do tempo da apresentação:
  * Em torno de 30% do tempo para a fundamentação.
  * Em torno de 15% do tempo para definição do objetivo ou do problema.
  * Em torno de 45% do tempo para sua contribuição, principalmente discussão de
    resultados, limitações e contribuições.
  * Em torno de 10% para considerações, trabalhos futuros e agradecimentos.
* Treine pelo menos cinco vezes a apresentação para ajudar seu cérebro a:
  * Fixar o conteúdo.
  * Ficar mais tranquilo.
  * Criar uma sequência lógica e natural para a apresentação.
* A falta de ensaios de uma apresentação é facilmente percebida pelo público, pois:
  * O apresentador gagueja.
  * Para muitas vezes para pensar no que vai falar.
  * Repete coisas já faladas, pois acha que encontrou uma forma melhor de explicar
    o que já deveria ter ficado claro antes.
  * Não consegue passar a mensagem mais relevante do artigo dentro do tempo
    disponível.
  * Pode ser interrompido antes de terminar por exceder o tempo alocado.
  * Pode ficar sem tempo disponível para perguntas e discussões, que são alguns
    dos objetivos e benefícios mais importantes de uma apresentação.
* A experiência mostra que somente a partir do quinto ou sexto ensaio é que o
  discurso da apresentação fica fluido, bem organizado, sem redundâncias e mais
  fácil de acompanhar.
* Se puder, grave vídeo ou áudio de seus ensaios e ouça algum tempo depois.
  Perceberá alguns pontos a melhorar que não ficaram tão claros durante a
  gravação.

### Colaboradores

Diego Kreutz (UNIPAMPA), Marco A. Amaral Henriques (UNICAMP), Charles Christian
Miers (UDESC), Cintia Borges Margi (USP), Rodrigo Brandão Mansilha (UNIPAMPA).

---
