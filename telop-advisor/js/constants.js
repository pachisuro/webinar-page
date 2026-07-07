export const FRAME_W = 1920;
export const FRAME_H = 1080;

export const CORPORATE = {
  navy: '#0B1F3A',
  navyFilter: 'rgba(11, 31, 58, 1)',
  white: '#FFFFFF',
  lightBlue: '#7EC8E3',
  gold: '#C9A84C',
};

export const FONT_STACK = "'Noto Sans JP', 'BIZ UDPGothic', 'Hiragino Sans', sans-serif";

export const TEMPLATE_TYPES = {
  title: { id: 'title', label: '章タイトル / 扉絵', exportName: 'template-title' },
  simple: { id: 'simple', label: 'シンプル字幕', exportName: 'template-simple' },
  glass: { id: 'glass', label: 'ガラス風カード', exportName: 'template-glass' },
};

export const CHAPTER_PRESETS = [
  { id: '01', number: '01', title: '入庫', subtitle: '荷受け・確認・庫内搬入' },
  { id: '02', number: '02', title: '保管', subtitle: '在庫・一時保管' },
  { id: '03', number: '03', title: '作業', subtitle: '検品・仕分け・出荷準備' },
  { id: '04', number: '04', title: '出庫', subtitle: '積み込み・配送へ' },
];

export const POSITIONS = {
  title: [
    { id: 'bottom-left', label: '左下' },
    { id: 'center-left', label: '中央左' },
  ],
  simple: [
    { id: 'bottom-center', label: '下部中央' },
    { id: 'bottom-left', label: '左下' },
    { id: 'bottom-right', label: '右下' },
  ],
  glass: [
    { id: 'bottom-left', label: '左下' },
    { id: 'bottom-center', label: '下部中央' },
    { id: 'center-left', label: '中央左' },
  ],
};

export const ANIMATION_DURATION_MS = 5000;
