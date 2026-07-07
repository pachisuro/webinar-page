import { ANIMATION_DURATION_MS } from './constants.js';

/**
 * 5秒間のアニメーション再生（OBS録画向け・ループなし）
 */
export class AnimationPlayer {
  /**
   * @param {HTMLElement} frameEl - #frame 要素
   * @param {HTMLElement} statusEl - ステータス表示要素
   */
  constructor(frameEl, statusEl) {
    this.frameEl = frameEl;
    this.statusEl = statusEl;
    this.timer = null;
    this.playing = false;
  }

  /** 初期状態にリセット */
  reset() {
    this.stop();
    this.frameEl.classList.remove('is-playing', 'is-finished');
    this.updateStatus('待機中');
  }

  /** 5秒間再生 */
  play() {
    this.stop();
    this.frameEl.classList.remove('is-playing', 'is-finished');
    void this.frameEl.offsetWidth;
    this.frameEl.classList.add('is-playing');
    this.playing = true;
    this.updateStatus('再生中…');

    this.timer = setTimeout(() => {
      this.frameEl.classList.remove('is-playing');
      this.frameEl.classList.add('is-finished');
      this.playing = false;
      this.updateStatus('完了（5秒）');
    }, ANIMATION_DURATION_MS);
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.playing = false;
  }

  updateStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }
}
