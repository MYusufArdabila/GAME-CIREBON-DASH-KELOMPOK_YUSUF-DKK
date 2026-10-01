/**
 * ============================================================================
 * CIREBON DASH — MODUL UI & NAVIGASI (js/ui.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Mengatur navigasi antar-screen, seleksi & pembelian karakter,
 *            modal layout, spotlight SVG render, toast pesan koin, dan HUD.
 * ============================================================================
 */

const UI = (function () {
  'use strict';

  // Daftar ID screen yang tersedia
  const SCREENS = {
    MAIN_MENU: 'screen-main-menu',
    GAMEPLAY: 'screen-gameplay',
    CHARACTER: 'screen-character',
    STORY: 'screen-story',
    HOW_TO_PLAY: 'screen-howtoplay',
    HIGHSCORE: 'screen-highscore',
    SETTINGS: 'screen-settings',
  };

  let screens = {};
  let currentScreenId = SCREENS.MAIN_MENU;
  let currentStoryStep = 1;
  const TOTAL_STORY_STEPS = 5;
  let spotlightCharId = 'arda';

  function enterGameplayFullscreen() {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer || document.fullscreenElement) return;

    const requestFullscreen = gameContainer.requestFullscreen || gameContainer.webkitRequestFullscreen;
    if (requestFullscreen) {
      const request = requestFullscreen.call(gameContainer);
      if (request && typeof request.catch === 'function') request.catch(() => {});
    }
  }

  /**
   * Mengganti screen aktif
   */
  function navigateTo(targetScreenId) {
    if (typeof SoundSystem !== 'undefined') {
      SoundSystem.playClick(580, 0.08);
    }

    Object.values(screens).forEach((screenEl) => {
      if (screenEl) {
        screenEl.classList.remove('active');
      }
    });

    const targetEl = screens[targetScreenId];
    if (targetEl) {
      targetEl.classList.add('active');
      currentScreenId = targetScreenId;

      if (targetScreenId === SCREENS.MAIN_MENU && typeof GameState !== 'undefined') {
        updateMenuCharacterPreview(GameState.selectedCharacter);
      }

      // Sembunyikan Header Top HUD jika sedang di gameplay agar tidak double high score
      const mainTopHud = document.getElementById('main-top-hud');
      if (mainTopHud) {
        if (targetScreenId === SCREENS.GAMEPLAY) {
          mainTopHud.style.display = 'none';
        } else {
          mainTopHud.style.display = 'flex';
        }
      }

      // Jika membuka Character Selection, render ulang data terkini
      if (targetScreenId === SCREENS.CHARACTER) {
        refreshCharacterScreen();
      }
    }
  }

  /**
   * Memperbarui tampilan Top HUD (Koin, High Score, Distance, Total Runs)
   */
  function updateHUD(coins, highScore, maxDistance, totalRuns) {
    const coinEl = document.getElementById('hud-coin-count');
    const highScoreEl = document.getElementById('hud-highscore-count');
    const screenHighScoreEl = document.getElementById('screen-highscore-value');
    const screenCoinsEl = document.getElementById('screen-coins-collected');
    const screenDistanceEl = document.getElementById('screen-furthest-distance');
    const screenRunsEl = document.getElementById('screen-total-runs');

    const formattedCoins = String(coins).padStart(4, '0');
    const formattedHighScore = String(highScore).padStart(4, '0');

    if (coinEl) coinEl.textContent = formattedCoins;
    if (highScoreEl) highScoreEl.textContent = formattedHighScore;
    if (screenHighScoreEl) screenHighScoreEl.textContent = highScore;
    if (screenCoinsEl) screenCoinsEl.textContent = coins;

    const dist = maxDistance !== undefined ? maxDistance : (typeof GameState !== 'undefined' ? GameState.maxDistance : 0);
    const runs = totalRuns !== undefined ? totalRuns : (typeof GameState !== 'undefined' ? GameState.totalRuns : 0);

    if (screenDistanceEl) screenDistanceEl.textContent = `${dist || 0} m`;
    if (screenRunsEl) screenRunsEl.textContent = `${runs || 0} Kali`;
  }

  /**
   * Menampilkan Pesan Toast Singkat di Atas Layar
   */
  function showToast(message, isError = false) {
    let toastEl = document.getElementById('ui-toast-notification');
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'ui-toast-notification';
      toastEl.className = 'ui-toast';
      document.body.appendChild(toastEl);
    }

    toastEl.textContent = message;
    toastEl.className = `ui-toast active ${isError ? 'toast-error' : 'toast-success'}`;

    setTimeout(() => {
      toastEl.classList.remove('active');
    }, 3200);
  }

  /**
   * Memperbarui status visual toggle Settings
   */
  function updateToggleUI(buttonId, isActive) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    const textEl = btn.querySelector('.toggle-text');

    if (isActive) {
      btn.classList.add('active');
      if (textEl) textEl.textContent = 'ON';
    } else {
      btn.classList.remove('active');
      if (textEl) textEl.textContent = 'OFF';
    }
  }

  /**
   * Mengatur langkah slide pada Story Carousel
   */
  function setStoryStep(stepNumber) {
    currentStoryStep = Math.max(1, Math.min(TOTAL_STORY_STEPS, stepNumber));

    const slides = document.querySelectorAll('.story-panel-slide');
    slides.forEach((slide) => {
      const step = parseInt(slide.getAttribute('data-step'), 10);
      if (step === currentStoryStep) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    const dots = document.querySelectorAll('.story-stepper-dots .dot');
    dots.forEach((dot) => {
      const step = parseInt(dot.getAttribute('data-step'), 10);
      if (step === currentStoryStep) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    const btnPrev = document.getElementById('btn-story-prev');
    const btnNext = document.getElementById('btn-story-next');
    const btnPlayDirect = document.getElementById('btn-story-play-direct');

    if (btnPrev) btnPrev.disabled = (currentStoryStep === 1);

    if (currentStoryStep === TOTAL_STORY_STEPS) {
      if (btnNext) btnNext.style.display = 'none';
      if (btnPlayDirect) btnPlayDirect.style.display = 'inline-flex';
    } else {
      if (btnNext) {
        btnNext.style.display = 'inline-flex';
        btnNext.textContent = 'SELANJUTNYA ▶';
      }
      if (btnPlayDirect) btnPlayDirect.style.display = 'none';
    }
  }

  /**
   * Memulai gameplay setelah cerita
   */
  function startRunFromStory() {
    if (typeof GameState !== 'undefined') {
      GameState.setHasSeenStory(true);
    }
    enterGameplayFullscreen();
    navigateTo(SCREENS.GAMEPLAY);
    if (typeof CirebonGame !== 'undefined') {
      CirebonGame.start();
    }
  }

  /**
   * Refresh seluruh UI Screen Karakter (Spotlight & Roster Cards)
   */
  function refreshCharacterScreen() {
    const selected = (typeof GameState !== 'undefined') ? GameState.selectedCharacter : 'arda';
    spotlightCharId = selected;
    updateMenuCharacterPreview(selected);
    updateCharacterSpotlight(spotlightCharId);
    updateRosterCards();
  }

  function updateMenuCharacterPreview(charId) {
    const preview = document.getElementById('runner-character');
    const card = document.getElementById(`card-char-${charId}`);
    const sourceAvatar = card && card.querySelector('.roster-svg-avatar');
    if (!preview || !sourceAvatar) return;

    const avatar = sourceAvatar.cloneNode(true);
    avatar.classList.remove('roster-svg-avatar');
    avatar.classList.add('runner-avatar');
    avatar.setAttribute('aria-hidden', 'true');
    avatar.removeAttribute('width');
    avatar.removeAttribute('height');
    preview.replaceChildren(avatar);
    preview.dataset.character = charId;
  }

  /**
   * Update seluruh kartu roster karakter sesuai status unlock & koin
   */
  function updateRosterCards() {
    if (typeof GameState === 'undefined') return;

    const cards = document.querySelectorAll('.roster-card');
    cards.forEach((card) => {
      const charId = card.getAttribute('data-character');
      const char = GameState.getCharacter(charId);
      if (!char) return;

      const isUnlocked = GameState.isCharacterUnlocked(charId);
      const isSelected = (GameState.selectedCharacter === charId);
      const chip = card.querySelector('.roster-status-chip');
      const watermark = card.querySelector('.lock-watermark');

      if (isUnlocked) {
        card.classList.remove('locked');
        if (watermark) watermark.style.display = 'none';
        if (chip) {
          chip.className = 'roster-status-chip unlocked';
          chip.textContent = isSelected ? 'TERPILIH' : 'UNLOCKED';
        }
      } else {
        card.classList.add('locked');
        if (watermark) watermark.style.display = 'flex';
        if (chip) {
          chip.className = 'roster-status-chip locked';
          chip.textContent = `${char.price} KOIN 🔒`;
        }
      }

      if (isSelected) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  /**
   * Memperbarui Spotlight Karakter Terpilih (Showcase Panel)
   * ROOT CAUSE FIX: Menggunakan .innerHTML untuk SVG, bukan .textContent
   */
  function updateCharacterSpotlight(charId) {
    if (typeof GameState === 'undefined') return;
    spotlightCharId = charId;

    const char = GameState.getCharacter(charId);
    if (!char) return;

    const isUnlocked = GameState.isCharacterUnlocked(charId);
    const isSelected = (GameState.selectedCharacter === charId);

    const elName = document.getElementById('spotlight-name');
    const elBadge = document.getElementById('spotlight-status-badge');
    const elSkillIcon = document.getElementById('spotlight-skill-icon');
    const elSkillName = document.getElementById('spotlight-skill-name');
    const elDesc = document.getElementById('spotlight-desc');
    const elModelBox = document.getElementById('spotlight-model-box');
    const elActionBtn = document.getElementById('btn-spotlight-action');

    if (elName) elName.textContent = char.name;

    if (elBadge) {
      if (isUnlocked) {
        elBadge.textContent = isSelected ? 'TERPILIH' : 'UNLOCKED';
        elBadge.className = 'spotlight-status-badge unlocked';
      } else {
        elBadge.textContent = `LOCKED (${char.price} KOIN)`;
        elBadge.className = 'spotlight-status-badge locked';
      }
    }

    // FIX BUG SVG: Gunakan innerHTML agar SVG dirender sebagai elemen grafis visual!
    if (elSkillIcon) {
      elSkillIcon.innerHTML = char.skillIcon;
    }
    if (elSkillName) {
      elSkillName.textContent = char.skillName;
    }
    if (elDesc) {
      elDesc.textContent = `"${char.profileDesc || char.skillDesc}"`;
    }

    // Ambil visual SVG dari kartu roster terkait
    const sourceCard = document.getElementById(`card-char-${charId}`);
    if (sourceCard && elModelBox) {
      const svg = sourceCard.querySelector('.roster-svg-avatar');
      if (svg) {
        elModelBox.innerHTML = svg.outerHTML;
      }
    }

    // Update Tombol Aksi di Spotlight Panel (PILIH / BELI)
    if (elActionBtn) {
      if (isUnlocked) {
        if (isSelected) {
          elActionBtn.className = 'btn btn-spotlight-action selected';
          elActionBtn.innerHTML = `
            <svg class="game-svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>TERPILIH</span>
          `;
          elActionBtn.disabled = true;
        } else {
          elActionBtn.className = 'btn btn-spotlight-action select';
          elActionBtn.innerHTML = `
            <svg class="game-svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>PILIH KARAKTER</span>
          `;
          elActionBtn.disabled = false;
        }
      } else {
        elActionBtn.className = 'btn btn-spotlight-action buy';
        elActionBtn.innerHTML = `
          <svg class="game-svg-icon hud-svg-coin" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFB703" stroke-width="2.2">
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="5" stroke-dasharray="2 2"/>
            <path d="M12 7v10M9 9.5h6M9 14.5h6"/>
          </svg>
          <span>BELI ${char.price} KOIN</span>
        `;
        elActionBtn.disabled = false;
      }
    }
  }

  /**
   * Menghubungkan seluruh event listener untuk tombol UI
   */
  function bindEventListeners() {
    // 1. PLAY BUTTON di Main Menu -> LANGSUNG MEMULAI GAME DENGAN COUNTDOWN 3-2-1-GO!
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        enterGameplayFullscreen();
        navigateTo(SCREENS.GAMEPLAY);
        if (typeof CirebonGame !== 'undefined') {
          CirebonGame.start();
        }
      });
    }

    // 2. NAVIGASI MENU UTAMA
    const btnCharacter = document.getElementById('btn-character');
    if (btnCharacter) {
      btnCharacter.addEventListener('click', () => {
        navigateTo(SCREENS.CHARACTER);
      });
    }

    const btnStory = document.getElementById('btn-story');
    if (btnStory) {
      btnStory.addEventListener('click', () => {
        setStoryStep(1);
        navigateTo(SCREENS.STORY);
      });
    }

    const btnHowToPlay = document.getElementById('btn-howtoplay');
    if (btnHowToPlay) {
      btnHowToPlay.addEventListener('click', () => {
        navigateTo(SCREENS.HOW_TO_PLAY);
      });
    }

    const btnHighScore = document.getElementById('btn-highscore');
    if (btnHighScore) {
      btnHighScore.addEventListener('click', () => {
        navigateTo(SCREENS.HIGHSCORE);
      });
    }

    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        navigateTo(SCREENS.SETTINGS);
      });
    }

    // 3. SELURUH TOMBOL KEMBALI
    const backButtons = document.querySelectorAll('.btn-back');
    backButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        navigateTo(SCREENS.MAIN_MENU);
      });
    });

    // 4. INTERAKSI TOMBOL AKSI SPOTLIGHT (BELI / PILIH)
    const btnSpotlightAction = document.getElementById('btn-spotlight-action');
    if (btnSpotlightAction) {
      btnSpotlightAction.addEventListener('click', () => {
        const charId = spotlightCharId || 'arda';
        const char = GameState.getCharacter(charId);
        const isUnlocked = GameState.isCharacterUnlocked(charId);

        if (!isUnlocked) {
          // Proses Beli
          const result = GameState.buyCharacter(charId);
          if (result.success) {
            if (typeof SoundSystem !== 'undefined') {
              SoundSystem.playCoin();
            }
            showToast(result.message, false);
            refreshCharacterScreen();
          } else {
            if (typeof SoundSystem !== 'undefined') {
              SoundSystem.playHit();
            }
            showToast(result.message, true);
            // Animasi getar pada kartu terkunci
            const card = document.getElementById(`card-char-${charId}`);
            if (card) {
              card.classList.remove('locked-shake');
              void card.offsetWidth;
              card.classList.add('locked-shake');
            }
          }
        } else {
          // Proses Pilih Karakter
          GameState.setSelectedCharacter(charId);
          if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playClick(720, 0.1);
          }
          showToast(`${char.name} siap digunakan di permainan!`, false);
          refreshCharacterScreen();
        }
      });
    }

    // 5. INTERAKSI KARTU ROSTER KARAKTER
    const rosterCards = document.querySelectorAll('.roster-card');
    rosterCards.forEach((card) => {
      card.addEventListener('click', () => {
        const charId = card.getAttribute('data-character') || 'arda';
        updateCharacterSpotlight(charId);

        // Jika karakter sudah unlocked, langsung pilih juga
        if (GameState.isCharacterUnlocked(charId)) {
          GameState.setSelectedCharacter(charId);
          updateMenuCharacterPreview(GameState.selectedCharacter);
          updateRosterCards();
          updateCharacterSpotlight(charId);
          if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playClick(680, 0.08);
          }
        } else {
          // Bunyi akses terkunci
          if (typeof SoundSystem !== 'undefined') {
            SoundSystem.playClick(240, 0.12);
          }
        }
      });
    });

    // 6. STORY NAVIGATION
    const btnStoryPrev = document.getElementById('btn-story-prev');
    if (btnStoryPrev) {
      btnStoryPrev.addEventListener('click', () => {
        setStoryStep(currentStoryStep - 1);
      });
    }

    const btnStoryNext = document.getElementById('btn-story-next');
    if (btnStoryNext) {
      btnStoryNext.addEventListener('click', () => {
        setStoryStep(currentStoryStep + 1);
      });
    }

    const btnStoryPlayDirect = document.getElementById('btn-story-play-direct');
    if (btnStoryPlayDirect) {
      btnStoryPlayDirect.addEventListener('click', () => {
        startRunFromStory();
      });
    }

    const btnStorySkip = document.getElementById('btn-story-skip-header');
    if (btnStorySkip) {
      btnStorySkip.addEventListener('click', () => {
        startRunFromStory();
      });
    }

    // 7. TOGGLE AUDIO SETTINGS (Settings Screen & Pause Modal)
    const toggleSound = document.getElementById('toggle-sound');
    const pauseToggleSound = document.getElementById('pause-toggle-sound');
    const toggleMusic = document.getElementById('toggle-music');
    const pauseToggleMusic = document.getElementById('pause-toggle-music');
    const settingsVolSlider = document.getElementById('settings-volume-slider');
    const pauseVolSlider = document.getElementById('pause-volume-slider');

    function syncSoundUI(enabled) {
      updateToggleUI('toggle-sound', enabled);
      updateToggleUI('pause-toggle-sound', enabled);
    }

    function syncMusicUI(enabled) {
      updateToggleUI('toggle-music', enabled);
      updateToggleUI('pause-toggle-music', enabled);
    }

    function syncVolumeUI(vol) {
      const pct = Math.round(vol * 100);
      if (settingsVolSlider) settingsVolSlider.value = pct;
      if (pauseVolSlider) pauseVolSlider.value = pct;
    }

    if (toggleSound) {
      toggleSound.addEventListener('click', () => {
        const currentVal = (typeof GameState !== 'undefined' && GameState.settings) ? GameState.settings.sound : true;
        const newState = !currentVal;
        if (typeof GameState !== 'undefined') GameState.setSound(newState);
        syncSoundUI(newState);
      });
    }

    if (pauseToggleSound) {
      pauseToggleSound.addEventListener('click', () => {
        const currentVal = (typeof GameState !== 'undefined' && GameState.settings) ? GameState.settings.sound : true;
        const newState = !currentVal;
        if (typeof GameState !== 'undefined') GameState.setSound(newState);
        syncSoundUI(newState);
      });
    }

    if (toggleMusic) {
      toggleMusic.addEventListener('click', () => {
        const currentVal = (typeof GameState !== 'undefined' && GameState.settings) ? GameState.settings.music : true;
        const newState = !currentVal;
        if (typeof GameState !== 'undefined') GameState.setMusic(newState);
        syncMusicUI(newState);
      });
    }

    if (pauseToggleMusic) {
      pauseToggleMusic.addEventListener('click', () => {
        const currentVal = (typeof GameState !== 'undefined' && GameState.settings) ? GameState.settings.music : true;
        const newState = !currentVal;
        if (typeof GameState !== 'undefined') GameState.setMusic(newState);
        syncMusicUI(newState);
      });
    }

    if (settingsVolSlider) {
      settingsVolSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value) / 100;
        if (typeof GameState !== 'undefined') GameState.setVolume(vol);
        if (pauseVolSlider) pauseVolSlider.value = e.target.value;
      });
    }

    if (pauseVolSlider) {
      pauseVolSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value) / 100;
        if (typeof GameState !== 'undefined') GameState.setVolume(vol);
        if (settingsVolSlider) settingsVolSlider.value = e.target.value;
      });
    }

    // 8. DUKUNGAN KEYBOARD ESCAPE
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (currentScreenId === SCREENS.GAMEPLAY) {
          if (typeof CirebonGame !== 'undefined') {
            if (CirebonGame.isRunning()) {
              CirebonGame.pause();
            } else if (CirebonGame.isPaused()) {
              CirebonGame.resume();
            }
          }
        } else if (currentScreenId !== SCREENS.MAIN_MENU) {
          navigateTo(SCREENS.MAIN_MENU);
        }
      }
    });
  }

  /**
   * Inisialisasi modul UI
   */
  function init() {
    Object.values(SCREENS).forEach((id) => {
      screens[id] = document.getElementById(id);
    });

    bindEventListeners();

    if (typeof GameState !== 'undefined' && GameState.settings) {
      updateToggleUI('toggle-sound', GameState.settings.sound);
      updateToggleUI('pause-toggle-sound', GameState.settings.sound);
      updateToggleUI('toggle-music', GameState.settings.music);
      updateToggleUI('pause-toggle-music', GameState.settings.music);
      const pct = Math.round((GameState.settings.volume !== undefined ? GameState.settings.volume : 0.8) * 100);
      const settingsVol = document.getElementById('settings-volume-slider');
      const pauseVol = document.getElementById('pause-volume-slider');
      if (settingsVol) settingsVol.value = pct;
      if (pauseVol) pauseVol.value = pct;
    }

    refreshCharacterScreen();
    navigateTo(SCREENS.MAIN_MENU);

    console.log('%c[CIREBON DASH]%c UI Module berhasil diinisialisasi.', 'color: #FF6B00; font-weight: bold;', 'color: #FFB703;');
  }

  return {
    init,
    navigateTo,
    updateHUD,
    showToast,
    refreshCharacterScreen,
    updateToggleUI,
    updateCharacterSpotlight,
    setStoryStep,
    SCREENS,
  };
})();
