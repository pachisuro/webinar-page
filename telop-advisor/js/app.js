import {
  CHAPTER_PRESETS, POSITIONS,
} from './constants.js';
import { renderTemplate, getExportFilename } from './templates.js';
import { exportToPng, exportViaOffscreen } from './export.js';
import { AnimationPlayer } from './animation.js';

const $ = (sel) => document.querySelector(sel);

const fileInput = $('#fileInput');
const uploadZone = $('#uploadZone');
const uploadPlaceholder = $('#uploadPlaceholder');
const thumbPreview = $('#thumbPreview');
const sampleBtn = $('#sampleBtn');
const filterSlider = $('#filterSlider');
const filterValue = $('#filterValue');
const filterLayer = $('#filterLayer');
const templateSelect = $('#templateSelect');
const chapterPreset = $('#chapterPreset');
const chapterPresetField = $('#chapterPresetField');
const mainText = $('#mainText');
const mainLabel = $('#mainLabel');
const chapterNumber = $('#chapterNumber');
const numberField = $('#numberField');
const subText = $('#subText');
const positionSelect = $('#positionSelect');
const useBand = $('#useBand');
const bandToggleField = $('#bandToggleField');
const exportMode = $('#exportMode');
const exportPngBtn = $('#exportPngBtn');
const playAnimBtn = $('#playAnimBtn');
const resetAnimBtn = $('#resetAnimBtn');
const animStatus = $('#animStatus');
const previewStage = $('#previewStage');
const frame = $('#frame');
const bgCanvas = $('#bgCanvas');
const contentLayer = $('#contentLayer');

let currentImage = null;
const bgCtx = bgCanvas.getContext('2d');
let animPlayer = null;

function init() {
  populateChapterPresets();
  populatePositions();
  bindEvents();
  resizePreview();
  window.addEventListener('resize', resizePreview);
  animPlayer = new AnimationPlayer(frame, animStatus);
  updateFilter();
  onTemplateChange();
  render();
}

function populateChapterPresets() {
  chapterPreset.innerHTML = CHAPTER_PRESETS.map(
    (p) => `<option value="${p.id}">${p.number} ${p.title}</option>`
  ).join('');
}

function populatePositions() {
  const type = templateSelect.value;
  const positions = POSITIONS[type] || POSITIONS.title;
  positionSelect.innerHTML = positions.map(
    (p) => `<option value="${p.id}">${p.label}</option>`
  ).join('');
}

function getState() {
  const templateType = templateSelect.value;
  const posMap = {
    'bottom-left': 'bl',
    'center-left': 'cl',
    'bottom-center': 'bc',
    'bottom-right': 'br',
  };
  return {
    templateType,
    mainText: mainText.value,
    subText: subText.value,
    chapterNumber: chapterNumber.value,
    position: posMap[positionSelect.value] || positionSelect.value,
    useBand: useBand.checked,
    filterOpacity: filterSlider.value / 100,
    bgImage: currentImage,
    filename: getExportFilename(templateType, chapterNumber.value),
    withBackground: exportMode.value === 'with-bg',
  };
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
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) loadFile(file);
  });

  sampleBtn.addEventListener('click', loadSample);
  filterSlider.addEventListener('input', updateFilter);
  templateSelect.addEventListener('change', onTemplateChange);
  chapterPreset.addEventListener('change', applyChapterPreset);
  mainText.addEventListener('input', render);
  subText.addEventListener('input', render);
  chapterNumber.addEventListener('input', render);
  positionSelect.addEventListener('change', render);
  useBand.addEventListener('change', render);

  exportPngBtn.addEventListener('click', handleExport);
  playAnimBtn.addEventListener('click', () => animPlayer.play());
  resetAnimBtn.addEventListener('click', () => animPlayer.reset());
}

function onTemplateChange() {
  const type = templateSelect.value;
  populatePositions();

  const isTitle = type === 'title';
  chapterPresetField.classList.toggle('hidden', !isTitle);
  numberField.classList.toggle('hidden', !isTitle);
  bandToggleField.classList.toggle('hidden', type !== 'simple');

  mainLabel.textContent = isTitle ? '章名' : 'メイン字幕';

  if (isTitle) applyChapterPreset();
  else render();
}

function applyChapterPreset() {
  const preset = CHAPTER_PRESETS.find((p) => p.id === chapterPreset.value);
  if (!preset) return;
  chapterNumber.value = preset.number;
  mainText.value = preset.title;
  subText.value = preset.subtitle;
  render();
}

function updateFilter() {
  const pct = filterSlider.value;
  filterValue.textContent = pct;
  filterLayer.style.background = `rgba(11, 31, 58, ${pct / 100})`;
  drawBackground();
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
    await loadImageFromUrl(url);
    thumbPreview.src = url;
    thumbPreview.classList.remove('hidden');
    uploadPlaceholder.classList.add('hidden');
  } catch (err) {
    alert('画像の読み込みに失敗しました');
  }
}

async function loadSample() {
  try {
    await loadImageFromUrl('sample/frame.png');
    thumbPreview.src = 'sample/frame.png';
    thumbPreview.classList.remove('hidden');
    uploadPlaceholder.classList.add('hidden');
  } catch {
    alert('サンプル画像の読み込みに失敗しました');
  }
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      drawBackground();
      render();
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
}

function drawBackground() {
  bgCtx.fillStyle = '#1a2840';
  bgCtx.fillRect(0, 0, FRAME_W, FRAME_H);
  if (currentImage) {
    bgCtx.drawImage(currentImage, 0, 0, FRAME_W, FRAME_H);
  }
}

function render() {
  const state = getState();
  contentLayer.innerHTML = renderTemplate(state);
}

async function handleExport() {
  const state = getState();
  exportPngBtn.disabled = true;
  exportPngBtn.textContent = '書き出し中…';

  try {
    frame.classList.remove('is-playing');
    await new Promise((r) => requestAnimationFrame(r));

    if (state.withBackground && !currentImage) {
      drawBackground();
    }

    try {
      await exportToPng({
        bgCanvas,
        filterOpacity: state.filterOpacity,
        contentLayer,
        withBackground: state.withBackground,
        filename: state.filename,
      });
    } catch {
      await exportViaOffscreen(state, renderTemplate);
    }

    exportPngBtn.textContent = '保存しました';
    setTimeout(() => { exportPngBtn.textContent = 'PNG書き出し（1920×1080）'; }, 2000);
  } catch (err) {
    alert('PNG書き出しに失敗しました: ' + err.message);
    exportPngBtn.textContent = 'PNG書き出し（1920×1080）';
  } finally {
    exportPngBtn.disabled = false;
  }
}

init();
