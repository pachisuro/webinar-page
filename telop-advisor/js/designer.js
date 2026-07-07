/**
 * Corporate telop design generator (Logistics DX / VP style).
 */

import { FRAME_W, FRAME_H } from './analyzer.js';

const CORPORATE = {
  navy: '#0B1F3A',
  navySoft: 'rgba(11, 31, 58, 0.88)',
  navyBand: 'rgba(11, 31, 58, 0.78)',
  white: '#FFFFFF',
  lightBlue: '#7EC8E3',
  gold: '#C9A84C',
  goldThin: 'rgba(201, 168, 76, 0.85)',
};

const STYLE_LABELS = {
  band: '半透明帯',
  glass: 'ガラス風カード',
  simple: 'シンプル字幕',
};

/**
 * @param {import('./analyzer.js').FrameAnalysis} analysis
 * @param {object} options
 * @returns {TelopDesign}
 */
export function generateDesign(analysis, options = {}) {
  const position = options.position || analysis.recommended;
  const text = options.text || '倉庫の自動化で、物流DXを加速する';
  const subtext = options.subtext || '';
  const style = options.style || position.recommendedStyle;

  const palette = analysis.colors.palette;
  const isLightBg = position.avgLum > 145;
  const useDarkPlate = style !== 'simple' || isLightBg || position.avgBusyness > 0.3;

  const layout = computeLayout(position, style, text, subtext);
  const css = buildCSS(layout, style, palette, useDarkPlate, position);
  const html = buildHTML(layout, style, text, subtext);

  return {
    style,
    styleLabel: STYLE_LABELS[style],
    position,
    layout,
    css,
    html,
    palette: {
      primary: CORPORATE.navy,
      text: useDarkPlate ? CORPORATE.white : CORPORATE.navy,
      accent: CORPORATE.lightBlue,
      line: CORPORATE.gold,
    },
    rationale: buildRationale(analysis, position, style),
  };
}

function computeLayout(position, style, text, subtext) {
  const pad = 48;
  const margin = 64;
  const charPerLine = style === 'band' ? 28 : 22;
  const lines = wrapText(text, charPerLine);
  const subLines = subtext ? wrapText(subtext, charPerLine + 4) : [];

  const lineHeight = style === 'band' ? 52 : 48;
  const subLineHeight = 36;
  const textBlockH =
    lines.length * lineHeight +
    (subLines.length ? subLines.length * subLineHeight + 16 : 0) +
    (style === 'band' ? 40 : 32);

  let x, y, width, height;

  if (style === 'band') {
    width = FRAME_W;
    height = textBlockH + pad * 2;
    x = 0;
    y = position.anchor.startsWith('t')
      ? 0
      : FRAME_H - height;
  } else {
    const maxW = style === 'glass' ? 920 : 860;
    width = Math.min(maxW, FRAME_W - margin * 2);
    height = textBlockH + pad;
    x = anchorX(position.anchor, width, margin);
    y = anchorY(position.anchor, height, margin);
  }

  return {
    x, y, width, height, pad,
    lines, subLines,
    lineHeight, subLineHeight,
    anchor: position.anchor,
  };
}

function anchorX(anchor, width, margin) {
  if (anchor.includes('l')) return margin;
  if (anchor.includes('r')) return FRAME_W - width - margin;
  return (FRAME_W - width) / 2;
}

function anchorY(anchor, height, margin) {
  if (anchor.startsWith('t')) return margin;
  if (anchor.startsWith('b') || anchor === 'bc' || anchor === 'bl' || anchor === 'br') {
    return FRAME_H - height - margin;
  }
  return (FRAME_H - height) / 2;
}

function wrapText(text, maxChars) {
  const raw = text.trim();
  if (!raw) return [''];
  const lines = [];
  let current = '';
  for (const ch of raw) {
    if (current.length >= maxChars) {
      lines.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildCSS(layout, style, palette, useDarkPlate, position) {
  const base = {
    fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', sans-serif",
    letterSpacing: '0.04em',
  };

  if (style === 'band') {
    return {
      ...base,
      container: {
        left: '0',
        right: '0',
        bottom: position.anchor.startsWith('t') ? 'auto' : '0',
        top: position.anchor.startsWith('t') ? '0' : 'auto',
        width: '100%',
        padding: `${layout.pad}px 80px`,
        background: CORPORATE.navyBand,
        borderTop: position.anchor.startsWith('t') ? 'none' : `2px solid ${CORPORATE.goldThin}`,
        borderBottom: position.anchor.startsWith('t') ? `2px solid ${CORPORATE.goldThin}` : 'none',
      },
      mainText: {
        color: CORPORATE.white,
        fontSize: '36px',
        fontWeight: '500',
        lineHeight: `${layout.lineHeight}px`,
        textShadow: 'none',
      },
      subText: {
        color: CORPORATE.lightBlue,
        fontSize: '24px',
        fontWeight: '400',
        marginTop: '12px',
      },
    };
  }

  if (style === 'glass') {
    return {
      ...base,
      container: {
        left: `${(layout.x / FRAME_W) * 100}%`,
        top: `${(layout.y / FRAME_H) * 100}%`,
        width: `${(layout.width / FRAME_W) * 100}%`,
        padding: `${layout.pad}px 40px`,
        background: 'rgba(11, 31, 58, 0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '4px',
        border: `1px solid rgba(126, 200, 227, 0.35)`,
        boxShadow: '0 8px 32px rgba(11, 31, 58, 0.25)',
        borderLeft: `3px solid ${CORPORATE.gold}`,
      },
      mainText: {
        color: CORPORATE.white,
        fontSize: '34px',
        fontWeight: '500',
        lineHeight: `${layout.lineHeight}px`,
      },
      subText: {
        color: CORPORATE.lightBlue,
        fontSize: '22px',
        marginTop: '10px',
      },
    };
  }

  // simple
  const textColor = useDarkPlate ? CORPORATE.white : CORPORATE.navy;
  const shadow = useDarkPlate
    ? '0 1px 8px rgba(11, 31, 58, 0.5)'
    : '0 1px 4px rgba(255, 255, 255, 0.8)';

  return {
    ...base,
    container: {
      left: `${(layout.x / FRAME_W) * 100}%`,
      top: `${(layout.y / FRAME_H) * 100}%`,
      width: `${(layout.width / FRAME_W) * 100}%`,
      padding: `${layout.pad / 2}px 0`,
      background: 'transparent',
      borderLeft: `2px solid ${CORPORATE.gold}`,
      paddingLeft: '20px',
    },
    mainText: {
      color: textColor,
      fontSize: '36px',
      fontWeight: '600',
      lineHeight: `${layout.lineHeight}px`,
      textShadow: shadow,
    },
    subText: {
      color: useDarkPlate ? CORPORATE.lightBlue : '#2A5F8F',
      fontSize: '24px',
      marginTop: '8px',
    },
  };
}

function buildHTML(layout, style, text, subtext) {
  const lines = layout.lines;
  const subLines = layout.subLines;
  const main = lines.map((l) => `<div class="telop-line">${escapeHtml(l)}</div>`).join('');
  const sub = subLines.length
    ? `<div class="telop-sub">${subLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}</div>`
    : '';
  return `<div class="telop-container telop-${style}">${main}${sub}</div>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildRationale(analysis, position, style) {
  const parts = [];

  if (position.avgBusyness > 0.4) {
    parts.push('背景の情報量が多いため、視認性確保の帯デザインを推奨');
  } else if (position.avgBusyness > 0.2) {
    parts.push('中程度の背景複雑さのため、ガラス風カードで被写体を活かしつつ読みやすさを確保');
  } else {
    parts.push('背景が比較的シンプルなため、ミニマルな字幕で企業VPらしい品格を維持');
  }

  if (position.avgLum > 160) {
    parts.push('明るい背景のため濃紺ベースの配色を採用');
  } else if (position.avgLum < 90) {
    parts.push('暗い背景のため白・水色の文字色を採用');
  }

  if (analysis.subject.label) {
    parts.push(`被写体は${analysis.subject.label}付近にあり、この位置は被写体と干渉しにくい`);
  }

  const styleReason = {
    band: '画面下部の帯は企業ウェビナー・倉庫紹介動画で定番のレイアウト',
    glass: '半透明カードは建物・設備写真の上でも自然に馴染む',
    simple: '余白の多い空や壁面では装飾を抑えた字幕が最適',
  };
  parts.push(styleReason[style]);

  return parts;
}

export { CORPORATE, STYLE_LABELS };
