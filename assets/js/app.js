/* ==========================================================================
   WCIA / SBSeg 2026: i18n e retrospectiva da primeira edição. Agradecimentos,
   vídeo de encerramento, galeria, programação realizada, artigos aceitos,
   estatísticas, Comitê de Programa, dicas e calculadora de tempo.

   Sem dependências. Os textos vivem em i18n/<lang>.json e os dados que não se
   traduzem ficam em três arquivos, separados por assunto:
     data/papers.json   artigos aceitos e contagens do processo de avaliação
     data/event.json    programação realizada, Comitê de Programa, coordenações
     data/gallery.json  fotos, clipes e o vídeo de encerramento
   ========================================================================== */

(function () {
  'use strict';

  var LANGS = ['pt', 'en', 'es'];
  var FALLBACK = 'pt';
  var STORAGE_KEY = 'wcia-lang';
  var SOURCE_URL = 'https://www.sbseg2026.uff.br/workshops/wcia/';

  /* pt-BR só no atributo lang do documento, para leitores de tela e para o
     Intl. O código curto continua sendo "pt" na URL e no armazenamento. */
  var HTML_LANG = { pt: 'pt-BR', en: 'en', es: 'es' };
  var LOCALE    = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

  var dicts = {};      // cache: código do idioma -> dicionário
  var current = null;  // dicionário ativo
  var lang = FALLBACK;

  /* Cada arquivo de dados falha por conta própria: se um não carregar, só a
     seção correspondente mostra o aviso, e o resto da página continua de pé. */
  var data = null;      // data/papers.json
  var eventData = null; // data/event.json
  var gallery = null;   // data/gallery.json

  /* --- utilidades ------------------------------------------------------- */

  function get(obj, path) {
    var parts = path.split('.');
    var node = obj;
    for (var i = 0; i < parts.length; i++) {
      if (node == null || typeof node !== 'object') return undefined;
      node = node[parts[i]];
    }
    return node;
  }

  /* Busca a chave no idioma ativo e, se faltar, no português. Uma tradução
     incompleta degrada para PT em vez de deixar um buraco na página. */
  function t(path) {
    var value = get(current, path);
    if (value === undefined || value === null || value === '') {
      var alt = get(dicts[FALLBACK], path);
      if (alt !== undefined && alt !== null && alt !== '') {
        console.warn('[i18n] chave ausente em "' + lang + '": ' + path);
        return alt;
      }
      console.warn('[i18n] chave inexistente: ' + path);
      return '';
    }
    return value;
  }

  /* O português é a fonte da estrutura, os outros idiomas só sobrepõem texto.
     Sem isso, uma tradução com um item faltando ou vazio renderiza um marcador
     em branco, já que t() resolve o array "sections" inteiro de uma só vez. */
  function pick(value, fallbackValue, path) {
    if (value === undefined || value === null || value === '') {
      if (path) console.warn('[i18n] usando PT em "' + lang + '": ' + path);
      return fallbackValue;
    }
    return value;
  }

  function mergedSections() {
    var base = get(dicts[FALLBACK], 'sections') || [];
    var active = get(current, 'sections') || [];

    return base.map(function (bs, si) {
      var as = active[si] || {};
      var where = 'sections[' + si + ']';

      return {
        id: bs.id,
        eyebrow: pick(as.eyebrow, bs.eyebrow, where + '.eyebrow'),
        title: pick(as.title, bs.title, where + '.title'),
        items: (bs.items || []).map(function (bi, ii) {
          var ai = (as.items || [])[ii] || {};
          var at = where + '.items[' + ii + ']';
          return {
            text: pick(ai.text, bi.text, at + '.text'),
            demo: bi.demo,
            children: (bi.children || []).map(function (bc, ci) {
              return pick((ai.children || [])[ci], bc, at + '.children[' + ci + ']');
            }),
            links: (bi.links || []).map(function (bl, li) {
              var al = (ai.links || [])[li] || {};
              return { label: pick(al.label, bl.label, at + '.links[' + li + ']'), url: bl.url };
            })
          };
        })
      };
    });
  }

  /* Os percentuais são dado canônico e vêm sempre do PT, só os rótulos são
     traduzidos. Isso impede que um erro de tradução faça a soma sair de 100. */
  function mergedParts() {
    var base = get(dicts[FALLBACK], 'timer.parts') || [];
    var active = get(current, 'timer.parts') || [];
    return base.map(function (bp, i) {
      var ap = active[i] || {};
      return { label: pick(ap.label, bp.label, 'timer.parts[' + i + '].label'), share: bp.share };
    });
  }

  /* Mesma regra dos outros arrays: o português define quantos itens existem, a
     tradução só substitui o texto de cada posição. */
  function mergedList(path) {
    var base = get(dicts[FALLBACK], path) || [];
    var active = get(current, path) || [];
    return base.map(function (item, i) {
      return pick(active[i], item, path + '[' + i + ']');
    });
  }

  /* Versão da regra acima para listas de objetos, como thanks.groups: o
     português decide quantos blocos existem e quais campos cada um tem, e a
     tradução substitui campo a campo. Um campo faltando cai no português em
     vez de renderizar um título ou um parágrafo vazio. */
  function mergedRecords(path, fields) {
    var base = get(dicts[FALLBACK], path) || [];
    var active = get(current, path) || [];
    return base.map(function (item, i) {
      var alt = active[i] || {};
      var out = {};
      fields.forEach(function (field) {
        out[field] = pick(alt[field], item[field], path + '[' + i + '].' + field);
      });
      return out;
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /* Com exact, o número mantém as casas decimais mesmo quando são zero: a nota
     do WAvg é "8,0" na fonte oficial, e "8" seria uma precisão diferente. */
  function num(value, decimals, exact) {
    try {
      return new Intl.NumberFormat(LOCALE[lang], {
        minimumFractionDigits: exact ? decimals : 0,
        maximumFractionDigits: decimals === undefined ? 1 : decimals
      }).format(value);
    } catch (e) {
      return String(value);
    }
  }

  /* Substitui {chave} pelo valor correspondente. Os marcadores são nomeados, e
     não posicionais, para que uma tradução possa reordenar a frase. */
  function format(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (whole, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : whole;
    });
  }

  /* "1 retirado" e "24 rejeitados" exigem formas diferentes em português,
     espanhol e inglês, então cada contagem escolhe a sua. */
  function plural(value, oneKey, manyKey) {
    return num(value, 0) + ' ' + t(value === 1 ? oneKey : manyKey);
  }

  function percent(part, total) {
    return num(total ? (part / total) * 100 : 0, 1) + '%';
  }

  function findPaper(id) {
    var list = (data && data.papers) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    console.warn('[dados] artigo citado na programação e ausente em papers.json: ' + id);
    return null;
  }

  function formatDate(iso) {
    var bits = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!bits) return String(iso || '');

    /* Componentes locais, e não new Date(iso): a string ISO curta é lida como
       meia-noite UTC e, a oeste de Greenwich, voltaria um dia no calendário. */
    var date = new Date(+bits[1], +bits[2] - 1, +bits[3]);
    try {
      return new Intl.DateTimeFormat(LOCALE[lang], {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(date);
    } catch (e) {
      return String(iso);
    }
  }

  /* Bloco de erro para quando data/papers.json não carrega: a página nunca fica
     com um buraco silencioso, e o caminho para a fonte oficial continua aberto. */
  function dataError(key) {
    var box = el('div', 'card card--error');
    box.appendChild(el('p', 'card__text', t(key)));
    var link = el('a', 'btn btn--quiet', t('papers.sourceCta'));
    link.href = SOURCE_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    box.appendChild(link);
    return box;
  }

  /* --- resolução do idioma ---------------------------------------------- */

  function normalize(value) {
    if (!value) return null;
    var short = String(value).toLowerCase().slice(0, 2);
    return LANGS.indexOf(short) !== -1 ? short : null;
  }

  function resolveLang() {
    var fromUrl = normalize(new URLSearchParams(location.search).get('lang'));
    if (fromUrl) return fromUrl;

    var stored = null;
    try { stored = normalize(localStorage.getItem(STORAGE_KEY)); } catch (e) { /* modo privado */ }
    if (stored) return stored;

    var nav = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (var i = 0; i < nav.length; i++) {
      var hit = normalize(nav[i]);
      if (hit) return hit;
    }
    return FALLBACK;
  }

  function load(code) {
    if (dicts[code]) return Promise.resolve(dicts[code]);
    return fetch('i18n/' + code + '.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) { dicts[code] = json; return json; });
  }

  /* Os dados são carregados uma vez só e servem aos três idiomas: títulos,
     autoria, contagens, nomes do comitê e caminhos de arquivo não se traduzem,
     e mantê-los fora do i18n evita três cópias dos mesmos registros divergindo
     com o tempo. */
  function loadJson(url) {
    return fetch(url, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  /* Cada arquivo é uma promessa independente que nunca rejeita: o valor vira
     null e a seção correspondente cai no seu próprio bloco de erro. Assim uma
     galeria fora do ar não derruba a lista de artigos, e vice-versa. */
  function loadOptional(url, assign) {
    return loadJson(url).then(assign, function (err) {
      console.error('[dados] falha ao carregar ' + url, err);
      return assign(null);
    });
  }

  function loadAllData() {
    var jobs = [];
    if (!data)      jobs.push(loadOptional('data/papers.json',  function (v) { data = v;      return v; }));
    if (!eventData) jobs.push(loadOptional('data/event.json',   function (v) { eventData = v; return v; }));
    if (!gallery)   jobs.push(loadOptional('data/gallery.json', function (v) { gallery = v;   return v; }));
    return Promise.all(jobs);
  }

  /* --- aplicação dos textos --------------------------------------------- */

  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      var value = t(node.getAttribute('data-i18n'));
      if (value) node.textContent = value;
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(function (node) {
      node.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length !== 2) return;
        var value = t(bits[1].trim());
        if (value) node.setAttribute(bits[0].trim(), value);
      });
    });

    document.documentElement.lang = HTML_LANG[lang];
    document.title = t('meta.title');

    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));
  }

  /* --- demonstração de slide -------------------------------------------- */

  function buildDemo() {
    var wrap = el('figure', 'demo');
    var grid = el('div', 'demo__grid');

    [['bad', 'demo.badLabel', 'demo.bad'], ['good', 'demo.goodLabel', 'demo.good']]
      .forEach(function (spec, index) {
        var slide = el('div', 'slide slide--' + spec[0]);
        slide.appendChild(el('p', 'slide__tag', t(spec[1])));
        slide.appendChild(el('p', 'slide__body', t(spec[2])));
        slide.appendChild(el('p', 'slide__num', String(index + 7)));
        grid.appendChild(slide);
      });

    wrap.appendChild(grid);
    wrap.appendChild(el('figcaption', 'caption', t('demo.caption')));
    return wrap;
  }

  /* --- agradecimentos ---------------------------------------------------- */

  function renderThanks() {
    var host = document.getElementById('thanks-list');
    clear(host);
    mergedRecords('thanks.groups', ['title', 'text']).forEach(function (group) {
      var li = el('li', 'thanks__item');
      li.appendChild(el('h3', 'thanks__itemtitle', group.title));
      li.appendChild(el('p', 'thanks__itemtext', group.text));
      host.appendChild(li);
    });
  }

  /* --- vídeo de encerramento ---------------------------------------------- */

  /* Capa em vez do iframe do YouTube: o player traz cerca de 1 MB de script e
     abre conexão com o Google só por estar na página. Aqui a seção nasce com
     uma imagem de 48 KB servida pelo próprio site, e o player só entra, já
     tocando, depois que a pessoa pede. Quem nunca clica não é rastreado. */
  function youtubeFacade(info) {
    var facade = el('button', 'closing__facade');
    facade.type = 'button';

    var poster = el('img', 'closing__poster');
    poster.src = info.poster;
    poster.alt = '';                 /* decorativa: o rótulo do botão já descreve */
    poster.loading = 'lazy';
    if (info.w && info.h) { poster.width = info.w; poster.height = info.h; }
    facade.appendChild(poster);

    var play = el('span', 'closing__play');
    play.appendChild(el('span', 'closing__playicon', '▶'));
    play.appendChild(el('span', null, t('closing.play')));
    facade.appendChild(play);

    facade.addEventListener('click', function () {
      var frame = facade.parentNode;

      /* nocookie e rel=0: sem cookies de rastreio e sem sugestões de canais
         de terceiros ao terminar. */
      var iframe = el('iframe', 'closing__embed');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' +
        encodeURIComponent(info.youtubeId) + '?autoplay=1&rel=0';
      iframe.title = info.title || t('closing.title');
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; ' +
        'gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;

      clear(frame);
      frame.appendChild(iframe);
    });

    return facade;
  }

  /* preload="metadata" e não "auto": o arquivo tem 26 MB e fica no meio da
     página, então baixá-lo inteiro para quem só veio ver as fotos custaria a
     conexão de quem está no celular. */
  function localPlayer(info) {
    var video = el('video', 'closing__video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    if (info.poster) video.poster = info.poster;
    if (info.w && info.h) { video.width = info.w; video.height = info.h; }

    var source = el('source');
    source.src = info.src;
    source.type = info.type || 'video/mp4';
    video.appendChild(source);
    video.appendChild(document.createTextNode(t('closing.fallback')));
    return video;
  }

  function renderClosing() {
    var frame = document.getElementById('closing-frame');
    var version = document.getElementById('closing-version');
    var watch = document.getElementById('closing-watch');
    clear(frame);

    var info = gallery && gallery.closing;
    if (!info || !(info.youtubeId || info.src)) {
      version.textContent = '';
      watch.hidden = true;
      frame.appendChild(dataError('gallery.error'));
      return;
    }

    frame.appendChild(info.youtubeId ? youtubeFacade(info) : localPlayer(info));

    version.textContent = format(t('closing.version'), { date: formatDate(info.published) });

    /* Link direto para o YouTube, para quem prefere assistir lá, compartilhar
       ou usar as legendas e a velocidade do player nativo. */
    if (info.url) {
      watch.href = info.url;
      watch.hidden = false;
    } else {
      watch.hidden = true;
    }
  }

  /* --- galeria ------------------------------------------------------------ */

  /* A legenda é indexada pelo id do item, e não pela posição: assim inserir
     uma foto no meio da galeria não desloca todas as legendas seguintes nos
     três idiomas. Sem legenda no idioma ativo, cai no português; sem legenda
     nenhuma, a imagem entra com o texto alternativo genérico da seção. */
  function caption(id) {
    var value = get(current, 'gallery.captions.' + id);
    if (value) return value;
    var alt = get(dicts[FALLBACK], 'gallery.captions.' + id);
    if (alt) {
      console.warn('[i18n] legenda ausente em "' + lang + '": ' + id);
      return alt;
    }
    console.warn('[galeria] item sem legenda: ' + id);
    return t('gallery.title');
  }

  function galleryItems() {
    return (gallery && gallery.items) || [];
  }

  function buildTile(item, index) {
    var btn = el('button', 'gallery__item');
    btn.type = 'button';
    btn.setAttribute('data-index', String(index));
    if (item.kind === 'video') btn.classList.add('gallery__item--video');

    /* width e height vêm do JSON, então a proporção da moldura é conhecida
       antes de a imagem chegar. Isso evita o pulo de layout que acontece
       quando o navegador descobre o tamanho só ao terminar o download. */
    var img = el('img', 'gallery__img');
    img.src = item.thumb;
    img.alt = caption(item.id);
    img.loading = 'lazy';
    img.decoding = 'async';
    if (item.w && item.h) {
      img.width = item.w;
      img.height = item.h;
      btn.style.aspectRatio = item.w + ' / ' + item.h;
    }
    btn.appendChild(img);

    if (item.kind === 'video') {
      var badge = el('span', 'gallery__badge');
      badge.appendChild(el('span', 'gallery__play', '▶'));
      badge.appendChild(el('span', null, t('gallery.videoBadge')));
      btn.appendChild(badge);
    }

    btn.addEventListener('click', function () { openLightbox(index, btn); });
    return btn;
  }

  function renderGallery() {
    var host = document.getElementById('gallery-grid');
    clear(host);

    var items = galleryItems();
    if (!items.length) {
      host.appendChild(dataError('gallery.error'));
      return;
    }
    items.forEach(function (item, i) { host.appendChild(buildTile(item, i)); });
  }

  /* --- ampliação da galeria ------------------------------------------------ */

  var box = document.getElementById('lightbox');
  var boxStage = document.getElementById('lightbox-stage');
  var boxText = document.getElementById('lightbox-text');
  var boxCounter = document.getElementById('lightbox-counter');
  var boxClose = document.getElementById('lightbox-close');
  var boxPrev = document.getElementById('lightbox-prev');
  var boxNext = document.getElementById('lightbox-next');
  var boxIndex = 0;
  var boxOpener = null;   // para devolver o foco a quem abriu

  function showSlide(index) {
    var items = galleryItems();
    if (!items.length) return;

    /* Índice circular: da última foto, "próxima" volta para a primeira. */
    boxIndex = ((index % items.length) + items.length) % items.length;
    var item = items[boxIndex];
    stopMedia();

    if (item.kind === 'video') {
      var video = el('video', 'lightbox__media');
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      if (item.poster) video.poster = item.poster;
      var source = el('source');
      source.src = item.src;
      source.type = item.type || 'video/mp4';
      video.appendChild(source);
      video.appendChild(document.createTextNode(t('closing.fallback')));
      boxStage.appendChild(video);
    } else {
      var img = el('img', 'lightbox__media');
      img.src = item.full;
      img.alt = caption(item.id);
      if (item.w && item.h) { img.width = item.w; img.height = item.h; }
      boxStage.appendChild(img);
    }

    boxText.textContent = caption(item.id);
    boxCounter.textContent = format(t('gallery.counter'), {
      n: num(boxIndex + 1, 0),
      total: num(items.length, 0)
    });
  }

  /* Pausar antes de descartar é obrigatório: remover um <video> da árvore não
     interrompe a reprodução em todos os navegadores, e o áudio continuaria
     tocando depois de fechar a ampliação ou de avançar para o próximo item. */
  function stopMedia() {
    var video = boxStage.querySelector('video');
    if (video) {
      try { video.pause(); } catch (e) { /* alguns navegadores recusam antes de carregar */ }
    }
    clear(boxStage);
  }

  function openLightbox(index, opener) {
    boxOpener = opener || null;
    showSlide(index);
    box.hidden = false;
    document.body.classList.add('is-locked');
    boxClose.focus();
  }

  function closeLightbox() {
    stopMedia();
    box.hidden = true;
    document.body.classList.remove('is-locked');
    if (boxOpener) boxOpener.focus();
    boxOpener = null;
  }

  function step(delta) {
    showSlide(boxIndex + delta);
  }

  boxClose.addEventListener('click', closeLightbox);
  boxPrev.addEventListener('click', function () { step(-1); });
  boxNext.addEventListener('click', function () { step(1); });

  /* Clique no fundo fecha, clique na figura não: o alvo é o próprio contêiner
     apenas quando o ponteiro caiu fora de tudo o que está dentro dele. */
  box.addEventListener('click', function (ev) {
    if (ev.target === box) closeLightbox();
  });

  document.addEventListener('keydown', function (ev) {
    if (box.hidden) return;
    if (ev.key === 'Escape') { closeLightbox(); return; }
    if (ev.key === 'ArrowLeft') { step(-1); return; }
    if (ev.key === 'ArrowRight') { step(1); return; }

    /* Contenção simples do foco: a ampliação só tem três controles, então em
       vez de varrer a árvore basta manter o Tab circulando entre eles. */
    if (ev.key === 'Tab') {
      var stops = [boxClose, boxPrev, boxNext];
      var at = stops.indexOf(document.activeElement);
      var to = ev.shiftKey ? at - 1 : at + 1;
      if (at === -1 || to < 0 || to >= stops.length) {
        ev.preventDefault();
        stops[ev.shiftKey ? stops.length - 1 : 0].focus();
      }
    }
  });

  /* --- programação realizada ---------------------------------------------- */

  /* Abertura, intervalo e encerramento são uma linha só. A abertura é a única
     que pode ter slides, então o link é opcional e some quando slidesUrl está
     vazio, do mesmo jeito que os PDFs dos artigos. */
  function programRow(label, entry) {
    var row = el('div', 'prog__moment');
    row.appendChild(el('p', 'prog__momenttitle', label));

    var url = entry && entry.slidesUrl;
    if (url) {
      var link = el('a', 'asset', t('program.openingSlides'));
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      row.appendChild(link);
    }
    return row;
  }

  function buildSession(entry) {
    var block = el('section', 'prog__session');

    var head = el('div', 'prog__sessionhead');
    var mark = el('p', 'eyebrow', format(t('program.sessionLabel'), { n: num(entry.number, 0) }) +
      (entry.continued ? ' · ' + t('program.continued') : ''));
    head.appendChild(mark);
    head.appendChild(el('h3', 'prog__sessiontitle', t('program.sessions.' + entry.session)));
    head.appendChild(el('p', 'prog__sessioncount',
      format(t('program.count'), { n: num((entry.papers || []).length, 0) })));
    block.appendChild(head);

    var list = el('ol', 'prog__papers');
    (entry.papers || []).forEach(function (id) {
      var paper = findPaper(id);
      if (!paper) return;

      var li = el('li', 'prog__paper');

      var body = el('div', 'prog__paperbody');
      /* O título leva ao registro completo do artigo, mais abaixo na página,
         onde ficam a autoria e os links de PDF. Repetir tudo aqui só faria a
         mesma informação existir em dois lugares. */
      var link = el('a', 'prog__papertitle', paper.title || '');
      link.href = '#artigo-' + paper.id;
      body.appendChild(link);
      body.appendChild(el('p', 'prog__paperauthors', paper.authors || ''));
      li.appendChild(body);

      li.appendChild(el('span', 'prog__type prog__type--' + paper.type,
        t(paper.type === 'short' ? 'program.shortTag' : 'program.fullTag')));

      list.appendChild(li);
    });
    block.appendChild(list);

    return block;
  }

  function renderProgram() {
    var host = document.getElementById('program-body');
    var lede = document.getElementById('program-lede');
    var source = document.getElementById('program-source');
    clear(host);

    if (!eventData || !eventData.program || !data) {
      lede.textContent = '';
      source.hidden = true;
      host.appendChild(dataError('program.error'));
      return;
    }

    var durations = eventData.durations || { full: {}, short: {} };
    lede.textContent = format(t('program.text'), {
      fullTotal: num(durations.full.total, 0),
      fullTalk: num(durations.full.talk, 0),
      fullQuestions: num(durations.full.questions, 0),
      shortTotal: num(durations.short.total, 0),
      shortTalk: num(durations.short.talk, 0),
      shortQuestions: num(durations.short.questions, 0)
    });

    eventData.program.forEach(function (block) {
      var node = el('div', 'prog__block');
      node.appendChild(el('p', 'prog__time', block.time || ''));

      var body = el('div', 'prog__blockbody');
      (block.items || []).forEach(function (entry) {
        if (entry.kind === 'session') body.appendChild(buildSession(entry));
        else if (entry.kind === 'opening') body.appendChild(programRow(t('program.opening'), entry));
        else if (entry.kind === 'break') body.appendChild(programRow(t('program.break'), entry));
        else if (entry.kind === 'closing') body.appendChild(programRow(t('program.closing'), entry));
      });
      node.appendChild(body);
      host.appendChild(node);
    });

    source.hidden = false;
    source.textContent = t('program.typeNote') + ' ' +
      format(t('program.sourceNote'), { date: formatDate(eventData.collected) });
  }

  /* --- Comitê de Programa -------------------------------------------------- */

  function peopleBlock(title, list) {
    var wrap = el('div', 'people');
    wrap.appendChild(el('h3', 'people__title', title));
    var ul = el('ul', 'people__list');
    (list || []).forEach(function (person) {
      var li = el('li', 'people__item');
      li.appendChild(el('span', 'people__name', person.name || ''));
      var where = person.affiliation || person.acronym || '';
      if (where) li.appendChild(el('span', 'people__where', where));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function renderCommittee() {
    var host = document.getElementById('committee-body');
    var lede = document.getElementById('committee-lede');
    clear(host);

    if (!eventData || !eventData.committee) {
      lede.textContent = '';
      host.appendChild(dataError('committee.error'));
      return;
    }

    var s = (data && data.stats) || {};
    lede.textContent = format(t('committee.text'), {
      listed: num(eventData.committee.length, 0),
      active: num(s.pcMembers, 0),
      assignments: num(s.assignments, 0),
      done: num(s.reviewsDone, 0)
    });

    var chairs = el('div', 'people__grid');
    chairs.appendChild(peopleBlock(t('committee.coordination'), eventData.coordination));
    chairs.appendChild(peopleBlock(t('committee.generalCoordination'), eventData.generalCoordination));
    chairs.appendChild(peopleBlock(t('committee.ceseg'), eventData.cesegCoordination));
    host.appendChild(chairs);

    /* A afiliação do comitê vem por extenso e por sigla; na lista longa só a
       sigla cabe sem quebrar a leitura em duas linhas por nome. */
    host.appendChild(peopleBlock(t('committee.membersTitle'),
      eventData.committee.map(function (person) {
        return { name: person.name, affiliation: person.acronym };
      })));
  }

  /* --- artigos aceitos ---------------------------------------------------- */

  /* Cada artigo expõe dois ganchos de arquivo, no estilo das páginas de
     programa do USENIX: o PDF do trabalho e o PDF dos slides. Enquanto a URL
     correspondente estiver vazia em data/papers.json, o lugar do arquivo
     continua visível, marcado como "em breve", em vez de simplesmente sumir. */
  var ASSETS = [
    { field: 'paperUrl',  cta: 'papers.paperCta',  soon: 'papers.paperSoon' },
    { field: 'slidesUrl', cta: 'papers.slidesCta', soon: 'papers.slidesSoon' }
  ];

  function buildPaper(paper, index) {
    var li = el('li', 'paper');
    if (paper.id) li.id = 'artigo-' + paper.id;

    var mark = el('p', 'paper__index', num(index, 0));
    mark.setAttribute('aria-hidden', 'true');
    li.appendChild(mark);

    var body = el('div', 'paper__body');
    body.appendChild(el('h4', 'paper__title', paper.title || ''));
    body.appendChild(el('p', 'paper__authors', paper.authors || ''));

    var assets = el('ul', 'paper__assets');
    assets.setAttribute('aria-label', t('papers.assetsLabel'));

    ASSETS.forEach(function (spec) {
      var url = paper[spec.field];
      var item = el('li');

      if (url) {
        var link = el('a', 'asset', t(spec.cta));
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        item.appendChild(link);
      } else {
        item.appendChild(el('span', 'asset asset--soon', t(spec.soon)));
      }

      assets.appendChild(item);
    });

    body.appendChild(assets);
    li.appendChild(body);
    return li;
  }

  function renderPapers() {
    var host = document.getElementById('papers-groups');
    var source = document.getElementById('papers-source');
    clear(host);

    if (!data) {
      source.hidden = true;
      host.appendChild(dataError('papers.error'));
      return;
    }

    source.hidden = false;
    source.textContent = format(t('papers.sourceNote'), { date: formatDate(data.collected) });

    [ { type: 'full',  title: t('papers.fullTitle') },
      { type: 'short', title: t('papers.shortTitle') } ].forEach(function (group) {

      var list = (data.papers || []).filter(function (p) { return p.type === group.type; });
      if (!list.length) return;

      var block = el('section', 'papers__group');
      var head = el('div', 'papers__grouphead');
      head.appendChild(el('h3', 'papers__grouptitle', group.title));
      head.appendChild(el('p', 'papers__groupcount',
        format(t('papers.groupCount'), { n: num(list.length, 0) })));
      block.appendChild(head);

      var ol = el('ol', 'papers__list');
      list.forEach(function (paper, i) { ol.appendChild(buildPaper(paper, i + 1)); });
      block.appendChild(ol);

      host.appendChild(block);
    });
  }

  /* --- convite para o envio dos slides ------------------------------------ */

  /* O endereço de envio é lido apenas do português, como a URL do template:
     é o mesmo nos três idiomas, e uma fonte única evita atualizar três vezes. */
  function renderSlidesCall() {
    var host = document.getElementById('call-list');
    clear(host);
    mergedList('slidesCall.items').forEach(function (item) {
      host.appendChild(el('li', null, item));
    });

    var email = get(dicts[FALLBACK], 'slidesCall.email') || '';
    var cta = document.getElementById('call-cta');
    var soon = document.getElementById('call-soon');
    var label = document.getElementById('call-host');

    if (email) {
      cta.href = 'mailto:' + email + '?subject=' + encodeURIComponent(t('slidesCall.subject'));
      label.textContent = email;
      cta.hidden = false;
      soon.hidden = true;
    } else {
      cta.hidden = true;
      soon.hidden = false;
    }
  }

  /* --- estatísticas -------------------------------------------------------- */

  function statTile(value, label) {
    var box = el('div', 'stat');
    box.appendChild(el('p', 'stat__value', value));
    box.appendChild(el('p', 'stat__label', label));
    return box;
  }

  function legendItem(kind, label, note) {
    var li = el('li', 'ratio__legenditem');
    li.appendChild(el('span', 'ratio__swatch ratio__swatch--' + kind));
    var text = el('span', 'ratio__legendtext');
    text.appendChild(el('span', 'ratio__legendlabel', label));
    if (note) text.appendChild(el('span', 'ratio__legendnote', note));
    li.appendChild(text);
    return li;
  }

  /* Proporção de um total só, com duas fatias: aceitos e não aceitos. A divisão
     interna dos não aceitos, entre rejeitados e retirados, fica na legenda em
     texto, porque uma terceira cor para uma fatia de 2,7% não seria legível. */
  function buildRatio(label, group) {
    var submitted = group.submitted || 0;
    var accepted = group.accepted || 0;
    var rejected = group.rejected || 0;
    var withdrawn = group.withdrawn || 0;
    var rest = Math.max(0, submitted - accepted);

    var wrap = el('div', 'ratio');

    var head = el('div', 'ratio__head');
    head.appendChild(el('p', 'ratio__label', label));
    head.appendChild(el('p', 'ratio__total',
      format(t('stats.submissions'), { n: num(submitted, 0) })));
    wrap.appendChild(head);

    var bar = el('div', 'ratio__bar');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', format(t('stats.barLabel'), {
      group: label,
      accepted: num(accepted, 0),
      submitted: num(submitted, 0),
      rate: percent(accepted, submitted)
    }));

    [['yes', accepted], ['no', rest]].forEach(function (spec) {
      if (!spec[1]) return;
      var seg = el('div', 'ratio__seg ratio__seg--' + spec[0]);
      seg.style.flex = String(spec[1]);
      bar.appendChild(seg);
    });
    wrap.appendChild(bar);

    var detail = [];
    if (rejected) detail.push(plural(rejected, 'stats.rejectedOne', 'stats.rejectedMany'));
    if (withdrawn) detail.push(plural(withdrawn, 'stats.withdrawnOne', 'stats.withdrawnMany'));

    var legend = el('ul', 'ratio__legend');
    legend.appendChild(legendItem('yes',
      num(accepted, 0) + ' ' + t('stats.acceptedSeg'), percent(accepted, submitted)));
    legend.appendChild(legendItem('no',
      num(rest, 0) + ' ' + t('stats.restSeg'), detail.join(' · ')));
    wrap.appendChild(legend);

    return wrap;
  }

  function renderStats() {
    var host = document.getElementById('stats-body');
    clear(host);

    if (!data) {
      host.appendChild(dataError('stats.error'));
      return;
    }

    var s = data.stats || {};
    var full = s.full || {};
    var short = s.short || {};
    var submitted = (full.submitted || 0) + (short.submitted || 0);
    var accepted = (full.accepted || 0) + (short.accepted || 0);

    /* Os percentuais são calculados a partir das contagens, e não copiados da
       fonte, para que não exista um segundo número capaz de divergir. O total
       declarado serve de conferência: se não bater com a soma por tipo, o aviso
       aparece no console e a soma prevalece, porque é ela que alimenta as barras. */
    if (s.submitted !== undefined && s.submitted !== submitted) {
      console.warn('[dados] stats.submitted (' + s.submitted +
        ') difere da soma por tipo (' + submitted + ')');
    }

    var grid = el('div', 'stats__grid');
    [ [num(submitted, 0), t('stats.submitted')],
      [num(accepted, 0), t('stats.accepted')],
      [percent(accepted, submitted), t('stats.rate')],
      [num(s.pcMembers, 0), t('stats.pcMembers')],
      [num(s.authors, 0), t('stats.authors')],
      [num(s.institutions, 0), t('stats.institutions')]
    ].forEach(function (tile) { grid.appendChild(statTile(tile[0], tile[1])); });
    host.appendChild(grid);

    host.appendChild(el('h3', 'stats__subtitle', t('stats.ratioTitle')));
    host.appendChild(buildRatio(t('stats.fullLabel'), full));
    host.appendChild(buildRatio(t('stats.shortLabel'), short));

    var vars = {
      reviewed: num(s.reviewed, 0),
      submitted: num(submitted, 0),
      assignments: num(s.assignments, 0),
      done: num(s.reviewsDone, 0),
      min: num(s.minReviews, 0),
      authors: num(s.authors, 0),
      institutions: num(s.institutions, 0),
      multi: num(s.multiInstitution, 0),
      high: num(s.highWavg, 0),
      cut: num(s.highWavgCut, 1, true)
    };

    var notes = el('ul', 'stats__notes');
    mergedList('stats.notes').forEach(function (note) {
      notes.appendChild(el('li', null, format(note, vars)));
    });
    host.appendChild(notes);
  }

  /* --- seções de dicas --------------------------------------------------- */

  function buildTip(item) {
    var li = el('li', 'tip');
    li.appendChild(el('p', 'tip__text', item.text));

    if (item.children && item.children.length) {
      var sub = el('ul', 'tip__sub');
      item.children.forEach(function (child) {
        sub.appendChild(el('li', null, child));
      });
      li.appendChild(sub);
    }

    if (item.links && item.links.length) {
      var links = el('ul', 'tip__links');
      item.links.forEach(function (link) {
        var a = el('a', null, link.label);
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener';
        var wrap = el('li');
        wrap.appendChild(a);
        links.appendChild(wrap);
      });
      li.appendChild(links);
    }

    if (item.demo === 'headline') li.appendChild(buildDemo());
    return li;
  }

  function renderSections() {
    var host = document.getElementById('sections');
    var toc = document.getElementById('toc-list');
    var sections = mergedSections();
    clear(host);
    clear(toc);
    if (!sections.length) return;

    /* Âncoras fixas: os ids vêm do JSON e são iguais nos três idiomas, então
       um link compartilhado continua válido depois de trocar de idioma.
       A ordem aqui precisa espelhar a ordem dos blocos no index.html. */
    var anchors = [
      { id: 'agradecimentos', label: t('thanks.title') },
      { id: 'video', label: t('closing.title') },
      { id: 'galeria', label: t('gallery.title') },
      { id: 'programacao', label: t('program.title') },
      { id: 'artigos', label: t('papers.title') },
      { id: 'estatisticas', label: t('stats.title') },
      { id: 'comite', label: t('committee.title') },
      { id: 'slides', label: t('slidesCall.title') },
      { id: 'template', label: t('template.title') },
      { id: 'tempo', label: t('timer.title') }
    ];

    sections.forEach(function (section) {
      anchors.push({ id: section.id, label: section.title });

      var node = el('section', 'section');
      node.id = section.id;

      var head = el('div', 'section__head');
      head.appendChild(el('p', 'eyebrow', section.eyebrow));
      head.appendChild(el('h2', 'section__title', section.title));
      node.appendChild(head);

      var list = el('ul', 'tips');
      (section.items || []).forEach(function (item) {
        list.appendChild(buildTip(item));
      });
      node.appendChild(list);
      host.appendChild(node);
    });

    anchors.push({ id: 'creditos', label: t('credits.title') });

    anchors.forEach(function (entry) {
      var a = el('a', null, entry.label);
      a.href = '#' + entry.id;
      var li = el('li');
      li.appendChild(a);
      toc.appendChild(li);
    });

    watchScroll();
  }

  /* --- índice: destaque da seção visível --------------------------------- */

  /* Regra explícita em vez de IntersectionObserver: a seção ativa é a última
     cujo topo já passou da linha de leitura, a 30% da altura da janela. É
     determinístico, não depende da ordem em que os callbacks chegam e sempre
     começa na primeira seção quando a página está no topo. */
  var scrollHandler = null;
  var bodyObserver = null;
  var READING_LINE = 0.3;

  function watchScroll() {
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('resize', scrollHandler);
      window.removeEventListener('load', scrollHandler);
    }
    if (bodyObserver) bodyObserver.disconnect();

    var entries = [];
    document.querySelectorAll('#toc-list a').forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target) entries.push({ link: a, target: target });
    });
    if (!entries.length) return;

    var ticking = false;

    function update() {
      ticking = false;
      var line = window.innerHeight * READING_LINE;
      var active = 0;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].target.getBoundingClientRect().top <= line) active = i;
      }
      entries.forEach(function (entry, i) {
        if (i === active) entry.link.setAttribute('aria-current', 'true');
        else entry.link.removeAttribute('aria-current');
      });
    }

    scrollHandler = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', scrollHandler);
    window.addEventListener('load', scrollHandler);

    /* Um cálculo único aqui erraria: neste instante o layout ainda não
       estabilizou, as seções estão praticamente empilhadas em top 0 e todas
       passam da linha de leitura. Observar o corpo recalcula quando a altura
       real aparece, e sem isso o índice fica preso num destaque arbitrário. */
    if (typeof ResizeObserver === 'function') {
      bodyObserver = new ResizeObserver(scrollHandler);
      bodyObserver.observe(document.body);
    }
    update();
  }

  /* --- template de slides ------------------------------------------------ */

  /* A URL do template é a mesma nos três idiomas, então o português é a fonte
     única. Preencher slidesTemplate em pt.json basta para o botão aparecer. */
  function renderTemplate() {
    var url = get(dicts[FALLBACK], 'template.url') || '';
    var cta = document.getElementById('template-cta');
    var soon = document.getElementById('template-soon');

    if (url) {
      cta.href = url;
      cta.hidden = false;
      soon.hidden = true;
    } else {
      cta.hidden = true;
      soon.hidden = false;
    }
  }

  /* --- calculadora de tempo ---------------------------------------------- */

  var input = document.getElementById('slot');
  var MIN_SLOT = 5;
  var MAX_SLOT = 90;

  /* Oito minutos é o tempo de fala de um artigo completo no WCIA 2026, então
     é o valor com que a calculadora abre. O campo continua livre para quem
     estiver preparando uma apresentação de outro evento. */
  var DEFAULT_SLOT = 8;

  function renderTimer() {
    var parts = mergedParts();
    if (!parts.length) return;

    var slot = parseInt(input.value, 10);
    if (isNaN(slot)) slot = DEFAULT_SLOT;
    slot = Math.min(MAX_SLOT, Math.max(MIN_SLOT, slot));

    /* A escuridão da fatia acompanha a magnitude, não a ordem da etapa:
       rampa sequencial de matiz única, como manda a leitura de gráficos. */
    var ranked = parts.map(function (p, i) { return { share: p.share, index: i }; })
      .sort(function (a, b) { return b.share - a.share; });
    var rank = {};
    ranked.forEach(function (entry, position) { rank[entry.index] = position + 1; });

    var bar = document.getElementById('timer-bar');
    var legend = document.getElementById('timer-legend');
    clear(bar);
    clear(legend);

    var spoken = [];

    parts.forEach(function (part, i) {
      var minutes = slot * part.share / 100;
      var tier = rank[i];

      var seg = el('div', 'timer__seg timer__seg--' + tier);
      seg.style.flex = String(part.share);
      bar.appendChild(seg);

      var item = el('li', 'timer__legenditem');
      item.appendChild(el('span', 'timer__swatch timer__swatch--' + tier));

      var label = el('span', 'timer__legendlabel');
      label.appendChild(document.createTextNode(part.label));
      label.appendChild(document.createTextNode(' '));
      label.appendChild(el('span', 'timer__legendshare', num(part.share, 0) + '%'));
      item.appendChild(label);

      item.appendChild(el('span', 'timer__legendvalue', num(minutes, 1) + ' min'));
      legend.appendChild(item);

      spoken.push(part.label + ': ' + num(minutes, 1) + ' min, ' + num(part.share, 0) + '%');
    });

    bar.setAttribute('aria-label', t('timer.title') + '. ' + spoken.join('. ') + '.');

    document.getElementById('tol-target').textContent =
      num(slot * 0.95, 1) + ' – ' + num(slot * 1.05, 1) + ' min';
    document.getElementById('tol-limit').textContent =
      num(slot * 0.90, 1) + ' – ' + num(slot * 1.10, 1) + ' min';
    document.getElementById('slides-count').textContent =
      '≈ ' + num(slot, 0) + ' ' + t('timer.slidesUnit');
  }

  input.addEventListener('input', renderTimer);
  input.addEventListener('change', function () {
    var value = parseInt(input.value, 10);
    if (isNaN(value)) value = DEFAULT_SLOT;
    input.value = String(Math.min(MAX_SLOT, Math.max(MIN_SLOT, value)));
    renderTimer();
  });

  /* --- troca de idioma --------------------------------------------------- */

  function markSwitch() {
    document.querySelectorAll('.langswitch__btn').forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === lang;
      btn.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }

  /* renderSections() por último entre os blocos de conteúdo, porque termina
     chamando watchScroll(), que mede as posições das seções na página. */
  function apply(code) {
    lang = code;
    current = dicts[code];
    applyStatic();
    renderThanks();
    renderClosing();
    renderGallery();
    renderProgram();
    renderPapers();
    renderStats();
    renderCommittee();
    renderSlidesCall();
    renderSections();
    renderTemplate();
    renderTimer();
    markSwitch();

    /* A ampliação continua aberta ao trocar de idioma, e a legenda visível é
       do idioma anterior. Redesenhar o slide atual a recoloca no novo. */
    if (!box.hidden) showSlide(boxIndex);
  }

  function setLang(code, pushUrl) {
    var needed = code === FALLBACK ? [code] : [code, FALLBACK];
    var jobs = needed.map(load);

    /* Os arquivos de dados falham de forma isolada: sem eles, só as seções
       correspondentes mostram o aviso com o link para a página oficial, e o
       resto da página continua funcionando normalmente. */
    jobs.push(loadAllData());

    return Promise.all(jobs)
      .then(function () {
        apply(code);
        try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* modo privado */ }

        if (pushUrl) {
          var url = new URL(location.href);
          url.searchParams.set('lang', code);
          history.replaceState(null, '', url.toString());
        }
      })
      .catch(function (err) {
        console.error('[i18n] falha ao carregar o idioma "' + code + '"', err);
        if (code !== FALLBACK) return setLang(FALLBACK, pushUrl);
        showLoadError();
      });
  }

  function showLoadError() {
    var host = document.getElementById('sections');
    clear(host);
    var box = el('section', 'card');
    box.appendChild(el('h2', 'card__title', 'Conteúdo indisponível'));
    box.appendChild(el('p', 'card__text',
      'Não foi possível carregar os textos desta página. Consulte a página oficial do WCIA.'));
    var a = el('a', 'btn', 'Abrir a página oficial do WCIA');
    a.href = 'https://www.sbseg2026.uff.br/workshops/wcia/';
    a.target = '_blank';
    a.rel = 'noopener';
    box.appendChild(a);
    host.appendChild(box);
  }

  document.querySelectorAll('.langswitch__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = btn.getAttribute('data-lang');
      if (code === lang) return;
      setLang(code, true);
    });
  });

  setLang(resolveLang(), false);
})();
