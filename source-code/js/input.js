/**
 * ============================================================================
 * CIREBON DASH — MODUL INPUT (js/input.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Mengelola seluruh input kontrol: Keyboard Desktop, Gestur Swipe
 *            Layar Sentuh Mobile, dan Tombol Sentuh Virtual Fallback.
 * ============================================================================
 */

class InputManager {
  /**
   * @param {Object} game - Referensi ke controller utama CirebonGame
   */
  constructor(game) {
    this.game = game;

    // Koordinat pelacakan sentuhan untuk swipe gesture
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.minSwipeDistance = 35; // Jarak minimum pixel agar dianggap swipe
    this.maxSwipeTime = 400;     // Waktu maksimum gesture (ms)

    // Flag pencegahan input ganda per frame
    this.keysPressed = {};

    this.bindKeyboard();
    this.bindTouchGestures();
    this.bindVirtualButtons();
  }

  /**
   * Menghubungkan tombol keyboard desktop
   */
  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Abaikan jika fokus sedang berada pada input text
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const key = e.code;

      // 1. Kontrol Jalur Kiri (A atau Panah Kiri)
      if (key === 'ArrowLeft' || key === 'KeyA') {
        e.preventDefault();
        if (this.game.isRunning()) {
          this.game.player.moveLeft();
        }
      }

      // 2. Kontrol Jalur Kanan (D atau Panah Kanan)
      else if (key === 'ArrowRight' || key === 'KeyD') {
        e.preventDefault();
        if (this.game.isRunning()) {
          this.game.player.moveRight();
        }
      }

      // 3. Kontrol Lompat (Space, Panah Atas, atau W)
      else if (key === 'Space' || key === 'ArrowUp' || key === 'KeyW') {
        e.preventDefault();
        if (this.game.isRunning()) {
          this.game.player.jump();
        }
      }

      // 4. Jeda Permainan (P atau Escape)
      else if (key === 'KeyP' || key === 'Escape') {
        e.preventDefault();
        if (this.game.isRunning()) {
          this.game.pause();
        } else if (this.game.isPaused()) {
          this.game.resume();
        }
      }
    });
  }

  /**
   * Menghubungkan gestur swipe layar sentuh (Mobile)
   */
  bindTouchGestures() {
    const target = this.game.canvas || document.getElementById('game-container');
    if (!target) return;

    target.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
      }
    }, { passive: true });

    target.addEventListener('touchend', (e) => {
      if (!this.game.isRunning()) return;
      if (e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const duration = Date.now() - this.touchStartTime;

      if (duration > this.maxSwipeTime) return;

      const diffX = touchEndX - this.touchStartX;
      const diffY = touchEndY - this.touchStartY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      // Cek apakah jarak memenuhi kriteria swipe
      if (Math.max(absX, absY) >= this.minSwipeDistance) {
        if (absX > absY) {
          // Swipe Horizontal (Perpindahan Jalur)
          if (diffX < 0) {
            this.game.player.moveLeft();
          } else {
            this.game.player.moveRight();
          }
        } else {
          // Swipe Vertikal (Lompat)
          if (diffY < 0) {
            this.game.player.jump();
          }
        }
      }
    }, { passive: true });
  }

  /**
   * Menghubungkan tombol sentuh virtual di layar (Virtual On-Screen Buttons)
   * Berguna untuk smartphone / tablet jika gestur swipe kurang nyaman
   */
  bindVirtualButtons() {
    const btnLeft = document.getElementById('btn-touch-left');
    const btnJump = document.getElementById('btn-touch-jump');
    const btnRight = document.getElementById('btn-touch-right');

    const setupTouchBtn = (element, action) => {
      if (!element) return;
      
      const handlePress = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.game.isRunning()) {
          action();
        }
      };

      element.addEventListener('touchstart', handlePress, { passive: false });
      element.addEventListener('mousedown', handlePress);
    };

    setupTouchBtn(btnLeft, () => this.game.player.moveLeft());
    setupTouchBtn(btnJump, () => this.game.player.jump());
    setupTouchBtn(btnRight, () => this.game.player.moveRight());
  }
}
