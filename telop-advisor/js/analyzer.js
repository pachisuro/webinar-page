/**
 * Canvas-based frame analysis for corporate telop placement.
 */

const FRAME_W = 1920;
const FRAME_H = 1080;
const GRID_COLS = 12;
const GRID_ROWS = 8;

const POSITIONS = [
  { id: 'bottom-left', label: '左下', anchor: 'bl', rowStart: 5, rowEnd: 7, colStart: 0, colEnd: 4 },
  { id: 'bottom-center', label: '中央下', anchor: 'bc', rowStart: 5, rowEnd: 7, colStart: 3, colEnd: 8 },
  { id: 'bottom-right', label: '右下', anchor: 'br', rowStart: 5, rowEnd: 7, colStart: 8, colEnd: 11 },
  { id: 'top-left', label: '左上', anchor: 'tl', rowStart: 0, rowEnd: 2, colStart: 0, colEnd: 4 },
  { id: 'top-center', label: '中央上', anchor: 'tc', rowStart: 0, rowEnd: 2, colStart: 3, colEnd: 8 },
  { id: 'top-right', label: '右上', anchor: 'tr', rowStart: 0, rowEnd: 2, colStart: 8, colEnd: 11 },
  { id: 'center-left', label: '左中央', anchor: 'cl', rowStart: 2, rowEnd: 5, colStart: 0, colEnd: 3 },
  { id: 'center-right', label: '右中央', anchor: 'cr', rowStart: 2, rowEnd: 5, colStart: 9, colEnd: 11 },
];

const POSITION_WEIGHTS = {
  'bottom-center': 1.15,
  'bottom-left': 1.1,
  'bottom-right': 1.1,
  'top-left': 1.0,
  'top-center': 0.95,
  'top-right': 0.95,
  'center-left': 0.85,
  'center-right': 0.85,
};

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function colorDistance(a, b) {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
  );
}

function quantizeColor(r, g, b, step = 32) {
  return {
    r: Math.round(r / step) * step,
    g: Math.round(g / step) * step,
    b: Math.round(b / step) * step,
  };
}

/**
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @returns {Promise<FrameAnalysis>}
 */
export async function analyzeFrame(source) {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, FRAME_W, FRAME_H);
  const imageData = ctx.getImageData(0, 0, FRAME_W, FRAME_H);
  const { data } = imageData;

  const cellW = FRAME_W / GRID_COLS;
  const cellH = FRAME_H / GRID_ROWS;
  const cells = [];
  const colorBuckets = new Map();

  let totalLum = 0;
  let lumSq = 0;
  let pixelCount = 0;
  let edgeSum = 0;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x0 = Math.floor(col * cellW);
      const y0 = Math.floor(row * cellH);
      const x1 = Math.floor((col + 1) * cellW);
      const y1 = Math.floor((row + 1) * cellH);

      let sumR = 0, sumG = 0, sumB = 0, sumL = 0, sumL2 = 0, count = 0;
      let localEdge = 0;

      const step = 4;
      for (let y = y0; y < y1; y += step) {
        for (let x = x0; x < x1; x += step) {
          const i = (y * FRAME_W + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = luminance(r, g, b);

          sumR += r;
          sumG += g;
          sumB += b;
          sumL += lum;
          sumL2 += lum * lum;
          count++;

          if (x + step < x1) {
            const ni = (y * FRAME_W + x + step) * 4;
            localEdge += Math.abs(lum - luminance(data[ni], data[ni + 1], data[ni + 2]));
          }
          if (y + step < y1) {
            const ni = ((y + step) * FRAME_W + x) * 4;
            localEdge += Math.abs(lum - luminance(data[ni], data[ni + 1], data[ni + 2]));
          }

          const q = quantizeColor(r, g, b);
          const key = `${q.r},${q.g},${q.b}`;
          colorBuckets.set(key, (colorBuckets.get(key) || 0) + 1);
        }
      }

      const avgR = sumR / count;
      const avgG = sumG / count;
      const avgB = sumB / count;
      const avgLum = sumL / count;
      const variance = Math.max(0, sumL2 / count - avgLum * avgLum);
      const stdDev = Math.sqrt(variance);
      const busyness = stdDev / 128;
      const edgeDensity = localEdge / (count * 2);

      const cell = {
        row,
        col,
        x: x0,
        y: y0,
        width: x1 - x0,
        height: y1 - y0,
        avgR,
        avgG,
        avgB,
        avgLum,
        variance,
        stdDev,
        busyness,
        edgeDensity,
        saliency: edgeDensity * 0.6 + busyness * 0.4,
      };
      cells.push(cell);

      totalLum += avgLum * count;
      lumSq += sumL2;
      pixelCount += count;
      edgeSum += edgeDensity * count;
    }
  }

  const globalBrightness = totalLum / pixelCount;
  const globalVariance = Math.max(0, lumSq / pixelCount - globalBrightness ** 2);
  const globalContrast = Math.sqrt(globalVariance);
  const globalBusyness = edgeSum / pixelCount;

  const dominantColors = [...colorBuckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      return {
        r, g, b,
        hex: rgbToHex(r, g, b),
        ratio: count / pixelCount,
      };
    });

  const subjectCell = cells.reduce((best, c) =>
    c.saliency > best.saliency ? c : best
  , cells[0]);

  const subjectPosition = {
    x: (subjectCell.col + 0.5) / GRID_COLS,
    y: (subjectCell.row + 0.5) / GRID_ROWS,
    label: describeQuadrant(subjectCell.col, subjectCell.row),
  };

  const positionScores = POSITIONS.map((pos) => {
    const zoneCells = cells.filter(
      (c) =>
        c.row >= pos.rowStart &&
        c.row <= pos.rowEnd &&
        c.col >= pos.colStart &&
        c.col <= pos.colEnd
    );

    const avgBusyness =
      zoneCells.reduce((s, c) => s + c.busyness, 0) / zoneCells.length;
    const avgLum =
      zoneCells.reduce((s, c) => s + c.avgLum, 0) / zoneCells.length;
    const avgSaliency =
      zoneCells.reduce((s, c) => s + c.saliency, 0) / zoneCells.length;

    const zoneCenterX =
      (pos.colStart + pos.colEnd + 1) / 2 / GRID_COLS;
    const zoneCenterY =
      (pos.rowStart + pos.rowEnd + 1) / 2 / GRID_ROWS;
    const distToSubject = Math.hypot(
      zoneCenterX - subjectPosition.x,
      zoneCenterY - subjectPosition.y
    );

    const uniformityScore = 1 - Math.min(1, avgBusyness);
    const saliencyPenalty = Math.min(1, avgSaliency * 1.2);
    const separationBonus = Math.min(1, distToSubject * 1.4) * 0.25;
    const positionBonus = (POSITION_WEIGHTS[pos.id] || 1) - 1;

    const textContrast =
      avgLum > 140
        ? 1 - (avgLum - 140) / 115
        : avgLum < 80
          ? 0.85 + (80 - avgLum) / 200
          : 1;

    const score =
      uniformityScore * 0.38 +
      (1 - saliencyPenalty) * 0.28 +
      separationBonus +
      positionBonus +
      textContrast * 0.2;

    return {
      ...pos,
      score: Math.round(score * 100),
      avgBusyness,
      avgLum,
      avgSaliency,
      zoneCells,
      bounds: computeZoneBounds(zoneCells),
      recommendedStyle: pickStyleForZone(avgBusyness, avgLum, globalBrightness),
    };
  }).sort((a, b) => b.score - a.score);

  const readableAreas = cells
    .filter((c) => c.busyness < 0.35 && c.saliency < 0.45)
    .sort((a, b) => a.busyness - b.busyness)
    .slice(0, 8)
    .map((c) => ({
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height,
      busyness: c.busyness,
      avgLum: c.avgLum,
    }));

  const tone = classifyTone(globalBrightness, dominantColors);
  const contrastLevel =
    globalContrast > 70 ? 'high' : globalContrast > 40 ? 'medium' : 'low';

  return {
    frame: { width: FRAME_W, height: FRAME_H },
    grid: { cols: GRID_COLS, rows: GRID_ROWS, cells },
    global: {
      brightness: Math.round(globalBrightness),
      contrast: Math.round(globalContrast),
      contrastLevel,
      busyness: Math.round(globalBusyness * 100) / 100,
      tone,
      isDark: globalBrightness < 110,
      isBright: globalBrightness > 170,
    },
    colors: {
      dominant: dominantColors,
      palette: buildPalette(dominantColors, tone),
    },
    subject: subjectPosition,
    positions: positionScores,
    recommended: positionScores[0],
    readableAreas,
    canvas,
  };
}

function describeQuadrant(col, row) {
  const h = col < GRID_COLS / 3 ? '左' : col > (GRID_COLS * 2) / 3 ? '右' : '中央';
  const v = row < GRID_ROWS / 3 ? '上' : row > (GRID_ROWS * 2) / 3 ? '下' : '中央';
  if (v === '中央' && h === '中央') return '中央';
  return `${h}${v}`;
}

function computeZoneBounds(cells) {
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const x2 = cells.map((c) => c.x + c.width);
  const y2 = cells.map((c) => c.y + c.height);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...x2) - Math.min(...xs),
    height: Math.max(...y2) - Math.min(...ys),
  };
}

function pickStyleForZone(busyness, avgLum, globalBrightness) {
  if (busyness > 0.42) return 'band';
  if (busyness > 0.22 || (avgLum > 120 && avgLum < 200)) return 'glass';
  return 'simple';
}

function classifyTone(brightness, colors) {
  if (brightness < 90) return 'dark';
  if (brightness > 175) return 'bright';
  const top = colors[0];
  if (top && top.b > top.r && top.b > top.g && top.ratio > 0.15) return 'cool';
  if (top && top.r > 180 && top.g > 180 && top.b > 180) return 'neutral';
  return 'balanced';
}

function buildPalette(dominantColors, tone) {
  const navy = { hex: '#0B1F3A', name: '濃紺' };
  const white = { hex: '#FFFFFF', name: '白' };
  const lightBlue = { hex: '#7EC8E3', name: '水色' };
  const gold = { hex: '#C9A84C', name: 'ゴールド' };

  const bg = dominantColors[0]?.hex || '#888888';
  const textOnDark = white.hex;
  const textOnLight = navy.hex;
  const accent = lightBlue.hex;
  const line = gold.hex;

  return { navy, white, lightBlue, gold, bg, textOnDark, textOnLight, accent, line, tone };
}

export { FRAME_W, FRAME_H, POSITIONS, GRID_COLS, GRID_ROWS };
