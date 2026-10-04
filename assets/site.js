(() => {
  'use strict';
  const qs = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  let language = 'zh';
  const translations = all('[data-en]').map(node => ({node, zh: node.innerHTML, en: node.dataset.en}));
  const attributes = ['aria-label', 'alt'].flatMap(attribute => {
    const dataName = attribute === 'aria-label' ? 'data-en-aria' : 'data-en-alt';
    return all(`[${dataName}]`).map(node => ({node, attribute, zh: node.getAttribute(attribute), en: node.getAttribute(dataName)}));
  });
  const copyLabels = {zh: {success: '已复制到剪贴板', error: '复制未成功，请长按或选中文字复制'}, en: {success: 'Copied to clipboard', error: 'Could not copy. Please select and copy the text.'}};
  let toastTimer, lastToast;
  function setLanguage(next, persist = true) {
    language = next === 'en' ? 'en' : 'zh';
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    translations.forEach(item => { if (language === 'zh') item.node.innerHTML = item.zh; else item.node.textContent = item.en; });
    attributes.forEach(item => item.node.setAttribute(item.attribute, item[language]));
    all('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    document.title = language === 'zh' ? '刘昊 Hao Liu · 研究与实践' : 'Hao Liu · Research & Practice';
    qs('meta[name="description"]').content = language === 'zh' ? '刘昊，东北大学软件学院软件工程博士研究生。研究工业仿真、拥挤分析与人机协同，开发 Coronelli 与 NeuInk。' : 'Hao Liu, PhD student at Northeastern University. Research in industrial simulation, congestion analysis, and human–AI collaboration. Projects: Coronelli and NeuInk.';
    if (lastToast) qs('#toast').textContent = copyLabels[language][lastToast];
    updateMenuLabel(); updateFigureText(); updateActiveNavigation();
    document.dispatchEvent(new Event('portfolio:language'));
    if (persist) { try { localStorage.setItem('hao-lang', language); } catch {} }
  }
  all('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  const menu = qs('.menu-toggle'), nav = qs('#navigation');
  function updateMenuLabel() { const open = menu.getAttribute('aria-expanded') === 'true'; menu.setAttribute('aria-label', language === 'zh' ? (open ? '关闭导航' : '打开导航') : (open ? 'Close navigation' : 'Open navigation')); }
  function closeMenu() { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); updateMenuLabel(); }
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open); updateMenuLabel(); });
  all('a', nav).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);
  all('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    let result = 'error';
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(button.dataset.copy);
      else {
        const field = document.createElement('textarea'); field.value = button.dataset.copy; field.style.cssText = 'position:fixed;opacity:0;pointer-events:none'; document.body.append(field); field.select();
        let copied = false; try { copied = document.execCommand('copy'); } finally { field.remove(); button.focus({preventScroll: true}); }
        if (!copied) throw new Error('Clipboard unavailable');
      }
      result = 'success';
    } catch {}
    lastToast = result;
    const toast = qs('#toast'); toast.textContent = copyLabels[language][result]; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.classList.remove('visible'); lastToast = null; }, 3500);
  }));
  const dialog = qs('#figure-dialog');
  const figures = all('[data-figure]');
  let figure = null, figureOpener = null, figureGroup = figures;
  function updateFigureText() {
    if (!figure) return;
    qs('#figure-title').textContent = figure.dataset.figure;
    qs('#figure-image').alt = language === 'zh' ? figure.dataset.altZh : figure.dataset.altEn;
    qs('#figure-count').textContent = `${figureGroup.indexOf(figure) + 1} / ${figureGroup.length}`;
  }
  function showFigure(index) {
    figure = figureGroup[(index + figureGroup.length) % figureGroup.length];
    updateFigureText();
    qs('#figure-image').src = figure.dataset.src;
    qs('#figure-original').href = figure.dataset.original;
    qs('.figure-scroll').scrollTo(0, 0);
  }
  figures.forEach(button => button.addEventListener('click', () => {
    figureGroup = figures.filter(item => item.dataset.figure === button.dataset.figure);
    figureOpener = button; showFigure(figureGroup.indexOf(button)); dialog.showModal(); document.body.style.overflow = 'hidden';
  }));
  qs('#figure-prev').addEventListener('click', () => showFigure(figureGroup.indexOf(figure) - 1));
  qs('#figure-next').addEventListener('click', () => showFigure(figureGroup.indexOf(figure) + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); showFigure(figureGroup.indexOf(figure) + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  dialog.addEventListener('close', () => { if (!qs('dialog[open]')) document.body.style.overflow = ''; figureOpener?.focus({preventScroll:true}); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  const sectionLinks = all('a', nav).map(link => ({link, section: qs(link.hash)}));
  let navigationFrame = 0;
  function updateActiveNavigation() {
    const readingLine = qs('.site-header').getBoundingClientRect().bottom + 64;
    let active = null;
    sectionLinks.forEach(item => {
      if (item.section && item.section.getBoundingClientRect().top <= readingLine) active = item.link;
    });
    sectionLinks.forEach(({link}) => {
      if (link === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    navigationFrame = 0;
  }
  function scheduleNavigationUpdate() {
    if (!navigationFrame) navigationFrame = requestAnimationFrame(updateActiveNavigation);
  }
  window.addEventListener('scroll', scheduleNavigationUpdate, {passive: true});
  window.addEventListener('resize', scheduleNavigationUpdate);
  all('details').forEach(detail => detail.addEventListener('toggle', scheduleNavigationUpdate));
  qs('#year').textContent = String(new Date().getFullYear());
  let saved = 'zh'; try { saved = localStorage.getItem('hao-lang') || 'zh'; } catch {}
  setLanguage(saved, false);
})();
