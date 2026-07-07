import { FONT_STACK } from './constants.js';

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} state
 * @returns {string}
 */
export function renderTemplate(state) {
  switch (state.templateType) {
    case 'title':
      return renderTitle(state);
    case 'simple':
      return renderSimple(state);
    case 'glass':
      return renderGlass(state);
    default:
      return '';
  }
}

function renderTitle(state) {
  const pos = state.position || 'bottom-left';
  const number = esc(state.chapterNumber || '01');
  const title = esc(state.mainText || '入庫');
  const sub = esc(state.subText || '');

  return `
    <div class="tpl tpl-title tpl-pos-${pos}" data-template="title">
      <div class="tpl-title-inner">
        <div class="tpl-title-number anim-item anim-fade" data-anim-order="1">${number}</div>
        <div class="tpl-title-line anim-item anim-line-grow" data-anim-order="2"></div>
        <div class="tpl-title-name anim-item anim-slide-right" data-anim-order="3">${title}</div>
        ${sub ? `<div class="tpl-title-sub anim-item anim-fade" data-anim-order="4">${sub}</div>` : ''}
      </div>
    </div>`;
}

function renderSimple(state) {
  const pos = state.position || 'bottom-center';
  const text = esc(state.mainText || '');
  const sub = state.subText ? esc(state.subText) : '';
  const useBand = state.useBand !== false;

  const inner = `
    <div class="tpl-simple-text anim-item anim-fade" data-anim-order="1">${text}</div>
    ${sub ? `<div class="tpl-simple-sub anim-item anim-fade" data-anim-order="2">${sub}</div>` : ''}`;

  const content = useBand
    ? `<div class="tpl-simple-band anim-item anim-slide-up" data-anim-order="0">${inner}</div>`
    : inner;

  return `
    <div class="tpl tpl-simple tpl-pos-${pos} ${useBand ? 'has-band' : ''}" data-template="simple">
      ${content}
    </div>`;
}

function renderGlass(state) {
  const pos = state.position || 'bottom-left';
  const text = esc(state.mainText || '');
  const sub = state.subText ? esc(state.subText) : '';

  return `
    <div class="tpl tpl-glass tpl-pos-${pos}" data-template="glass">
      <div class="tpl-glass-card anim-item anim-slide-right" data-anim-order="1">
        <div class="tpl-glass-accent anim-item anim-line-grow-v" data-anim-order="0"></div>
        <div class="tpl-glass-body">
          <div class="tpl-glass-text anim-item anim-fade" data-anim-order="2">${text}</div>
          ${sub ? `<div class="tpl-glass-sub anim-item anim-fade" data-anim-order="3">${sub}</div>` : ''}
          <div class="tpl-glass-gold anim-item anim-line-grow" data-anim-order="4"></div>
        </div>
      </div>
    </div>`;
}

export function getExportFilename(templateType, chapterNumber) {
  const names = {
    title: `template-title-${chapterNumber || '01'}`,
    simple: 'template-simple',
    glass: 'template-glass',
  };
  return `${names[templateType] || 'template-export'}.png`;
}

export { FONT_STACK };
