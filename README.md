# Site do WCIA / SBSeg 2026

Retrospectiva da **primeira edição** do Workshop de Cibersegurança em IA
(WCIA), realizado junto ao XXVI Simpósio Brasileiro de Cibersegurança
(SBSeg 2026), em Armação dos Búzios (RJ), de 01 a 04 de setembro de 2026. O
workshop ocupou a manhã de 1º de setembro.

Publicado em <https://wcia-sbseg26.github.io/>.

A página reúne o agradecimento às pessoas que fizeram a primeira edição, o
vídeo de encerramento, a galeria de fotos e clipes do dia, a programação
realizada, os artigos aceitos, as estatísticas do processo de avaliação, o
Comitê de Programa e o material de apoio para as apresentações.

A fonte dos artigos, da programação, das estatísticas e do Comitê de Programa é
a página oficial do workshop,
<https://www.sbseg2026.uff.br/workshops/wcia/>. Os dados são reproduzidos aqui
para que cada artigo tenha, ao lado, o link do PDF do trabalho e o PDF dos
slides da apresentação, como fazem as páginas de programa do USENIX. A data da
coleta aparece no rodapé de cada seção, e em caso de divergência vale a página
oficial.

O site está em português, inglês e espanhol.

## Rodar localmente

Os textos e os dados são carregados via `fetch`, então abrir o `index.html` com
duplo clique não funciona: o navegador bloqueia a requisição por ser `file://`.
Use um servidor HTTP:

```sh
python3 -m http.server 8000
```

Depois abra <http://127.0.0.1:8000/>.

## Estrutura

```
.
├─ index.html              Página única
├─ assets/
│  ├─ css/style.css        Estilos e tokens de cor (tema claro e escuro)
│  ├─ js/app.js            Idiomas e todos os blocos gerados a partir do JSON
│  ├─ img/favicon.svg
│  └─ fotos/               Galeria tratada para a web e pôsteres dos vídeos
├─ data/
│  ├─ papers.json          Artigos aceitos e contagens da avaliação
│  ├─ event.json           Programação, Comitê de Programa, coordenações
│  └─ gallery.json         Fotos, clipes e o vídeo de encerramento
├─ i18n/
│  ├─ pt.json              Português, e fonte da estrutura
│  ├─ en.json              Inglês
│  └─ es.json              Espanhol
├─ video/                  Vídeo de encerramento e clipes da galeria
├─ .nojekyll               Desliga o Jekyll do GitHub Pages
└─ docs/superpowers/specs/ Documento de design
```

## Como editar o conteúdo

O conteúdo vive em dois lugares, e a divisão é simples:

* **`i18n/*.json`**: tudo o que é texto e muda de idioma para idioma. Títulos de
  seção, rótulos, avisos, agradecimentos, legendas das fotos, as dicas.
* **`data/*.json`**: tudo o que não se traduz. Títulos dos artigos, nomes das
  pessoas, contagens, horários, URLs e caminhos de arquivo. São três arquivos,
  um por assunto, usados nos três idiomas, porque três cópias dos mesmos
  registros divergiriam com o tempo.

O HTML não contém texto de conteúdo, apenas a estrutura da página.

### Publicar o PDF de um artigo ou dos slides

Em `data/papers.json`, cada artigo tem dois campos vazios:

```json
{
  "id": "f4",
  "title": "Avaliação de Táticas de Red Teaming Automatizado…",
  "paperUrl": "",
  "slidesUrl": "https://wcia-sbseg26.github.io/slides/silva-red-teaming-slms.pdf"
}
```

Preencher a URL basta: a pílula "em breve" vira um link nos três idiomas. Deixar
vazio mantém o lugar do arquivo visível e marcado como "em breve", o que também
serve de lembrete para quem ainda não enviou.

Para hospedar os PDFs no próprio site, crie uma pasta `slides/` na raiz do
repositório e use caminhos relativos, por exemplo `slides/silva-slms.pdf`.

### Endereço para o envio dos slides

Enquanto `slidesCall.email` estiver vazio em `i18n/pt.json`, o convite mostra um
aviso de que o endereço ainda será publicado. Ao preencher:

```json
"slidesCall": {
  "email": "wcia2026@exemplo.org"
}
```

o botão de envio aparece nos três idiomas, já com o assunto da mensagem
traduzido. Como a URL do template, o endereço é lido apenas do `pt.json`, porque
é o mesmo nos três idiomas.

### Atualizar as estatísticas

O bloco `stats` de `data/papers.json` guarda apenas contagens. Os percentuais,
inclusive a taxa de aceitação, são calculados a partir delas, para que não
exista um segundo número capaz de divergir. Se `stats.submitted` deixar de bater
com a soma de `full.submitted` e `short.submitted`, a página avisa no console do
navegador e usa a soma.

Duas contagens do comitê convivem de propósito: `stats.pcMembers` são as pessoas
que participaram efetivamente da avaliação e `stats.pcListed` é o tamanho da
lista publicada. A seção do Comitê de Programa cita as duas na mesma frase, e a
lista em si vem de `data/event.json`.

### Programação

`data/event.json` guarda a programação em blocos de horário. Cada sessão aponta
para os artigos pelo `id` usado em `data/papers.json`:

```json
{ "kind": "session", "session": "sessao1", "number": 1,
  "papers": ["f5", "f7", "f11", "f12", "s1", "s2"] }
```

Título e autoria vêm do registro do artigo, e o título linka para a entrada
completa mais abaixo na página. Um `id` citado na programação e ausente em
`papers.json` é ignorado, com aviso no console. Os títulos das sessões são texto
e ficam em `program.sessions` nos três idiomas, indexados pela mesma chave
(`sessao1`, `sessao2`, `sessao3`).

Os tipos de artigo mostrados na programação vêm do campo `type` de
`papers.json`, que segue a lista oficial de artigos aceitos. A página oficial
classifica "Jogos de Sinalização para Agentes de IA Comprometidos" como completo
na lista de aceitos e como curto na tabela da programação; aqui vale a lista de
aceitos, e a seção diz isso em nota.

### Galeria e vídeos

`data/gallery.json` tem duas partes. A primeira é o vídeo de encerramento:

```json
"closing": {
  "src": "video/wcia2026_encerramento.mp4",
  "poster": "assets/fotos/encerramento-poster.jpg",
  "duration": 103, "bytes": 26849059,
  "version": 1, "published": "2026-09-09"
}
```

A duração e o tamanho alimentam o rótulo do botão de download, e `published`
alimenta o aviso de versão. Ao publicar uma versão nova do vídeo, troque o
arquivo, atualize `bytes`, `duration`, `published` e incremente `version`.

A segunda parte é a lista de itens da galeria, fotos e clipes na ordem em que
aparecem. Cada item declara as próprias dimensões:

```json
{ "id": "g03", "kind": "photo",
  "full": "assets/fotos/g03.jpg", "thumb": "assets/fotos/g03-t.jpg",
  "w": 1280, "h": 960 }
```

As dimensões não são decorativas: elas definem a proporção da moldura antes de a
imagem chegar, o que evita o pulo de layout enquanto a galeria carrega.

As legendas são texto e ficam em `gallery.captions` nos três idiomas, indexadas
pelo `id` do item. Indexar por id, e não por posição, permite inserir uma foto no
meio da galeria sem deslocar todas as legendas seguintes. Uma legenda que falte
no idioma ativo cai no português, e um item sem legenda nenhuma entra com um
texto alternativo genérico, sempre com aviso no console.

Os originais das fotos ficam fora do repositório, em `fotos_do_evento/`, que está
no `.gitignore`. O que se publica são as versões tratadas: no máximo 1600px no
lado maior para a ampliação, 760px para a miniatura, JPEG progressivo e sem EXIF,
o que também remove coordenadas de GPS e identificação de aparelho das fotos
enviadas por participantes.

### Textos traduzidos

**O `pt.json` é a fonte da estrutura.** O `app.js` monta as seções a partir dele
e sobrepõe as traduções por cima. Na prática:

* Para **adicionar uma dica**, acrescente o item em `pt.json` e depois o item na
  mesma posição em `en.json` e `es.json`.
* Se um item faltar ou estiver vazio numa tradução, a página mostra a versão em
  português no lugar e registra um aviso no console do navegador. A página nunca
  fica com um marcador em branco.
* A mesma regra vale para as listas `slidesCall.items`, `stats.notes` e
  `thanks.groups`: quantos itens existem é o `pt.json` que decide. Em
  `thanks.groups`, que é uma lista de objetos, a queda para o português acontece
  campo a campo.
* Os percentuais da divisão de tempo (`timer.parts[].share`) são lidos apenas do
  `pt.json`. Nas traduções, só o `label` é usado. Isso evita que a soma saia de
  100% por um erro de edição.
* As frases com `{marcadores}`, como `stats.notes` e `program.text`, podem
  reordenar os marcadores livremente na tradução, porque eles são nomeados. Um
  marcador desconhecido é deixado como está, em vez de virar `undefined`.

### Publicar o template de slides

Quando o template de slides do WCIA existir, preencha **um único campo**, em
`i18n/pt.json`:

```json
"template": {
  "url": "https://docs.google.com/presentation/d/..."
}
```

O aviso "em breve" some sozinho e o botão de acesso aparece nos três idiomas.
Não é preciso mexer no `en.json` nem no `es.json`, porque a URL é a mesma.

## Idiomas

A ordem de resolução do idioma é:

1. O parâmetro `?lang=pt`, `?lang=en` ou `?lang=es` na URL.
2. A escolha anterior da pessoa, guardada em `localStorage`.
3. O idioma do navegador.
4. Português, como padrão.

A URL é reescrita com o idioma ativo, então um link copiado da barra de endereço
abre no mesmo idioma para quem receber.

## Publicação

O repositório é um site de organização do GitHub Pages, então o conteúdo do
branch `main` é publicado na raiz do domínio. Não há etapa de build nem workflow
do GitHub Actions: um `git push` basta.

Os vídeos são servidos como arquivos estáticos do próprio Pages. Estão em H.264
com áudio AAC e com o átomo `moov` no início do arquivo, o que permite ao
navegador começar a tocar antes de terminar o download. O vídeo de encerramento
entra na página com `preload="metadata"`, para que quem só veio ver as fotos não
baixe os 26 MB sem pedir.

## Créditos

O conteúdo das sugestões foi originalmente produzido para o SBSeg 2024 e
adaptado para o WCIA / SBSeg 2026.

Colaboradores: Diego Kreutz (UNIPAMPA), Marco A. Amaral Henriques (UNICAMP),
Charles Christian Miers (UDESC), Cintia Borges Margi (USP), Rodrigo Brandão
Mansilha (UNIPAMPA).

Fotos e vídeos do evento registrados por participantes do WCIA 2026.

Versão original: <https://sbseg2024.ita.br/autores/sugestoes-para-apresentacoes/>
