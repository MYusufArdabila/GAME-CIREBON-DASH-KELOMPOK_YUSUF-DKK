/**
 * ============================================================================
 * CIREBON DASH — ENTRY POINT UTAMA & GAME STATE (js/main.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Mengelola Game State (skor, koin, karakter unlocked/selected,
 *            sistem pembelian/unlock karakter, audio settings), penyimpanan
 *            lokal (localStorage), dan inisialisasi awal saat DOM dimuat.
 * ============================================================================
 */

const GameState = (function () {
  'use strict';

  const STORAGE_KEY = 'cirebon_dash_save_v3';

  // Metadata lengkap 4 karakter Cirebon Dash
  const CHARACTERS_DATA = {
    arda: {
      id: 'arda',
      name: 'ARDA',
      gender: 'male',
      title: 'Pelari Utama',
      status: 'unlocked', // Free / Default
      price: 0,
      skillId: 'magnet',
      skillName: 'MAGNET',
      skillIcon: `<svg class="game-svg-icon icon-magnet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6a6 6 0 0 0 12 0V3"/><line x1="4" y1="3" x2="8" y2="3"/><line x1="16" y1="3" x2="20" y2="3"/><line x1="4" y1="8" x2="8" y2="8"/><line x1="16" y1="8" x2="20" y2="8"/><path d="M12 18v3" stroke="#38BDF8"/><path d="M9 20l3 3 3-3" stroke="#38BDF8"/></svg>`,
      skillDesc: 'Menarik coin di sekitar ARDA secara otomatis dalam radius tertentu.',
      profileDesc: 'Pelari tangkas Cirebon dengan kemampuan Magnet bawaan yang menarik koin secara otomatis.',
      themeColor: '#FF6B00',
      accentColor: '#FFB703',
      speedRating: '⭐⭐⭐⭐⭐',
      role: 'Main Runner'
    },
    akbar: {
      id: 'akbar',
      name: 'AKBAR',
      gender: 'male',
      title: 'Pelari Cepat',
      status: 'locked',
      price: 500,
      skillId: 'power_dash',
      skillName: 'POWER DASH',
      skillIcon: `<svg class="game-svg-icon icon-dash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      skillDesc: 'Memberikan akselerasi lari ekstra dan kecepatan maksimal lebih tinggi.',
      profileDesc: 'Pelari agresif berdaya ledak tinggi dengan skill Power Dash untuk kecepatan maksimal.',
      themeColor: '#E74C3C',
      accentColor: '#F39C12',
      speedRating: '⭐⭐⭐⭐⭐',
      role: 'Speed Specialist'
    },
    apiz: {
      id: 'apiz',
      name: 'APIZ',
      gender: 'male',
      title: 'Ahli Koin',
      status: 'locked',
      price: 750,
      skillId: 'coin_boost',
      skillName: 'COIN BOOST',
      skillIcon: `<svg class="game-svg-icon icon-coin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" stroke-dasharray="2 2"/><path d="M12 7v10M9 9.5h6M9 14.5h6"/></svg>`,
      skillDesc: 'Memberikan bonus ganda (2x Koin) untuk setiap koin yang berhasil dikumpulkan!',
      profileDesc: 'Kolektor koin cerdik yang melipatgandakan perolehan setiap koin di lintasan.',
      themeColor: '#27AE60',
      accentColor: '#2ECC71',
      speedRating: '⭐⭐⭐⭐',
      role: 'Coin Master'
    },
    ananda: {
      id: 'ananda',
      name: 'ANANDA',
      gender: 'female',
      title: 'Pelari Tangguh (Perempuan)',
      status: 'locked',
      price: 1000,
      skillId: 'shield',
      skillName: 'SHIELD',
      skillIcon: `<svg class="game-svg-icon icon-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/></svg>`,
      skillDesc: 'Membawa perisai gaib yang menyerap 1 kali tabrakan obstacle tanpa langsung game over!',
      profileDesc: 'Pelari perempuan tangguh dengan pelindung Shield sakti yang menyerap tabrakan rintangan.',
      themeColor: '#8E44AD',
      accentColor: '#C084FC',
      speedRating: '⭐⭐⭐⭐',
      role: 'Shield Defender (Female)'
    }
  };

  // Data default game Cirebon Dash
  let state = {
    coins: 0,
    highScore: 0,
    maxDistance: 0,
    totalRuns: 0,
    settings: {
      sound: true,
      music: true,
      volume: 0.8,
    },
    unlockedCharacters: ['arda'],
    selectedCharacter: 'arda',
    hasSeenStory: false,
  };

  /**
   * Sinkronkan status data CHARACTERS_DATA dengan unlockedCharacters di state
   */
  function syncCharactersStatus() {
    // ARDA selalu unlocked
    if (!state.unlockedCharacters.includes('arda')) {
      state.unlockedCharacters.push('arda');
    }

    Object.keys(CHARACTERS_DATA).forEach((charId) => {
      if (state.unlockedCharacters.includes(charId)) {
        CHARACTERS_DATA[charId].status = 'unlocked';
      } else {
        CHARACTERS_DATA[charId].status = 'locked';
      }
    });

    // Pastikan selected character benar-benar unlocked
    if (!state.unlockedCharacters.includes(state.selectedCharacter)) {
      state.selectedCharacter = 'arda';
    }
  }

  /**
   * Membaca data yang tersimpan dari LocalStorage browser
   */
  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = {
          ...state,
          ...parsed,
          settings: {
            ...state.settings,
            ...(parsed.settings || {}),
          },
          unlockedCharacters: Array.isArray(parsed.unlockedCharacters)
            ? parsed.unlockedCharacters
            : ['arda'],
        };
      }
    } catch (e) {
      console.warn('[GameState] Gagal membaca localStorage. Menggunakan data default.');
    }

    syncCharactersStatus();
  }

  /**
   * Menyimpan data game saat ini ke LocalStorage browser
   */
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Abaikan jika storage penuh atau diblokir
    }
  }

  /**
   * Mengatur status suara efek (Sound SFX)
   * @param {boolean} isEnabled
   */
  function setSound(isEnabled) {
    state.settings.sound = Boolean(isEnabled);
    saveToStorage();
  }

  /**
   * Mengatur status musik latar (Music BGM)
   * @param {boolean} isEnabled
   */
  function setMusic(isEnabled) {
    state.settings.music = Boolean(isEnabled);
    saveToStorage();
    if (typeof SoundSystem !== 'undefined') {
      if (state.settings.music) {
        SoundSystem.playBGM();
      } else {
        SoundSystem.stopBGM();
      }
    }
  }

  /**
   * Mengatur volume master (0.0 s/d 1.0)
   * @param {number} vol
   */
  function setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, parseFloat(vol) || 0.8));
    state.settings.volume = clamped;
    saveToStorage();
    if (typeof SoundSystem !== 'undefined') {
      SoundSystem.updateVolume(clamped);
    }
  }

  /**
   * Menambah atau mengurangi jumlah koin pemain
   * @param {number} amount
   */
  function addCoins(amount) {
    state.coins = Math.max(0, state.coins + amount);
    saveToStorage();
    if (typeof UI !== 'undefined') {
      UI.updateHUD(state.coins, state.highScore, state.maxDistance, state.totalRuns);
    }
  }

  /**
   * Membeli karakter dengan koin
   * @param {string} charId - 'akbar' | 'apiz' | 'ananda'
   * @returns {{ success: boolean, message: string }}
   */
  function buyCharacter(charId) {
    const char = CHARACTERS_DATA[charId];
    if (!char) {
      return { success: false, message: 'Karakter tidak valid.' };
    }

    if (state.unlockedCharacters.includes(charId)) {
      return { success: true, message: `${char.name} sudah terbuka!` };
    }

    if (state.coins < char.price) {
      const missing = char.price - state.coins;
      return {
        success: false,
        message: `Koin tidak cukup! Kamu membutuhkan ${char.price} koin untuk membuka ${char.name} (Kurang ${missing} koin).`,
        needed: char.price,
        missing: missing
      };
    }

    // Kurangi koin dan buka karakter
    state.coins -= char.price;
    state.unlockedCharacters.push(charId);
    state.selectedCharacter = charId; // Otomatis pilih setelah dibeli
    syncCharactersStatus();
    saveToStorage();

    if (typeof UI !== 'undefined') {
      UI.updateHUD(state.coins, state.highScore, state.maxDistance, state.totalRuns);
    }

    return {
      success: true,
      message: `Selamat! ${char.name} berhasil dibeli dan siap dimainkan!`,
      character: char
    };
  }

  /**
   * Memperbarui rekor skor tertinggi (High Score)
   * @param {number} newScore
   */
  function setHighScore(newScore) {
    if (newScore > state.highScore) {
      state.highScore = newScore;
      saveToStorage();
      if (typeof UI !== 'undefined') {
        UI.updateHUD(state.coins, state.highScore, state.maxDistance, state.totalRuns);
      }
    }
  }

  /**
   * Mencatat hasil lari (Jarak, Skor, dan Koin) secara otomatis
   * @param {number} dist - Jarak yang ditempuh (meter)
   * @param {number} finalScore - Skor total lari
   * @param {number} coinsEarned - Koin yang didapat pada sesi ini
   */
  function recordRun(dist, finalScore, coinsEarned) {
    state.totalRuns = (state.totalRuns || 0) + 1;
    const roundedDist = Math.floor(dist);
    if (roundedDist > (state.maxDistance || 0)) {
      state.maxDistance = roundedDist;
    }
    if (finalScore > state.highScore) {
      state.highScore = finalScore;
    }
    state.coins = Math.max(0, state.coins + coinsEarned);
    saveToStorage();
    if (typeof UI !== 'undefined') {
      UI.updateHUD(state.coins, state.highScore, state.maxDistance, state.totalRuns);
    }
  }

  /**
   * Mengatur karakter aktif yang dipilih
   * @param {string} charId
   */
  function setSelectedCharacter(charId) {
    if (CHARACTERS_DATA[charId] && state.unlockedCharacters.includes(charId)) {
      state.selectedCharacter = charId;
      saveToStorage();
      return true;
    }
    return false;
  }

  function isCharacterUnlocked(charId) {
    return state.unlockedCharacters.includes(charId);
  }

  function setHasSeenStory(seen) {
    state.hasSeenStory = Boolean(seen);
    saveToStorage();
  }

  return {
    init: loadFromStorage,
    get coins() { return state.coins; },
    get highScore() { return state.highScore; },
    get maxDistance() { return state.maxDistance || 0; },
    get totalRuns() { return state.totalRuns || 0; },
    get settings() { return state.settings; },
    get selectedCharacter() { return state.selectedCharacter || 'arda'; },
    get unlockedCharacters() { return [...state.unlockedCharacters]; },
    get hasSeenStory() { return state.hasSeenStory; },
    get charactersData() { return CHARACTERS_DATA; },
    getCharacter: (id) => CHARACTERS_DATA[id] || CHARACTERS_DATA.arda,
    isCharacterUnlocked,
    buyCharacter,
    setSound,
    setMusic,
    setVolume,
    addCoins,
    setHighScore,
    recordRun,
    setSelectedCharacter,
    setHasSeenStory,
  };
})();

/**
 * Inisialisasi Game saat seluruh elemen DOM selesai dimuat
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Muat state game dari LocalStorage
  GameState.init();

  // 2. Inisialisasi Canvas & Engine Gameplay
  if (typeof CirebonGame !== 'undefined') {
    CirebonGame.init();
  }

  // 3. Inisialisasi UI dan pasang event listener
  if (typeof UI !== 'undefined') {
    UI.init();
    // 4. Sinkronkan nilai koin & skor ke tampilan Top HUD
    UI.updateHUD(GameState.coins, GameState.highScore, GameState.maxDistance, GameState.totalRuns);
  }

  if (typeof SoundSystem !== 'undefined') {
    SoundSystem.playLobbyBGM();
  }

  // 5. Log sambutan di console browser
  console.log(
    '%c🏃💨 CIREBON DASH — GAMEPLAY ENDLESS RUNNER REVISED! %c\n' +
    'Mata Kuliah: Desain Web (Semester 5)\n' +
    'Fitur: 4 Karakter (ARDA, AKBAR, APIZ, ANANDA), Kereta Cirebon, Gerobak & Tahu Gejrot Jumpable, Police Chase System, Full Custom SVG UI Icons.',
    'background: #FF6B00; color: #FFF8E7; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    'color: #FFB703; font-size: 12px;'
  );
});
