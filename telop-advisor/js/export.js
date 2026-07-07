import { FRAME_W, FRAME_H } from './constants.js';
import { renderTemplate } from './templates.js';

/**
 * Export preview frame to PNG at 1920×1080.
 * @param {object} options
 * @param {HTMLCanvasElement} options.bgCanvas
 * @param {HTMLElement} options.contentLayer
 * @param {boolean} options.withBackground
 * @param {string} options.filename
 */
export async function exportToPng({ bgCanvas, filterOpacity, contentLayer, withBackground, filename }) {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d');

  if (withBackground) {
    ctx.drawImage(bgCanvas, 0, 0, FRAME_W, FRAME_H);
    if (filterOpacity > 0) {
      ctx.fillStyle = `rgba(11, 31, 58, ${filterOpacity})`;
      ctx.fillRect(0, 0, FRAME_W, FRAME_H);
    }
  }

  const contentImg = await captureContentLayer(contentLayer);
  ctx.drawImage(contentImg, 0, 0, FRAME_W, FRAME_H);

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Capture DOM content layer via SVG foreignObject.
 * @param {HTMLElement} layer
 * @returns {Promise<HTMLImageElement>}
 */
function captureContentLayer(layer) {
  return new Promise((resolve, reject) => {
    const clone = layer.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.width = `${FRAME_W}px`;
    clone.style.height = `${FRAME_H}px`;

    inlineComputedStyles(layer, clone);

    const html = clone.innerHTML;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_W}" height="${FRAME_H}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml"
               style="width:${FRAME_W}px;height:${FRAME_H}px;margin:0;padding:0;position:relative;overflow:hidden;font-family:'Noto Sans JP','BIZ UDPGothic',sans-serif;">
            ${html}
          </div>
        </foreignObject>
      </svg>`;

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('PNG書き出しに失敗しました'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

function inlineComputedStyles(source, target) {
  const sourceEls = [source, ...source.querySelectorAll('*')];
  const targetEls = [target, ...target.querySelectorAll('*')];

  const props = [
    'color', 'background', 'background-color', 'opacity',
    'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-radius', 'box-shadow', 'text-shadow',
    'width', 'height', 'max-width', 'min-width',
    'top', 'left', 'right', 'bottom',
    'display', 'flex-direction', 'align-items', 'justify-content', 'gap',
    'position', 'transform', 'backdrop-filter', '-webkit-backdrop-filter',
    'white-space', 'text-align',
  ];

  for (let i = 0; i < sourceEls.length; i++) {
    const computed = getComputedStyle(sourceEls[i]);
    let styleStr = '';
    for (const prop of props) {
      const val = computed.getPropertyValue(prop);
      if (val) styleStr += `${prop}:${val};`;
    }
    targetEls[i].setAttribute('style', styleStr);
  }
}

/**
 * Fallback: composite bg + content using offscreen render.
 */
export async function exportViaOffscreen(state, renderFn) {
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${FRAME_W}px;height:${FRAME_H}px;overflow:hidden;`;
  document.body.appendChild(container);

  const frame = document.createElement('div');
  frame.style.cssText = `width:${FRAME_W}px;height:${FRAME_H}px;position:relative;`;
  container.appendChild(frame);

  const bg = document.createElement('canvas');
  bg.width = FRAME_W;
  bg.height = FRAME_H;
  const bgCtx = bg.getContext('2d');
  if (state.bgImage) {
    bgCtx.drawImage(state.bgImage, 0, 0, FRAME_W, FRAME_H);
    bgCtx.fillStyle = `rgba(11, 31, 58, ${state.filterOpacity})`;
    bgCtx.fillRect(0, 0, FRAME_W, FRAME_H);
  }
  frame.appendChild(bg);

  const content = document.createElement('div');
  content.style.cssText = 'position:absolute;inset:0;';
  content.innerHTML = renderFn(state);
  frame.appendChild(content);

  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d');

  if (state.withBackground) {
    ctx.drawImage(bg, 0, 0);
  }
  const img = await captureContentLayer(content);
  ctx.drawImage(img, 0, 0);

  document.body.removeChild(container);

  const link = document.createElement('a');
  link.download = state.filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
