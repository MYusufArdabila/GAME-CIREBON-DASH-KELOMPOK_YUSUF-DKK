/**
 * ============================================================================
 * CIREBON DASH — AUDIO SYSTEM (js/audio.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Mengelola Musik Latar Stasiun Cirebon (BGM) dan Efek Suara (SFX).
 *            Mendukung file audio eksternal (public/assets/audio/bgm-cirebon.mp3
 *            dan public/assets/audio/police-chase.mp3) serta memiliki
 *            fallback sintesis Web Audio API otomatis (zero-error/zero-crash).
 * ============================================================================
 */

const SoundSystem = (function () {
  'use strict';

  let audioCtx = null;
  let bgmAudioEl = null;
  let deathAudioEl = null;
  let policeAudioEl = null;
  let policeVoiceAudioEl = null;
  let isBgmPlaying = false;
  let isPoliceChasing = false;
  let currentMusicMode = 'lobby';
  let synthBgmInterval = null;
  let synthPoliceInterval = null;

  // Daftar lokasi file audio eksternal (diprioritaskan, fallback aman jika belum ada)
  const AUDIO_PATHS = {
    bgmLobby: 'assets/audio/Bel stasiun Cirebon Kota Cirebon Instrumental.mp3',
    bgmGameplay: 'assets/audio/Subway Surfers_ (Main Theme)_ 2012 Original [OFFICIAL].mp3',
    death: 'assets/audio/Subway Surfers - Death Sound.mp3',
    policeVoice: 'assets/audio/Subway Surfers Heuh Whistle Police Man Sound.mp3',
    policeChase: ['public/assets/audio/police-chase.mp3', 'assets/audio/police-chase.mp3', 'public/assets/audio/police.mp3', 'assets/audio/police.mp3'],
    coin: ['public/assets/audio/coin.mp3', 'assets/audio/coin.mp3'],
    jump: ['public/assets/audio/jump.mp3', 'assets/audio/jump.mp3'],
    hit: ['public/assets/audio/hit.mp3', 'assets/audio/hit.mp3'],
    train: ['public/assets/audio/train.mp3', 'assets/audio/train.mp3'],
    click: ['public/assets/audio/click.mp3', 'assets/audio/click.mp3'],
    shield: ['public/assets/audio/shield.mp3', 'assets/audio/shield.mp3']
  };

  /**
   * Inisialisasi AudioContext browser secara aman setelah user interaction
   */
  function initContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  function isSoundEnabled() {
    return (typeof GameState !== 'undefined' && GameState.settings) ? GameState.settings.sound : true;
  }

  function isMusicEnabled() {
    return (typeof GameState !== 'undefined' && GameState.settings) ? GameState.settings.music : true;
  }

  function getVolume() {
    return (typeof GameState !== 'undefined' && GameState.settings && GameState.settings.volume !== undefined)
      ? Math.max(0, Math.min(1, GameState.settings.volume))
      : 0.8;
  }

  /**
   * Helper untuk memutar file audio eksternal dengan fallback
   */
  function tryPlayAudioList(sources, onFallback, volume = 0.7) {
    if (!sources || sources.length === 0) {
      if (onFallback) onFallback();
      return;
    }

    const currentSrc = sources[0];
    const audio = new Audio(currentSrc);
    audio.volume = Math.max(0, Math.min(1, volume * getVolume()));

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Coba sumber berikutnya jika ada
        if (sources.length > 1) {
          tryPlayAudioList(sources.slice(1), onFallback, volume);
        } else if (onFallback) {
          onFallback();
        }
      });
    }
  }

  /**
   * Putar Musik Latar Stasiun Cirebon (BGM)
   * Hanya dipanggil setelah interaksi pemain (Play / Resume)
   */
  function playBGM(mode = currentMusicMode) {
    currentMusicMode = mode === 'gameplay' ? 'gameplay' : 'lobby';
    if (!isMusicEnabled()) {
      stopBGM();
      return;
    }
    initContext();

    if (!bgmAudioEl) {
      bgmAudioEl = new Audio();
      bgmAudioEl.loop = true;
      bgmAudioEl.preload = 'auto';
      bgmAudioEl.addEventListener('error', () => {
        const expectedPath = AUDIO_PATHS[currentMusicMode === 'lobby' ? 'bgmLobby' : 'bgmGameplay'];
        if (isMusicEnabled() && bgmAudioEl.src === new URL(expectedPath, document.baseURI).href) {
          startSynthBGM();
        }
      });
    }

    const trackPath = AUDIO_PATHS[currentMusicMode === 'lobby' ? 'bgmLobby' : 'bgmGameplay'];
    const trackUrl = new URL(trackPath, document.baseURI).href;
    stopSynthBGM();

    if (bgmAudioEl.src !== trackUrl) {
      bgmAudioEl.pause();
      bgmAudioEl.currentTime = 0;
      bgmAudioEl.src = trackPath;
      bgmAudioEl.load();
    }

    bgmAudioEl.loop = true;
    bgmAudioEl.volume = 0.55 * getVolume();
    if (!bgmAudioEl.paused) return;

    const playPromise = bgmAudioEl.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        isBgmPlaying = true;
      }).catch(() => {
        isBgmPlaying = false;
      });
    }
  }

  function playLobbyBGM() {
    playBGM('lobby');
  }

  function playGameplayBGM() {
    playBGM('gameplay');
  }

  function retryBGMPlayback() {
    if (isMusicEnabled() && bgmAudioEl && bgmAudioEl.paused) {
      playBGM(currentMusicMode);
    }
  }

  document.addEventListener('pointerdown', retryBGMPlayback, { passive: true });
  document.addEventListener('keydown', retryBGMPlayback);

  /**
   * Hentikan Musik Latar (BGM)
   */
  function stopBGM() {
    if (bgmAudioEl) {
      try {
        bgmAudioEl.pause();
        bgmAudioEl.currentTime = 0;
      } catch (e) {}
    }
    stopSynthBGM();
    isBgmPlaying = false;
  }

  /**
   * Perbarui volume BGM saat slider digeser
   */
  function updateVolume(vol) {
    const clamped = Math.max(0, Math.min(1, vol));
    if (bgmAudioEl) {
      bgmAudioEl.volume = 0.55 * clamped;
    }
    if (policeAudioEl) {
      policeAudioEl.volume = 0.65 * clamped;
    }
    if (deathAudioEl) {
      deathAudioEl.volume = 0.8 * clamped;
    }
  }

  /**
   * Synth BGM Berirama Tradisional Cirebon (Pentatonic Salendro/Pelog Enerjik)
   * Memberikan atmosfer game hidup tanpa file audio eksternal
   */
  function startSynthBGM() {
    if (synthBgmInterval || !isMusicEnabled()) return;
    initContext();
    if (!audioCtx) return;

    isBgmPlaying = true;
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C D E G A C pentatonic
    let step = 0;

    synthBgmInterval = setInterval(() => {
      if (!isMusicEnabled() || !isBgmPlaying) {
        stopSynthBGM();
        return;
      }
      try {
        if (audioCtx.state === 'suspended') return;
        const now = audioCtx.currentTime;
        const vol = getVolume();

        // Bass beat
        if (step % 2 === 0) {
          const bassOsc = audioCtx.createOscillator();
          const bassGain = audioCtx.createGain();
          bassOsc.type = 'triangle';
          bassOsc.frequency.setValueAtTime(step % 4 === 0 ? 130.81 : 146.83, now);
          bassGain.gain.setValueAtTime(0.04 * vol, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          bassOsc.connect(bassGain);
          bassGain.connect(audioCtx.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 0.18);
        }

        // Melodic gamelan-like chime
        const noteIdx = [0, 2, 3, 4, 2, 3, 5, 4][step % 8];
        const freq = scale[noteIdx];
        const melOsc = audioCtx.createOscillator();
        const melGain = audioCtx.createGain();
        melOsc.type = 'sine';
        melOsc.frequency.setValueAtTime(freq, now);
        melGain.gain.setValueAtTime(0.025 * vol, now);
        melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        melOsc.connect(melGain);
        melGain.connect(audioCtx.destination);
        melOsc.start(now);
        melOsc.stop(now + 0.22);

        step++;
      } catch (e) {}
    }, 220);
  }

  function stopSynthBGM() {
    if (synthBgmInterval) {
      clearInterval(synthBgmInterval);
      synthBgmInterval = null;
    }
  }

  /**
   * Sistem Suara Pengejaran Polisi (Police Chase Sound)
   * Aktif saat player melakukan kesalahan / polisi mendekat (policeChase = true)
   * Berhenti / fade out saat polisi sudah kembali jauh (policeChase = false / SAFE)
   */
  function updatePoliceChase(isChasing, distance = 88) {
    if (!isSoundEnabled()) {
      stopPoliceChase();
      return;
    }

    if (isChasing && !isPoliceChasing) {
      isPoliceChasing = true;
      initContext();

      if (!policeAudioEl) {
        policeAudioEl = new Audio(AUDIO_PATHS.policeChase[0]);
        policeAudioEl.loop = true;
      }
      policeAudioEl.volume = Math.max(0.1, Math.min(0.8, (70 - distance) / 70)) * getVolume();

      const p = policeAudioEl.play();
      if (p !== undefined) {
        p.catch(() => {
          startSynthPoliceSiren();
        });
      }
    } else if (isChasing && isPoliceChasing) {
      // Update intensitas volume polisi sesuai jarak
      if (policeAudioEl) {
        policeAudioEl.volume = Math.max(0.15, Math.min(0.85, (75 - distance) / 75)) * getVolume();
      }
    } else if (!isChasing && isPoliceChasing) {
      stopPoliceChase();
    }
  }

  function stopPoliceChase() {
    if (policeAudioEl) {
      try {
        policeAudioEl.pause();
        policeAudioEl.currentTime = 0;
      } catch (e) {}
    }
    stopSynthPoliceSiren();
    isPoliceChasing = false;
  }

  function playPoliceVoice() {
    if (!isSoundEnabled()) return;
    if (!policeVoiceAudioEl) {
      policeVoiceAudioEl = new Audio(AUDIO_PATHS.policeVoice);
      policeVoiceAudioEl.preload = 'auto';
    }
    if (!policeVoiceAudioEl.paused) return;

    policeVoiceAudioEl.volume = 0.72 * getVolume();
    policeVoiceAudioEl.currentTime = 0;
    const playPromise = policeVoiceAudioEl.play();
    if (playPromise !== undefined) playPromise.catch(() => {});
  }

  function startSynthPoliceSiren() {
    if (synthPoliceInterval || !isSoundEnabled()) return;
    initContext();
    if (!audioCtx) return;

    let sirenPhase = 0;
    synthPoliceInterval = setInterval(() => {
      if (!isPoliceChasing || !isSoundEnabled()) {
        stopSynthPoliceSiren();
        return;
      }
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        const f = sirenPhase % 2 === 0 ? 680 : 920;
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.06 * getVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
        sirenPhase++;
      } catch (e) {}
    }, 380);
  }

  function stopSynthPoliceSiren() {
    if (synthPoliceInterval) {
      clearInterval(synthPoliceInterval);
      synthPoliceInterval = null;
    }
  }

  /**
   * Efek Suara Hitung Mundur (Countdown Beep 3-2-1-GO)
   */
  function playCountdownBeep(isFinal = false) {
    if (!isSoundEnabled()) return;
    initContext();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;
      const vol = getVolume();

      if (!isFinal) {
        // Nada Beep 3, 2, 1 (520 Hz)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        gain.gain.setValueAtTime(0.18 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else {
        // Nada Kemenangan Mulai 'GO!' (Chord C Major 523Hz + 659Hz + 783Hz)
        [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.03);
          gain.gain.setValueAtTime(0.14 * vol, now + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.03);
          osc.stop(now + 0.55);
        });
      }
    } catch (e) {}
  }

  /**
   * Efek Suara Lompat (Jump)
   */
  function playJump() {
    if (!isSoundEnabled()) return;
    initContext();
    tryPlayAudioList(AUDIO_PATHS.jump, () => {
      if (!audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.15);
        gain.gain.setValueAtTime(0.14 * getVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {}
    });
  }

  /**
   * Efek Suara Ambil Koin (Coin)
   */
  function playCoin() {
    if (!isSoundEnabled()) return;
    initContext();
    tryPlayAudioList(AUDIO_PATHS.coin, () => {
      if (!audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.05); // E6
        gain.gain.setValueAtTime(0.12 * getVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      } catch (e) {}
    });
  }

  /**
   * Efek Suara Tabrakan (Hit / Crash)
   */
  function playHit() {
    if (!isSoundEnabled()) return;
    initContext();
    tryPlayAudioList(AUDIO_PATHS.hit, () => {
      if (!audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);
        gain.gain.setValueAtTime(0.25 * getVolume(), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } catch (e) {}
    });
  }

  function playDeathSound() {
    if (!isSoundEnabled()) return;
    if (!deathAudioEl) {
      deathAudioEl = new Audio(AUDIO_PATHS.death);
      deathAudioEl.preload = 'auto';
    }

    deathAudioEl.volume = 0.8 * getVolume();
    deathAudioEl.currentTime = 0;
    const playPromise = deathAudioEl.play();
    if (playPromise !== undefined) playPromise.catch(() => {});
  }

  /**
   * Efek Suara Klakson Kereta Cirebon (Train Horn)
   */
  function playTrainHorn() {
    if (!isSoundEnabled()) return;
    initContext();
    tryPlayAudioList(AUDIO_PATHS.train, () => {
      if (!audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const vol = getVolume();
        [293.66, 369.99].forEach((freq) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.1 * vol, now);
          gain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        });
      } catch (e) {}
    });
  }

  /**
   * Efek Suara Perisai Pecah / Shield Save (ANANDA)
   */
  function playShieldBreak() {
    if (!isSoundEnabled()) return;
    initContext();
    try {
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.2);
      gain.gain.setValueAtTime(0.2 * getVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  /**
   * Efek Suara Klik Tombol UI
   */
  function playClick(pitch = 540, duration = 0.08) {
    if (!isSoundEnabled()) return;
    initContext();
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.4, now + duration);
      gain.gain.setValueAtTime(0.1 * getVolume(), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  return {
    init: initContext,
    playBGM,
    playLobbyBGM,
    playGameplayBGM,
    stopBGM,
    updateVolume,
    updatePoliceChase,
    playPoliceVoice,
    stopPoliceChase,
    playCountdownBeep,
    playJump,
    playCoin,
    playHit,
    playDeathSound,
    playTrainHorn,
    playShieldBreak,
    playClick
  };
})();
