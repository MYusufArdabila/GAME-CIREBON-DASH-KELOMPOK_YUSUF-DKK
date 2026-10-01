/**
 * ============================================================================
 * CIREBON DASH — ENGINE GAME UTAMA (js/game.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Loop animasi requestAnimationFrame, proyeksi 3D/2.5D, lingkungan
 *            bergerak tanpa henti, sistem collision adil (jumpable obstacles),
 *            sistem pengejaran polisi bertingkat kesalahan, skor, koin,
 *            peringatan kereta mendekat, serta penanganan jeda dan Game Over.
 * ============================================================================
 */

// ============================================================================
// POLYFILL CANVAS COMPATIBILITY (Mencegah Crash pada Safari / Mobile Webview)
// ============================================================================
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    if (w < 0) { x += w; w = Math.abs(w); }
    if (h < 0) { y += h; h = Math.abs(h); }
    let r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? (radii[0] || 0) : 0);
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

class GameController {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.resizeHandler = () => this.resizeCanvas();

    // Status Game: 'STOPPED' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'GAMEOVER'
    this.state = 'STOPPED';

    // Statistik & Progres
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.speed = 520;       // Kecepatan awal
    this.baseSpeed = 520;
    this.maxSpeed = 1180;   // Batas atas kecepatan

    // Sistem Pengejaran Polisi (Mistake / Collision Counter)
    this.policeDistance = 88; // 0 (Tertangkap) s/d 100 (Aman / Safe)
    this.policeVoiceTimer = 10 + Math.random() * 8;
    this.policeFlashPhase = 0;
    this.mistakeCooldown = 0;

    // Floating Coin Text Popups
    this.floatingTexts = [];

    // Waktu & Loop
    this.lastTime = 0;
    this.animFrameId = null;

    // Animasi Marka Jalan Bergerak (Seamless 3D World Scrolling)
    this.worldZ = 0;
    this.roadOffset = 0;
    this.cloudOffset = 0;

    // Efek Guncangan Layar (Screen Shake)
    this.shakeIntensity = 0;

    // Inisialisasi Sub-modul
    this.player = new Player(this);
    this.policeOfficer = new PoliceOfficer(this);
    this.obstacleManager = new ObstacleManager(this);
    this.coinManager = new CoinManager(this);
    this.powerUpManager = new PowerUpManager(this);
    this.environmentManager = new EnvironmentManager(this);
    this.inputManager = null;
  }

  /**
   * Inisialisasi Canvas dan Listener Layar
   */
  init() {
    if (this.initialized) return;

    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      console.error('[Game] Elemen #game-canvas tidak ditemukan di DOM.');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    if (typeof InputManager !== 'undefined') {
      this.inputManager = new InputManager(this);
    }

    this.initialized = true;
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('orientationchange', this.resizeHandler);
    document.addEventListener('fullscreenchange', this.resizeHandler);

    this.bindHUDButtons();
    console.log('%c[CIREBON DASH]%c Engine Gameplay siap.', 'color: #FF6B00; font-weight: bold;', 'color: #FFB703;');
  }

  /**
   * Menyesuaikan ukuran canvas tajam & responsive (High-DPI & Multi-device support)
   */
  resizeCanvas() {
    if (!this.canvas) return;
    const container = document.getElementById('game-container') || document.body;
    const rect = container ? container.getBoundingClientRect() : null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = (rect && rect.width > 0) ? rect.width : (window.innerWidth || 800);
    this.height = (rect && rect.height > 0) ? rect.height : (window.innerHeight || 600);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;

    if (this.ctx) {
      if (this.ctx.resetTransform) {
        this.ctx.resetTransform();
      } else {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      this.ctx.scale(dpr, dpr);
    }

    const isPortrait = this.height > this.width;

    // Titik Hilang Perspektif 2.5D (Vanishing Point Horizon)
    this.vanishingY = this.height * (isPortrait ? 0.38 : 0.42);
    this.vanishingX = this.width * 0.5;

    // Koordinat X dasar 3 jalur - responsive portrait vs landscape
    if (isPortrait) {
      this.laneBottomWidth = this.width * 0.88;
    } else {
      this.laneBottomWidth = Math.min(this.width * 0.72, this.height * 1.35);
    }
    this.laneStartX = (this.width - this.laneBottomWidth) / 2;
  }

  scheduleGameLoop() {
    if (this.animFrameId !== null || this.state === 'STOPPED' || this.state === 'PAUSED') return;
    this.animFrameId = requestAnimationFrame((now) => {
      this.animFrameId = null;
      this.gameLoop(now);
    });
  }

  stopGameLoop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Proyeksi Titik 3D ke Layar 2D (Perspective Math)
   */
  project(laneFraction, z, y = 0) {
    if (z < -80) return null;

    const focalLength = 320;
    const depth = Math.max(1, z + focalLength);
    const scale = focalLength / depth;

    const bottomLaneX = this.laneStartX + (laneFraction + 0.5) * (this.laneBottomWidth / 3);
    const screenX = this.vanishingX + (bottomLaneX - this.vanishingX) * scale;

    const groundScreenY = this.vanishingY + (this.height - 20 - this.vanishingY) * scale;
    const screenY = groundScreenY - y * scale;

    return { x: screenX, y: screenY, scale: scale };
  }

  /**
   * Menghubungkan tombol Pause, Resume, Restart, dan Menu
   */
  bindHUDButtons() {
    const btnPause = document.getElementById('btn-game-pause');
    if (btnPause) {
      btnPause.addEventListener('click', () => this.pause());
    }

    const btnResume = document.getElementById('btn-pause-resume');
    if (btnResume) {
      btnResume.addEventListener('click', () => this.resume());
    }

    const btnRestart = document.getElementById('btn-pause-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => this.restart());
    }

    const btnPauseMenu = document.getElementById('btn-pause-menu');
    if (btnPauseMenu) {
      btnPauseMenu.addEventListener('click', () => this.exitToMenu());
    }

    const btnPlayAgain = document.getElementById('btn-gameover-replay');
    if (btnPlayAgain) {
      btnPlayAgain.addEventListener('click', () => this.restart());
    }

    const btnGameOverMenu = document.getElementById('btn-gameover-menu');
    if (btnGameOverMenu) {
      btnGameOverMenu.addEventListener('click', () => this.exitToMenu());
    }
  }

  /**
   * Reset data dan objek gameplay untuk lari baru
   */
  resetGameData() {
    this.distance = 0;
    this.coins = 0;
    this.score = 0;
    this.speed = this.baseSpeed;
    this.worldZ = 0;
    this.shakeIntensity = 0;
    this.policeDistance = 88;
    this.policeVoiceTimer = 10 + Math.random() * 8;
    this.policeFlashPhase = 0;
    this.mistakeCooldown = 0;
    this.floatingTexts = [];

    this.player.reset();
    this.policeOfficer.reset();
    this.obstacleManager.reset();
    this.coinManager.reset();
    this.powerUpManager.reset();
    this.environmentManager.reset();

    // Sesuaikan kecepatan jika karakter AKBAR dipilih (Power Dash)
    if (this.player.charId === 'akbar') {
      this.baseSpeed = 580;
      this.speed = 580;
    } else {
      this.baseSpeed = 520;
      this.speed = 520;
    }

    this.hideAllModals();
    this.syncActiveCharacterHUD();
    this.updateHUD();
  }

  /**
   * Sistem Countdown Responsive (3 -> 2 -> 1 -> GO!)
   * @param {Function} onComplete
   */
  startCountdown(onComplete) {
    this.state = 'COUNTDOWN';
    const overlay = document.getElementById('game-countdown-overlay');
    const numEl = document.getElementById('countdown-display-number');
    const labelEl = document.getElementById('countdown-display-label');

    if (!overlay || !numEl) {
      this.state = 'RUNNING';
      if (onComplete) onComplete();
      return;
    }

    overlay.style.display = 'flex';
    overlay.classList.add('active');

    let count = 3;

    const renderStep = () => {
      // Jika game dihentikan paksa (misal exit to menu)
      if (this.state === 'STOPPED') {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
        return;
      }

      if (count > 0) {
        numEl.textContent = count;
        numEl.className = 'countdown-number count-anim';
        void numEl.offsetWidth; // Trigger reflow animation
        if (labelEl) labelEl.textContent = 'BERSIAP!';
        try {
          if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playCountdownBeep(false);
          }
        } catch (e) {}
        count--;
        setTimeout(renderStep, 950);
      } else if (count === 0) {
        numEl.textContent = 'GO!';
        numEl.className = 'countdown-number go-anim';
        void numEl.offsetWidth;
        if (labelEl) labelEl.textContent = 'LARI!';
        try {
          if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playCountdownBeep(true);
          }
        } catch (e) {}
        count--;
        setTimeout(renderStep, 550);
      } else {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
        this.state = 'RUNNING';
        this.lastTime = performance.now();
        if (onComplete) onComplete();
      }
    };

    renderStep();
  }

  /** Memulai gameplay langsung tanpa countdown. */
  start() {
    this.resizeCanvas();
    this.resetGameData();

    try {
      if (typeof SoundSystem !== 'undefined') {
        SoundSystem.init();
        SoundSystem.playGameplayBGM();
      }
    } catch (e) {
      console.warn('[Audio] BGM start skipped:', e);
    }

    const countdownOverlay = document.getElementById('game-countdown-overlay');
    if (countdownOverlay) {
      countdownOverlay.classList.remove('active');
      countdownOverlay.style.display = 'none';
    }

    this.state = 'RUNNING';
    this.lastTime = performance.now();
    this.stopGameLoop();
    this.scheduleGameLoop();
  }

  /**
   * Sinkronkan Ikon & Nama Skill Karakter Aktif ke HUD
   */
  syncActiveCharacterHUD() {
    const char = GameState.getCharacter(this.player.charId);
    if (!char) return;

    const elSkillVal = document.getElementById('game-hud-skill-val');
    const elSkillIcon = document.getElementById('game-hud-skill-icon');

    if (elSkillVal) elSkillVal.textContent = char.skillName;
    if (elSkillIcon) elSkillIcon.innerHTML = char.skillIcon;
  }

  /**
   * Menghentikan permainan sementara (Pause)
   */
  pause() {
    if (this.state !== 'RUNNING' && this.state !== 'COUNTDOWN') return;
    this.state = 'PAUSED';
    this.stopGameLoop();

    try {
      if (typeof SoundSystem !== 'undefined') {
        SoundSystem.stopPoliceChase();
      }
    } catch (e) {}

    const pauseModal = document.getElementById('modal-pause');
    if (pauseModal) {
      pauseModal.classList.add('active');
    }
  }

  /**
   * Melanjutkan permainan setelah jeda dengan Countdown 3 -> 2 -> 1 -> GO!
   */
  resume() {
    if (this.state !== 'PAUSED') return;

    const pauseModal = document.getElementById('modal-pause');
    if (pauseModal) {
      pauseModal.classList.remove('active');
    }

    this.state = 'COUNTDOWN';
    this.lastTime = performance.now();
    this.stopGameLoop();
    this.scheduleGameLoop();

    this.startCountdown(() => {
      this.state = 'RUNNING';
      this.lastTime = performance.now();
    });
  }

  /**
   * Mengulang permainan dari awal (Restart) dengan Countdown 3 -> 2 -> 1 -> GO!
   */
  restart() {
    this.hideAllModals();
    this.stopGameLoop();

    try {
      if (typeof SoundSystem !== 'undefined') {
        SoundSystem.stopPoliceChase();
        SoundSystem.playGameplayBGM();
      }
    } catch (e) {}

    this.resetGameData();
    const countdownOverlay = document.getElementById('game-countdown-overlay');
    if (countdownOverlay) {
      countdownOverlay.classList.remove('active');
      countdownOverlay.style.display = 'none';
    }

    this.state = 'RUNNING';
    this.lastTime = performance.now();
    this.scheduleGameLoop();
  }

  /**
   * Kembali ke Main Menu
   */
  exitToMenu() {
    this.state = 'STOPPED';
    this.stopGameLoop();
    this.hideAllModals();

    const countdownOverlay = document.getElementById('game-countdown-overlay');
    if (countdownOverlay) {
      countdownOverlay.classList.remove('active');
      countdownOverlay.style.display = 'none';
    }

    if (typeof SoundSystem !== 'undefined') {
      SoundSystem.stopPoliceChase();
      SoundSystem.stopBGM();
    }

    // Simpan hasil lari ke GameState & localStorage
    if (typeof GameState !== 'undefined') {
      GameState.recordRun(this.distance, this.score, this.coins);
    }

    if (typeof UI !== 'undefined') {
      UI.navigateTo('screen-main-menu');
      UI.updateHUD(GameState.coins, GameState.highScore, GameState.maxDistance, GameState.totalRuns);
    }
    if (typeof SoundSystem !== 'undefined') {
      SoundSystem.playLobbyBGM();
    }
  }

  /**
   * Dipanggil saat Player Menabrak Rintangan / Tertangkap Polisi
   */
  gameOver(reason = 'obstacle') {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';

    this.player.hit();
    this.shakeIntensity = 18;
    if (typeof SoundSystem !== 'undefined') {
      SoundSystem.stopBGM();
      SoundSystem.playDeathSound();
    }

    let isNewRecord = false;
    if (typeof GameState !== 'undefined') {
      if (this.score > GameState.highScore) {
        isNewRecord = true;
      }
      GameState.recordRun(this.distance, this.score, this.coins);
    }

    setTimeout(() => {
      this.showGameOverModal(isNewRecord, reason);
    }, 600);
  }

  /**
   * Menampilkan layar modal Game Over beserta statistik lari
   */
  showGameOverModal(isNewRecord, reason = 'obstacle') {
    const modal = document.getElementById('modal-game-over');
    if (!modal) return;

    const elScore = document.getElementById('gameover-score-value');
    const elDist = document.getElementById('gameover-distance-value');
    const elCoins = document.getElementById('gameover-coins-value');
    const elBest = document.getElementById('gameover-best-value');
    const elRecordBadge = document.getElementById('gameover-new-record-badge');
    const elReason = document.getElementById('gameover-reason-text');

    if (elScore) elScore.textContent = this.score;
    if (elDist) elDist.textContent = `${Math.floor(this.distance)} m`;
    if (elCoins) elCoins.textContent = this.coins;
    if (elBest) elBest.textContent = GameState ? GameState.highScore : this.score;

    if (elReason) {
      if (reason === 'caught') {
        elReason.textContent = 'Tertangkap oleh Patroli Polisi Cirebon!';
      } else if (reason === 'train') {
        elReason.textContent = 'Tertabrak Kereta Cirebon Express!';
      } else {
        elReason.textContent = 'Menabrak rintangan di jalanan Cirebon!';
      }
    }

    if (elRecordBadge) {
      elRecordBadge.style.display = isNewRecord ? 'inline-block' : 'none';
    }

    modal.classList.add('active');
  }

  hideAllModals() {
    const pauseModal = document.getElementById('modal-pause');
    const gameOverModal = document.getElementById('modal-game-over');
    if (pauseModal) pauseModal.classList.remove('active');
    if (gameOverModal) gameOverModal.classList.remove('active');
  }

  isRunning() {
    return this.state === 'RUNNING';
  }

  isPaused() {
    return this.state === 'PAUSED';
  }

  /**
   * Peningkatan Kesulitan Bertahap (Speed Scaling)
   */
  increaseDifficulty() {
    const progression = Math.min(1, this.distance / 1200);
    this.speed = this.baseSpeed + (this.maxSpeed - this.baseSpeed) * progression;
  }

  /**
   * Memperbarui Jarak Lari & Dinamika Jarak Polisi
   */
  updateDistance(dt) {
    this.distance += this.speed * dt * 0.038;

    if (this.mistakeCooldown > 0) {
      this.mistakeCooldown -= dt;
    }

    // Pemulihan Jarak Polisi: Jika player berlari mulus, polisi perlahan menjauh (kembali aman)
    if (this.policeDistance < 100 && this.mistakeCooldown <= 0) {
      this.policeDistance = Math.min(100, this.policeDistance + dt * 2.8);
    }

    this.policeFlashPhase = (this.policeFlashPhase + dt * 14) % (Math.PI * 2);

    // Update sistem suara pengejaran polisi (Music/SFX dynamic response)
    if (typeof SoundSystem !== 'undefined') {
      const isChasing = this.policeDistance < 60 || this.mistakeCooldown > 0;
      SoundSystem.updatePoliceChase(isChasing, this.policeDistance);

      this.policeVoiceTimer -= dt;
      if (this.policeVoiceTimer <= 0) {
        SoundSystem.playPoliceVoice();
        this.policeVoiceTimer = 18 + Math.random() * 12;
      }
    }

  }

  /**
   * Memperbarui Skor Akhir: Score = Distance + (Coins * 10)
   */
  updateScore() {
    this.score = Math.floor(this.distance) + this.coins * 10;
  }

  /**
   * Memperbarui Tampilan Gameplay HUD (Koin, Skill, Polisi, Jarak, Speed, High Score)
   */
  updateHUD() {
    const elCoins = document.getElementById('game-hud-coins');
    const elDist = document.getElementById('game-hud-distance');
    const elSpeed = document.getElementById('game-hud-speed');
    const elHighScore = document.getElementById('game-hud-highscore');
    const elPoliceFill = document.getElementById('game-hud-police-fill');
    const elPoliceStatus = document.getElementById('game-hud-police-status');

    if (elCoins) elCoins.textContent = String(this.coins).padStart(4, '0');
    if (elDist) elDist.textContent = `${Math.floor(this.distance)} m`;

    // Speed display yang intuitif
    if (elSpeed) {
      const speedKmH = Math.floor(15 + (this.speed - 520) * 0.045);
      elSpeed.textContent = `${speedKmH} km/h`;
    }

    if (elHighScore) {
      const best = (typeof GameState !== 'undefined') ? Math.max(GameState.highScore, this.score) : this.score;
      elHighScore.textContent = String(best).padStart(4, '0');
    }

    // Indikator Polisi Berdasarkan Jarak
    if (elPoliceFill) {
      const clampedDist = Math.max(6, Math.min(100, this.policeDistance));
      elPoliceFill.style.width = `${clampedDist}%`;

      if (this.policeDistance >= 65) {
        elPoliceFill.className = 'hud-police-fill safe';
        if (elPoliceStatus) elPoliceStatus.textContent = 'SAFE';
      } else if (this.policeDistance >= 35) {
        elPoliceFill.className = 'hud-police-fill warning';
        if (elPoliceStatus) elPoliceStatus.textContent = 'CHASING';
      } else if (this.policeDistance > 12) {
        elPoliceFill.className = 'hud-police-fill very-close';
        if (elPoliceStatus) elPoliceStatus.textContent = 'VERY CLOSE!';
      } else {
        elPoliceFill.className = 'hud-police-fill danger';
        if (elPoliceStatus) elPoliceStatus.textContent = 'DANGER!';
      }
    }

    this.updatePowerupHUD();
  }

  updatePowerupHUD() {
    const magnetSeconds = Math.ceil(this.player.magnetTimer);
    const bootsSeconds = Math.ceil(this.player.highJumpTimer);
    const magnetIndicator = document.getElementById('item-magnet-indicator');
    const bootsIndicator = document.getElementById('item-boots-indicator');
    const magnetTimer = document.getElementById('item-magnet-timer');
    const bootsTimer = document.getElementById('item-boots-timer');

    if (magnetIndicator) magnetIndicator.classList.toggle('active', magnetSeconds > 0);
    if (bootsIndicator) bootsIndicator.classList.toggle('active', bootsSeconds > 0);
    if (magnetTimer) magnetTimer.textContent = magnetSeconds;
    if (bootsTimer) bootsTimer.textContent = bootsSeconds;
  }

  /**
   * Menambahkan Animasi Pop-up Koin "+1" / "+2"
   */
  addCoinPopup(text) {
    const popupEl = document.getElementById('hud-coin-floating-plus');
    if (popupEl) {
      popupEl.textContent = text;
      popupEl.classList.remove('animate');
      void popupEl.offsetWidth; // Trigger reflow
      popupEl.classList.add('animate');
    }
  }

  /**
   * Deteksi Tabrakan Player vs Rintangan & Pengambilan Koin
   * Mendukung Kereta Besar dengan Roof Platform (bisa dinaiki/dilompati)
   */
  checkCollisions() {
    if (this.state !== 'RUNNING') return;

    // 1. Deteksi Tabrakan Player vs Rintangan
    for (const obs of this.obstacleManager.obstacles) {
      if (!obs) continue;
      const absDz = Math.abs(this.player.z - obs.z);
      const laneDist = Math.abs(this.player.currentLaneX - obs.lane);

      if (obs.type === 'train') {
        // Kereta Panjang: zLength = 420, roofHeight = 74, height = 96
        const inTrainZSpan = (this.player.z >= obs.z - 25) && (this.player.z <= obs.z + (obs.zLength || 420) + 15);

        if (laneDist < 0.62 && inTrainZSpan) {
          // Cek apakah player berada di atap kereta (Roof Platform)
          if (this.player.y >= (obs.roofHeight || 74) - 16) {
            // Berhasil mendarat & berlari di atas atap kereta Cirebon!
            obs.isPassed = true;
          } else {
            // Menabrak muka/badan kereta! Cek apakah terselamatkan oleh Shield (ANANDA)
            const savedByShield = this.player.handleCollision();
            if (savedByShield) {
              this.policeDistance = Math.max(15, this.policeDistance - 40);
              this.mistakeCooldown = 3.0;
              obs.isPassed = true;
            } else {
              this.gameOver('train');
              return;
            }
          }
        }
      } else {
        // Rintangan Standar (Barrier, Crate, Gerobak, Tahu Gejrot)
        if (absDz < 26) {
          if (laneDist < 0.58) {
            // Jika rintangan bisa dilompati dan player sedang melompat cukup tinggi:
            if (obs.canJumpOver && this.player.y > (obs.height || 30) * 0.58) {
              obs.isPassed = true; // Berhasil melompati!
            } else {
              // Tabrakan! Cek apakah terselamatkan oleh Shield (ANANDA)
              const savedByShield = this.player.handleCollision();
              if (savedByShield) {
                this.policeDistance = Math.max(15, this.policeDistance - 35);
                this.mistakeCooldown = 3.0;
                obs.isPassed = true;
              } else {
                this.gameOver('obstacle');
                return;
              }
            }
          }
        } else if (absDz < 42 && !obs.isPassed) {
          // Nyaris menyerempet rintangan: Polisi mendekat
          if (laneDist < 0.85 && (!obs.canJumpOver || this.player.y < (obs.height || 30) * 0.5)) {
            this.policeDistance = Math.max(0, this.policeDistance - 0.22);
            if (this.policeDistance <= 0) {
              this.gameOver('caught');
              return;
            }
          }
        }
      }
    }

    // 2. Deteksi Pengambilan Koin
    for (const coin of this.coinManager.coins) {
      if (coin && !coin.collected) {
        const dz = Math.abs(this.player.z - coin.z);
        if (dz < 34) {
          const laneDist = Math.abs(this.player.currentLaneX - coin.lane);
          if (laneDist < 0.65 && Math.abs(this.player.y - coin.y) < 52) {
            coin.collected = true;
            const coinGain = this.player.coinMultiplier || 1;
            this.coins += coinGain;

            // Koin membantu memperlebar jarak dari polisi
            this.policeDistance = Math.min(100, this.policeDistance + 1.5);
            if (typeof SoundSystem !== 'undefined') {
              SoundSystem.playCoin();
            }

            // Animasi Floating Plus di HUD
            this.addCoinPopup(`+${coinGain}`);

            // Partikel di layar
            const pos = this.project(coin.lane, coin.z, coin.y);
            if (pos) {
              this.coinManager.spawnCollectEffect(pos.x, pos.y);
            }
          }
        }
      }
    }

    this.powerUpManager.collectNearby();
  }

  /**
   * Loop Utama Animasi Game (Aktif untuk COUNTDOWN, RUNNING, dan GAMEOVER)
   */
  gameLoop(now) {
    if (this.state === 'STOPPED') return;

    try {
      const dt = Math.min(Math.max(0.001, (now - (this.lastTime || now)) / 1000), 0.1);
      this.lastTime = now;

      if (this.state === 'RUNNING') {
        this.updateDistance(dt);
        this.updateScore();
        this.increaseDifficulty();
        this.updateHUD();

        this.obstacleManager.update(dt, this.speed);
        this.coinManager.update(dt, this.speed);
        this.powerUpManager.update(dt, this.speed);
        this.environmentManager.update(dt, this.speed);
        this.checkCollisions();

        this.worldZ += this.speed * dt;
        this.player.update(dt);
        this.policeOfficer.update(dt);

        this.roadOffset = (this.roadOffset + this.speed * dt * 0.05) % 60;
        this.cloudOffset = (this.cloudOffset + dt * 6) % this.width;
      } else if (this.state === 'COUNTDOWN') {
        // Scene aktif & di-render, player & polisi lari di tempat, awan bergerak santai
        this.updateHUD();
        this.player.animTimer += dt * 10;
        this.policeOfficer.animTimer += dt * 10;
        this.cloudOffset = (this.cloudOffset + dt * 3) % this.width;
      } else if (this.state === 'GAMEOVER') {
        this.player.update(dt);
        this.policeOfficer.update(dt);
      }

      if (this.shakeIntensity > 0) {
        this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 35);
      }

      // Render selalu dipanggil di setiap frame aktif
      this.render();
    } catch (err) {
      console.warn('[GameLoop] Recovered from frame error:', err);
    }

    this.scheduleGameLoop();
  }

  /**
   * Render Seluruh Objek Game ke Canvas
   */
  render() {
    const ctx = this.ctx;
    ctx.save();
    try {
      if (this.shakeIntensity > 0) {
        const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        ctx.translate(shakeX, shakeY);
      }

      ctx.clearRect(0, 0, this.width, this.height);

      // 1. Langit Cirebon
      this.renderSky(ctx);

      // 2. Parallax Skyline: Gunung Ciremai & Awan Mega Mendung
      this.environmentManager.renderSkyline(ctx, this.width, this.height, this.vanishingY, this.speed, this.distance);

      // 3. Jalan Aspal 3 Jalur & Trotoar
      this.renderRoad(ctx);

      // 4. Objek Lingkungan Cirebon
      this.environmentManager.renderEnvironmentObjects(ctx);

      // 5. Rintangan (Palang, Peti, Gerobak, Tahu Gejrot, Kereta)
      this.obstacleManager.render(ctx);

      // 6. Koin Emas & Partikel
      this.coinManager.render(ctx);

      // 6a. Pickup Magnet & Sepatu Lompat Tinggi
      this.powerUpManager.render(ctx);

      // 7. Karakter Player (Runner)
      this.player.render(ctx);

      // 8. Karakter NPC Polisi (Mengejar di Belakang)
      this.policeOfficer.render(ctx);

      // 9. Efek Visual Pengejaran Polisi (Strobo Sirene Bawah Layar)
      this.renderPolicePursuitEffect(ctx);
    } finally {
      ctx.restore();
    }
  }

  /**
   * Render Efek Visual Cahaya Sirene Polisi di Aspal Bawah Layar
   */
  renderPolicePursuitEffect(ctx) {
    if (this.policeDistance >= 70) return;

    const intensity = (70 - this.policeDistance) / 70;
    const flashLeft = Math.sin(this.policeFlashPhase) > 0;
    const flashAlpha = (0.2 + intensity * 0.45);

    ctx.save();
    const bY = this.height;
    const bX = this.width * 0.5;

    const strobeBlueGrad = ctx.createRadialGradient(
      bX - this.width * 0.22, bY, 10,
      bX - this.width * 0.22, bY, this.width * 0.4
    );
    strobeBlueGrad.addColorStop(0, flashLeft ? `rgba(0, 150, 255, ${flashAlpha})` : `rgba(0, 80, 200, ${flashAlpha * 0.3})`);
    strobeBlueGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.fillStyle = strobeBlueGrad;
    ctx.fillRect(0, bY - 140, this.width, 140);

    const strobeRedGrad = ctx.createRadialGradient(
      bX + this.width * 0.22, bY, 10,
      bX + this.width * 0.22, bY, this.width * 0.4
    );
    strobeRedGrad.addColorStop(0, !flashLeft ? `rgba(255, 30, 30, ${flashAlpha})` : `rgba(200, 0, 0, ${flashAlpha * 0.3})`);
    strobeRedGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = strobeRedGrad;
    ctx.fillRect(0, bY - 140, this.width, 140);

    ctx.restore();
  }

  /**
   * Render Langit Cirebon
   */
  renderSky(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.vanishingY);
    grad.addColorStop(0, '#FF7A00');
    grad.addColorStop(0.5, '#FFA834');
    grad.addColorStop(1, '#FFDE8A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.vanishingY);

    // Matahari Horizon
    const sunGrad = ctx.createRadialGradient(
      this.vanishingX, this.vanishingY * 0.7, 5,
      this.vanishingX, this.vanishingY * 0.7, 75
    );
    sunGrad.addColorStop(0, 'rgba(255, 255, 230, 0.9)');
    sunGrad.addColorStop(0.4, 'rgba(255, 183, 3, 0.5)');
    sunGrad.addColorStop(1, 'rgba(255, 122, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(this.vanishingX, this.vanishingY * 0.7, 75, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render Jalan Aspal 3 Jalur & Trotoar
   */
  renderRoad(ctx) {
    const vY = this.vanishingY;
    const bY = this.height;

    // 1. Dasar Bahu Jalan
    const groundGrad = ctx.createLinearGradient(0, vY, 0, bY);
    groundGrad.addColorStop(0, '#101B2B');
    groundGrad.addColorStop(0.5, '#162334');
    groundGrad.addColorStop(1, '#0C141F');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, vY, this.width, bY - vY);

    // 2. Trotoar Paving Kiri
    const pTL_out = this.project(-1.25, 1200, 0);
    const pTL_in  = this.project(-0.5,  1200, 0);
    const pBL_in  = this.project(-0.5,  -60,  0);
    const pBL_out = this.project(-1.25, -60,  0);

    if (pTL_out && pTL_in && pBL_in && pBL_out) {
      const trotoarGradL = ctx.createLinearGradient(0, vY, 0, bY);
      trotoarGradL.addColorStop(0, '#263442');
      trotoarGradL.addColorStop(0.6, '#37474F');
      trotoarGradL.addColorStop(1, '#2B3942');
      ctx.fillStyle = trotoarGradL;
      ctx.beginPath();
      ctx.moveTo(pTL_out.x, pTL_out.y);
      ctx.lineTo(pTL_in.x,  pTL_in.y);
      ctx.lineTo(pBL_in.x,  pBL_in.y);
      ctx.lineTo(pBL_out.x, pBL_out.y);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Trotoar Paving Kanan
    const pTR_in  = this.project(2.5,  1200, 0);
    const pTR_out = this.project(3.25, 1200, 0);
    const pBR_out = this.project(3.25, -60,  0);
    const pBR_in  = this.project(2.5,  -60,  0);

    if (pTR_in && pTR_out && pBR_out && pBR_in) {
      const trotoarGradR = ctx.createLinearGradient(0, vY, 0, bY);
      trotoarGradR.addColorStop(0, '#263442');
      trotoarGradR.addColorStop(0.6, '#37474F');
      trotoarGradR.addColorStop(1, '#2B3942');
      ctx.fillStyle = trotoarGradR;
      ctx.beginPath();
      ctx.moveTo(pTR_in.x,  pTR_in.y);
      ctx.lineTo(pTR_out.x, pTR_out.y);
      ctx.lineTo(pBR_out.x, pBR_out.y);
      ctx.lineTo(pBR_in.x,  pBR_in.y);
      ctx.closePath();
      ctx.fill();
    }

    // 4. Permukaan Aspal Utama 3 Jalur
    const pTL = this.project(-0.5, 1200, 0);
    const pTR = this.project(2.5,  1200, 0);
    const pBR = this.project(2.5,  -60,  0);
    const pBL = this.project(-0.5, -60,  0);

    if (pTL && pTR && pBR && pBL) {
      const roadGrad = ctx.createLinearGradient(0, vY, 0, bY);
      roadGrad.addColorStop(0, '#162438');
      roadGrad.addColorStop(0.4, '#1C2D44');
      roadGrad.addColorStop(0.8, '#142030');
      roadGrad.addColorStop(1, '#0D1520');

      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(pTL.x, pTL.y);
      ctx.lineTo(pTR.x, pTR.y);
      ctx.lineTo(pBR.x, pBR.y);
      ctx.lineTo(pBL.x, pBL.y);
      ctx.closePath();
      ctx.fill();
    }

    // 5. Batu Tepi Trotoar Bergaris Cirebon (Curb Stones)
    const kerbStep = 32;
    const kerbOffset = -(this.worldZ % kerbStep);
    for (let z = -60 + kerbOffset; z < 1050; z += kerbStep) {
      const z1 = z;
      const z2 = z + kerbStep * 0.94;
      const blockIdx = Math.floor((z1 + this.worldZ) / kerbStep);
      const isGold = (blockIdx % 2 === 0);
      const alpha = Math.min(1, Math.max(0, (900 - z1) / 300));

      ctx.fillStyle = isGold ? `rgba(255, 183, 3, ${alpha})` : `rgba(168, 67, 35, ${alpha})`;

      // Curb Kiri
      const kL1_out = this.project(-0.54, z1, 0);
      const kL1_in  = this.project(-0.50, z1, 0);
      const kL2_out = this.project(-0.54, z2, 0);
      const kL2_in  = this.project(-0.50, z2, 0);
      if (kL1_out && kL1_in && kL2_out && kL2_in) {
        ctx.beginPath();
        ctx.moveTo(kL1_out.x, kL1_out.y);
        ctx.lineTo(kL1_in.x,  kL1_in.y);
        ctx.lineTo(kL2_in.x,  kL2_in.y);
        ctx.lineTo(kL2_out.x, kL2_out.y);
        ctx.closePath();
        ctx.fill();
      }

      // Curb Kanan
      const kR1_in  = this.project(2.50, z1, 0);
      const kR1_out = this.project(2.54, z1, 0);
      const kR2_in  = this.project(2.50, z2, 0);
      const kR2_out = this.project(2.54, z2, 0);
      if (kR1_in && kR1_out && kR2_in && kR2_out) {
        ctx.beginPath();
        ctx.moveTo(kR1_in.x,  kR1_in.y);
        ctx.lineTo(kR1_out.x, kR1_out.y);
        ctx.lineTo(kR2_out.x, kR2_out.y);
        ctx.lineTo(kR2_in.x,  kR2_in.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 6. Garis Marka Pembatas 3 Jalur (Kuning Emas)
    const dashSpacing = 52;
    const dashLen = 25;
    const dashOffset = -(this.worldZ % dashSpacing);

    for (let z = -60 + dashOffset; z < 1000; z += dashSpacing) {
      const z1 = z;
      const z2 = z + dashLen;
      const pD1_start = this.project(0.5, z1, 0);
      const pD1_end   = this.project(0.5, z2, 0);
      const pD2_start = this.project(1.5, z1, 0);
      const pD2_end   = this.project(1.5, z2, 0);

      if (pD1_start && pD1_end && pD2_start && pD2_end) {
        const alpha = Math.min(0.9, Math.max(0, (850 - z1) / 300));
        const w = Math.max(1.5, 4 * pD1_start.scale);
        ctx.strokeStyle = `rgba(255, 183, 3, ${alpha})`;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(pD1_start.x, pD1_start.y);
        ctx.lineTo(pD1_end.x, pD1_end.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pD2_start.x, pD2_start.y);
        ctx.lineTo(pD2_end.x, pD2_end.y);
        ctx.stroke();
      }
    }
  }
}

// Instance Tunggal CirebonGame
const CirebonGame = new GameController();
