import { analyzeFrame, FRAME_W, FRAME_H } from './analyzer.js';
import { generateDesign, STYLE_LABELS } from './designer.js';

const $ = (sel) => document.querySelector(sel);

const fileInput = $('#fileInput');
const uploadZone = $('#uploadZone');
const uploadPlaceholder = $('#uploadPlaceholder');
const thumbPreview = $('#thumbPreview');
const sampleBtn = $('#sampleBtn');
const mainText = $('#mainText');
const subText = $('#subText');
const positionSelect = $('#positionSelect');
const styleSelect = $('#styleSelect');
const showZones = $('#showZones');
const showGrid = $('#showGrid');
const previewStage = $('#previewStage');
const frame = $('#frame');
const bgCanvas = $('#bgCanvas');
const overlayCanvas = $('#overlayCanvas');
const telopLayer = $('#telopLayer');
const exportCssBtn = $('#exportCssBtn');

const analysisEmpty = $('#analysisEmpty');
const analysisContent = $('#analysisContent');
const metricBrightness = $('#metricBrightness');
const metricContrast = $('#metricContrast');
const metricBusyness = $('#metricBusyness');
const metricTone = $('#metricTone');
const tagContrast = $('#tagContrast');
const barBrightness = $('#barBrightness');
const colorChips = $('#colorChips');
const subjectInfo = $('#subjectInfo');
const positionRank = $('#positionRank');
const recStyle = $('#recStyle');
const recRationale = $('#recRationale');

let currentImage = null;
let analysis = null;
let currentDesign = null;

const bgCtx = bgCanvas.getContext('2d');
const overlayCtx = overlayCanvas.getContext('2d');

function init() {
  bindEvents();
  resizePreview();
  window.addEventListener('resize', resizePreview);
}

function bindEvents() {
  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) loadFile(file);
  });

  sampleBtn.addEventListener('click', loadSample);
  mainText.addEventListener('input', refreshDesign);
  subText.addEventListener('input', refreshDesign);
  positionSelect.addEventListener('change', refreshDesign);
  styleSelect.addEventListener('change', refreshDesign);
  showZones.addEventListener('change', drawOverlay);
  showGrid.addEventListener('change', drawOverlay);

  exportCssBtn.addEventListener('click', copyCss);
}

function resizePreview() {
  const stageW = previewStage.clientWidth;
  const scale = stageW / FRAME_W;
  frame.style.transform = `scale(${scale})`;
  previewStage.style.height = `${stageW * (9 / 16)}px`;
}

async function loadFile(file) {
  const url = URL.createObjectURL(file);
  try {
    await loadImageFromUrl(url, file.name);
    thumbPreview.src = url;
    thumbPreview.classList.remove('hidden');
    uploadPlaceholder.classList.add('hidden');
  } catch (err) {
    alert('画像の読み込みに失敗しました: ' + err.message);
  }
}

async function loadSample() {
  try {
    await loadImageFromUrl('sample/frame.png', 'frame.png');
    thumbPreview.src = 'sample/frame.png';
    thumbPreview.classList.remove('hidden');
    uploadPlaceholder.classList.add('hidden');
  } catch (err) {
    alert('サンプル画像の読み込みに失敗しました');
  }
}

function loadImageFromUrl(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      currentImage = img;
      await runAnalysis();
      resolve();
    };
    img.onerror = () => reject(new Error(name));
    img.src = url;
  });
}

async function runAnalysis() {
  if (!currentImage) return;

  analysis = await analyzeFrame(currentImage);
  bgCtx.drawImage(currentImage, 0, 0, FRAME_W, FRAME_H);

  populatePositionSelect();
  updateAnalysisPanel();
  refreshDesign();
  exportCssBtn.disabled = false;
}

function populatePositionSelect() {
  positionSelect.innerHTML = '';
  for (const pos of analysis.positions) {
    const opt = document.createElement('option');
    opt.value = pos.id;
    opt.textContent = `${pos.label}（スコア ${pos.score}）`;
    if (pos.id === analysis.recommended.id) opt.selected = true;
    positionSelect.appendChild(opt);
  }
}

function updateAnalysisPanel() {
  analysisEmpty.classList.add('hidden');
  analysisContent.classList.remove('hidden');

  const g = analysis.global;
  metricBrightness.textContent = g.brightness;
  barBrightness.style.width = `${Math.min(100, (g.brightness / 255) * 100)}%`;
  metricContrast.textContent = g.contrast;
  tagContrast.textContent =
    g.contrastLevel === 'high' ? '高' : g.contrastLevel === 'medium' ? '中' : '低';
  metricBusyness.textContent = (g.busyness * 100).toFixed(0) + '%';
  metricTone.textContent =
    { dark: '暗め', bright: '明るめ', cool: 'クール', neutral: 'ニュートラル', balanced: 'バランス' }[g.tone] || g.tone;

  colorChips.innerHTML = analysis.colors.dominant
    .map(
      (c) =>
        `<div class="color-chip"><span style="background:${c.hex}"></span><span>${c.hex}</span><span>${(c.ratio * 100).toFixed(1)}%</span></div>`
    )
    .join('');

  subjectInfo.textContent = `画面${analysis.subject.label}付近（視覚的注目度が高い領域）`;

  positionRank.innerHTML = analysis.positions
    .slice(0, 5)
    .map(
      (p, i) =>
        `<li>${p.label}<span class="rank-score">${p.score}pt</span><span class="rank-style">${STYLE_LABELS[p.recommendedStyle]}</span></li>`
    )
    .join('');
}

function refreshDesign() {
  if (!analysis) return;

  const posId = positionSelect.value;
  const position =
    analysis.positions.find((p) => p.id === posId) || analysis.recommended;

  let style = styleSelect.value;
  if (style === 'auto') style = position.recommendedStyle;

  currentDesign = generateDesign(analysis, {
    position,
    style,
    text: mainText.value,
    subtext: subText.value,
  });

  renderTelop(currentDesign);
  drawOverlay();

  recStyle.textContent = `${currentDesign.styleLabel} × ${position.label}`;
  recRationale.innerHTML = currentDesign.rationale.join('<br>');
}

function renderTelop(design) {
  const { css, layout, style } = design;
  telopLayer.innerHTML = '';

  const container = document.createElement('div');
  container.className = `telop-container telop-${style}`;

  applyStyles(container, css.container);

  for (const line of layout.lines) {
    const div = document.createElement('div');
    div.className = 'telop-line';
    div.textContent = line;
    applyStyles(div, css.mainText);
    container.appendChild(div);
  }

  if (layout.subLines.length) {
    const sub = document.createElement('div');
    sub.className = 'telop-sub';
    applyStyles(sub, css.subText);
    for (const line of layout.subLines) {
      const sd = document.createElement('div');
      sd.textContent = line;
      sub.appendChild(sd);
    }
    container.appendChild(sub);
  }

  if (style !== 'band') {
    container.style.position = 'absolute';
  } else {
    container.style.position = 'absolute';
    container.classList.add('telop-band');
  }

  telopLayer.appendChild(container);
}

function applyStyles(el, styles) {
  if (!styles) return;
  for (const [key, value] of Object.entries(styles)) {
    el.style[key] = value;
  }
}

function drawOverlay() {
  overlayCtx.clearRect(0, 0, FRAME_W, FRAME_H);
  if (!analysis) return;

  if (showGrid.checked) {
    for (const cell of analysis.grid.cells) {
      const alpha = cell.busyness;
      overlayCtx.fillStyle =
        alpha < 0.3
          ? 'rgba(126, 200, 227, 0.12)'
          : alpha > 0.5
            ? 'rgba(201, 168, 76, 0.1)'
            : 'rgba(255, 255, 255, 0.04)';
      overlayCtx.fillRect(cell.x, cell.y, cell.width, cell.height);
      overlayCtx.strokeStyle = 'rgba(255,255,255,0.06)';
      overlayCtx.strokeRect(cell.x, cell.y, cell.width, cell.height);
    }
  }

  if (showZones.checked) {
    for (const area of analysis.readableAreas) {
      overlayCtx.fillStyle = 'rgba(126, 200, 227, 0.1)';
      overlayCtx.strokeStyle = 'rgba(126, 200, 227, 0.45)';
      overlayCtx.lineWidth = 2;
      overlayCtx.fillRect(area.x + 4, area.y + 4, area.width - 8, area.height - 8);
      overlayCtx.strokeRect(area.x + 4, area.y + 4, area.width - 8, area.height - 8);
    }

    if (currentDesign) {
      const pos = currentDesign.position;
      const b = pos.bounds;
      overlayCtx.fillStyle = 'rgba(201, 168, 76, 0.12)';
      overlayCtx.strokeStyle = 'rgba(201, 168, 76, 0.85)';
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([8, 4]);
      overlayCtx.strokeRect(b.x, b.y, b.width, b.height);
      overlayCtx.setLineDash([]);

      const label = `${pos.label} (${pos.score}pt)`;
      overlayCtx.font = '24px "Noto Sans JP", sans-serif';
      overlayCtx.fillStyle = 'rgba(11, 31, 58, 0.85)';
      const tw = overlayCtx.measureText(label).width + 16;
      overlayCtx.fillRect(b.x, b.y - 32, tw, 28);
      overlayCtx.fillStyle = '#C9A84C';
      overlayCtx.fillText(label, b.x + 8, b.y - 10);
    }

    const sx = analysis.subject.x * FRAME_W;
    const sy = analysis.subject.y * FRAME_H;
    overlayCtx.beginPath();
    overlayCtx.arc(sx, sy, 20, 0, Math.PI * 2);
    overlayCtx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
    overlayCtx.lineWidth = 2;
    overlayCtx.stroke();
    overlayCtx.beginPath();
    overlayCtx.moveTo(sx - 28, sy);
    overlayCtx.lineTo(sx + 28, sy);
    overlayCtx.moveTo(sx, sy - 28);
    overlayCtx.lineTo(sx, sy + 28);
    overlayCtx.stroke();
  }
}

function copyCss() {
  if (!currentDesign) return;
  const { css, style, layout } = currentDesign;
  const cssText = `/* 企業ウェビナー字幕 — ${STYLE_LABELS[style]} */
.telop-container {
${objectToCss(css.container, 2)}
}

.telop-line {
${objectToCss(css.mainText, 2)}
}

.telop-sub {
${objectToCss(css.subText, 2)}
}`;

  navigator.clipboard.writeText(cssText).then(() => {
    exportCssBtn.textContent = 'コピーしました';
    setTimeout(() => { exportCssBtn.textContent = 'CSSをコピー'; }, 2000);
  });
}

function objectToCss(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  return Object.entries(obj)
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
      return `${pad}${prop}: ${v};`;
    })
    .join('\n');
}

init();
