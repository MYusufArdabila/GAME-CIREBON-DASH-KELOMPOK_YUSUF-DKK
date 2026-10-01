/**
 * ============================================================================
 * CIREBON DASH — MODUL PLAYER & POLICE NPC (js/player.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Mengatur fisika lompat, perpindahan 3 jalur mulus, rendering 4
 *            karakter (ARDA, AKBAR, APIZ, ANANDA - Perempuan), skill aktif
 *            masing-masing, dan NPC Polisi 3D pengejar dinamis.
 * ============================================================================
 */

class Player {
  /**
   * Inisialisasi Player
   * @param {Object} game - Referensi ke controller utama CirebonGame
   */
  constructor(game) {
    this.game = game;

    // Sistem 3 Jalur: 0 = LEFT, 1 = CENTER, 2 = RIGHT
    this.lane = 1;
    this.currentLaneX = 1;     // Interpolasi mulus perpindahan jalur
    this.laneSwitchSpeed = 13; // Kecepatan pindah jalur

    // Posisi Z player di dunia 2.5D
    this.z = 115;

    // Fisika Lompat
    this.y = 0;              // Ketinggian vertikal di atas tanah
    this.vy = 0;             // Kecepatan vertikal
    this.baseJumpForce = 16.2;
    this.highJumpForce = 25;
    this.jumpForce = this.baseJumpForce;
    this.gravity = 44;       // Percepatan gravitasi
    this.isGrounded = true;

    // Dimensi bounding box player
    this.width = 46;
    this.height = 70;

    // Status Karakter: 'running' | 'jumping' | 'hit' | 'dead'
    this.state = 'running';
    this.animTimer = 0;
    this.tiltAngle = 0;
    this.invulnerableTimer = 0;

    // Skill Data Karakter Aktif
    this.charId = 'arda';
    this.isMagnetActive = true;   // ARDA
    this.magnetRadius = 190;
    this.magnetTimer = 0;
    this.highJumpTimer = 0;
    this.magnetAuraPulse = 0;
    this.magnetPullingCount = 0;
    this.speedMultiplier = 1.0;   // AKBAR
    this.coinMultiplier = 1;      // APIZ
    this.hasShield = false;       // ANANDA
    this.shieldPulse = 0;
  }

  /**
   * Reset data player saat mulai lari baru
   */
  reset() {
    this.lane = 1;
    this.currentLaneX = 1;
    this.z = 115;
    this.y = 0;
    this.vy = 0;
    this.jumpForce = this.baseJumpForce;
    this.magnetTimer = 0;
    this.highJumpTimer = 0;
    this.isGrounded = true;
    this.state = 'running';
    this.animTimer = 0;
    this.tiltAngle = 0;
    this.invulnerableTimer = 0;
    this.magnetAuraPulse = 0;
    this.magnetPullingCount = 0;
    this.shieldPulse = 0;

    // Baca karakter aktif dari GameState
    this.charId = (typeof GameState !== 'undefined' && GameState.selectedCharacter)
      ? GameState.selectedCharacter
      : 'arda';

    // Konfigurasi skill karakter aktif
    this.isMagnetActive = (this.charId === 'arda');
    this.speedMultiplier = (this.charId === 'akbar') ? 1.15 : 1.0;
    this.coinMultiplier = (this.charId === 'apiz') ? 2 : 1;
    this.hasShield = (this.charId === 'ananda'); // ANANDA mulai dengan 1 perisai
  }

  /**
   * Berpindah satu jalur ke KIRI
   */
  moveLeft() {
    if (this.state === 'dead') return;
    if (this.lane > 0) {
      this.lane -= 1;
      this.tiltAngle = -0.16;
      if (typeof SoundSystem !== 'undefined') {
        SoundSystem.playClick(440, 0.05);
      }
    }
  }

  /**
   * Berpindah satu jalur ke KANAN
   */
  moveRight() {
    if (this.state === 'dead') return;
    if (this.lane < 2) {
      this.lane += 1;
      this.tiltAngle = 0.16;
      if (typeof SoundSystem !== 'undefined') {
        SoundSystem.playClick(440, 0.05);
      }
    }
  }

  /**
   * Melakukan lompatan (Jump) melewati rintangan
   */
  jump() {
    if (this.state === 'dead') return;
    if (this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      this.state = 'jumping';
      if (typeof SoundSystem !== 'undefined') {
        SoundSystem.playJump();
      }
    }
  }

  activateMagnet(duration = 30) {
    this.magnetTimer = duration;
    this.isMagnetActive = true;
  }

  activateHighJump(duration = 40) {
    this.highJumpTimer = duration;
    this.jumpForce = this.highJumpForce;
  }

  /**
   * Menerima tabrakan
   * Mengembalikan true jika berhasil diserap perisai SHIELD (ANANDA)
   */
  handleCollision() {
    if (this.invulnerableTimer > 0) return true; // Sedang kebal

    // Jika karakter ANANDA masih memiliki perisai aktif:
    if (this.hasShield) {
      this.hasShield = false;
      this.invulnerableTimer = 1.5; // Kebal 1.5 detik
      if (typeof SoundSystem !== 'undefined') {
        SoundSystem.playShieldBreak();
      }
      this.game.shakeIntensity = 10;
      return true; // Berhasil diselamatkan oleh Shield!
    }

    // Jika tidak ada perisai: Player kalah
    this.hit();
    return false;
  }

  hit() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.vy = 8;
    this.isGrounded = false;
  }

  /**
   * Update logika posisi, fisika vertikal, dan animasi player
   */
  update(dt) {
    this.animTimer += dt * (11 + this.game.speed * 0.009);
    this.magnetAuraPulse += dt * 4.5;
    this.shieldPulse += dt * 3.5;

    if (this.game.state === 'RUNNING') {
      this.magnetTimer = Math.max(0, this.magnetTimer - dt);
      this.highJumpTimer = Math.max(0, this.highJumpTimer - dt);
      this.isMagnetActive = this.charId === 'arda' || this.magnetTimer > 0;
      this.jumpForce = this.highJumpTimer > 0 ? this.highJumpForce : this.baseJumpForce;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }

    // 1. Interpolasi Transisi Jalur (Smooth Lane Switching)
    const diff = this.lane - this.currentLaneX;
    this.currentLaneX += diff * Math.min(1, dt * this.laneSwitchSpeed);

    // Pemulihan sudut miring
    this.tiltAngle *= Math.pow(0.04, dt);

    // Cek apakah player sedang berada di atas platform / atap kereta
    let targetGroundY = 0;
    this.currentPlatform = null;

    if (this.game && this.game.obstacleManager) {
      for (const obs of this.game.obstacleManager.obstacles) {
        if (obs.type === 'train' || obs.isPlatform) {
          const laneDist = Math.abs(this.currentLaneX - obs.lane);
          // Berada dalam rentang Z kereta
          const inZBounds = (this.z >= obs.z - 25 && this.z <= obs.z + obs.zLength + 25);

          if (laneDist < 0.60 && inZBounds) {
            // Jika player berada di dekat atau di atas atap kereta
            if (this.y >= (obs.roofHeight || 74) - 14) {
              targetGroundY = obs.roofHeight || 74;
              this.currentPlatform = obs;
              break;
            }
          }
        }
      }
    }

    // 2. Fisika Vertikal (Lompat, Gravitasi, dan Pijakan Atap Kereta)
    if (this.isGrounded) {
      // Jika player berjalan keluar dari atap kereta (berpindah lane atau kereta lewat), mulai jatuh
      if (this.y > targetGroundY + 1) {
        this.isGrounded = false;
        this.state = 'jumping';
      } else {
        this.y = targetGroundY;
      }
    }

    if (!this.isGrounded) {
      this.y += this.vy * dt * 45;
      this.vy -= this.gravity * dt;

      // Pendaratan di tanah aspal atau di atap kereta
      if (this.vy <= 0 && this.y <= targetGroundY) {
        this.y = targetGroundY;
        this.vy = 0;
        this.isGrounded = true;
        if (this.state !== 'dead') {
          this.state = 'running';
        }
      }
    }
  }

  /**
   * Render Karakter Runner 2.5D di Canvas
   */
  render(ctx) {
    const pos = this.game.project(this.currentLaneX, this.z, this.y);
    if (!pos) return;

    const screenX = pos.x;
    const screenY = pos.y;
    const scale = pos.scale;

    const shadowPos = this.game.project(this.currentLaneX, this.z, 0);

    ctx.save();

    // Efek Berkedip saat Invulnerable (Shield baru pecah)
    if (this.invulnerableTimer > 0) {
      const blink = Math.sin(this.invulnerableTimer * 25);
      if (blink < 0) {
        ctx.globalAlpha = 0.45;
      }
    }

    // 1. Gambar Bayangan di Tanah
    if (shadowPos) {
      const jumpRatio = Math.max(0, 1 - this.y / 90);
      const shadowW = Math.max(0.1, this.width * scale * jumpRatio * 1.1);
      const shadowH = Math.max(0.1, 14 * scale * jumpRatio);

      ctx.beginPath();
      ctx.ellipse(shadowPos.x, shadowPos.y, shadowW, shadowH, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(11, 19, 37, ${0.45 * jumpRatio})`;
      ctx.fill();
    }

    // 2. Efek Aura Visual Khusus Karakter
    if (this.state !== 'dead') {
      // Aura Magnet ARDA
      if (this.isMagnetActive) {
        const auraPulse = (Math.sin(this.magnetAuraPulse) + 1) * 0.5;
        const auraRadius = Math.max(0.1, (this.width * 0.95 + auraPulse * 12) * scale);

        ctx.beginPath();
        ctx.ellipse(screenX, screenY - this.height * 0.45 * scale, auraRadius, Math.max(0.1, auraRadius * 0.55), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 + auraPulse * 0.35})`;
        ctx.lineWidth = Math.max(1.2, 2.5 * scale);
        ctx.stroke();

        if (this.magnetPullingCount > 0) {
          ctx.beginPath();
          ctx.ellipse(screenX, screenY - this.height * 0.45 * scale, Math.max(0.1, auraRadius * 0.75), Math.max(0.1, auraRadius * 0.4), 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 183, 3, ${0.6 + auraPulse * 0.4})`;
          ctx.lineWidth = Math.max(1.5, 3.2 * scale);
          ctx.stroke();
        }
      }

      // Aura Shield ANANDA (Perisai Ungu-Emas Aktif)
      if (this.hasShield) {
        const shieldP = (Math.sin(this.shieldPulse) + 1) * 0.5;
        const sRadius = Math.max(0.1, (this.width * 1.08 + shieldP * 9) * scale);

        ctx.beginPath();
        ctx.ellipse(screenX, screenY - this.height * 0.48 * scale, sRadius, Math.max(0.1, sRadius * 1.25), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(192, 132, 252, ${0.65 + shieldP * 0.35})`;
        ctx.lineWidth = Math.max(1.5, 3.5 * scale);
        ctx.stroke();

        ctx.fillStyle = `rgba(142, 68, 173, ${0.15 + shieldP * 0.12})`;
        ctx.fill();

        // Partikel Perisai Melingkar
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.6 + shieldP * 0.4})`;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.beginPath();
        ctx.arc(screenX, screenY - this.height * 0.48 * scale, sRadius * 0.85, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Aura Power Dash AKBAR (Garis Kilat Merah-Oranye)
      if (this.charId === 'akbar') {
        const dashP = (Math.sin(this.animTimer * 2) + 1) * 0.5;
        ctx.strokeStyle = `rgba(231, 76, 60, ${0.4 + dashP * 0.4})`;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.beginPath();
        ctx.moveTo(screenX - this.width * 0.4 * scale, screenY - 10 * scale);
        ctx.lineTo(screenX - this.width * 0.6 * scale, screenY + 12 * scale);
        ctx.moveTo(screenX + this.width * 0.4 * scale, screenY - 10 * scale);
        ctx.lineTo(screenX + this.width * 0.6 * scale, screenY + 12 * scale);
        ctx.stroke();
      }

      // Aura Coin Boost APIZ (Kilauan Koin Hijau-Emas)
      if (this.charId === 'apiz') {
        const coinP = (Math.sin(this.animTimer * 1.5) + 1) * 0.5;
        ctx.fillStyle = `rgba(46, 204, 113, ${0.4 + coinP * 0.4})`;
        ctx.beginPath();
        ctx.arc(screenX - this.width * 0.35 * scale, screenY - this.height * 0.75 * scale, Math.max(0.1, 3 * scale), 0, Math.PI * 2);
        ctx.arc(screenX + this.width * 0.35 * scale, screenY - this.height * 0.65 * scale, Math.max(0.1, 3 * scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Gambar Model Karakter
    ctx.translate(screenX, screenY);
    ctx.rotate(this.tiltAngle);

    const w = this.width * scale;
    const h = this.height * scale;

    const stride = this.isGrounded ? Math.sin(this.animTimer) : 0;
    const legOffset = stride * 12 * scale;
    const armOffset = -stride * 10 * scale;

    if (this.state === 'dead') {
      ctx.rotate(0.35);
    }

    this.renderRearRunner(ctx, w, h, scale, legOffset, armOffset, stride, this.charId);

    ctx.restore();
  }

  renderRearRunner(ctx, w, h, scale, legOffset, armOffset, stride, charId) {
    const isAnanda = charId === 'ananda';
    const isAkbar = charId === 'akbar';
    const isApiz = charId === 'apiz';
    const jacket = isAnanda ? '#7753C9' : isAkbar ? '#E74C3C' : isApiz ? '#27AE60' : '#FF6B00';
    const accent = isAnanda ? '#D8C5FF' : isAkbar ? '#F1C40F' : isApiz ? '#F1C40F' : '#FFB703';
    const skin = isAnanda ? '#F5C6A5' : '#FFDFC4';

    if (isAnanda) {
      ctx.fillStyle = '#28233A';
      ctx.fillRect(-w * 0.23 + legOffset, -h * 0.36, w * 0.2, h * 0.32);
      ctx.fillRect(w * 0.03 - legOffset, -h * 0.36, w * 0.2, h * 0.32);
      ctx.fillStyle = '#F8F4FF';
      ctx.fillRect(-w * 0.29 + legOffset, -h * 0.08, w * 0.25, h * 0.07);
      ctx.fillRect(w * 0.04 - legOffset, -h * 0.08, w * 0.25, h * 0.07);
    } else if (isAkbar) {
      ctx.fillStyle = '#152238';
      ctx.fillRect(-w * 0.25 + legOffset, -h * 0.35, w * 0.2, h * 0.31);
      ctx.fillRect(w * 0.05 - legOffset, -h * 0.35, w * 0.2, h * 0.31);
      ctx.fillStyle = jacket;
      ctx.fillRect(-w * 0.29 + legOffset, -h * 0.38, w * 0.27, h * 0.12);
      ctx.fillRect(w * 0.02 - legOffset, -h * 0.38, w * 0.27, h * 0.12);
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(-w * 0.28 + legOffset, -h * 0.08, w * 0.26, h * 0.06);
      ctx.fillRect(w * 0.02 - legOffset, -h * 0.08, w * 0.26, h * 0.06);
    } else {
      ctx.fillStyle = isApiz ? '#5D4037' : '#152238';
      ctx.fillRect(-w * 0.27 + legOffset, -h * 0.36, w * 0.21, h * 0.32);
      ctx.fillRect(w * 0.06 - legOffset, -h * 0.36, w * 0.21, h * 0.32);
      ctx.fillStyle = isApiz ? '#27AE60' : '#FFB703';
      ctx.fillRect(-w * 0.31 + legOffset, -h * 0.08, w * 0.26, h * 0.07);
      ctx.fillRect(w * 0.05 - legOffset, -h * 0.08, w * 0.26, h * 0.07);
    }

    ctx.fillStyle = isAkbar ? '#152238' : isAnanda ? '#5638A3' : isApiz ? '#196F3D' : '#D94E00';
    ctx.fillRect(-w * 0.43 + armOffset, -h * 0.69, w * 0.17, h * 0.31);
    ctx.fillRect(w * 0.26 - armOffset, -h * 0.69, w * 0.17, h * 0.31);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(-w * 0.35 + armOffset, -h * 0.35, w * 0.09, 0, Math.PI * 2);
    ctx.arc(w * 0.35 - armOffset, -h * 0.35, w * 0.09, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.roundRect(-w * 0.34, -h * 0.73, w * 0.68, h * 0.41, 4 * scale);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(-w * 0.035, -h * 0.68, w * 0.07, h * 0.29);
    if (isAkbar) {
      ctx.fillStyle = '#FFF8E7';
      ctx.font = `bold ${Math.max(5, Math.floor(9 * scale))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('07', 0, -h * 0.57);
    } else if (isApiz) {
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.arc(0, -h * 0.52, Math.max(1.5, w * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }

    if (isAnanda) {
      ctx.fillStyle = '#5638A3';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.86, w * 0.28, h * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7753C9';
      ctx.beginPath();
      ctx.moveTo(-w * 0.25, -h * 0.84);
      ctx.lineTo(w * 0.25, -h * 0.84);
      ctx.lineTo(w * 0.19, -h * 0.68);
      ctx.lineTo(-w * 0.19, -h * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#D8C5FF';
      ctx.fillRect(-w * 0.16, -h * 0.7, w * 0.32, h * 0.025);
    } else {
      ctx.fillStyle = isAkbar ? '#202632' : isApiz ? '#1E8449' : '#1C1814';
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.86, w * 0.25, h * 0.16, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isAkbar ? '#C0392B' : isApiz ? '#27AE60' : '#8B2616';
      ctx.fillRect(-w * 0.24, -h * 0.87, w * 0.48, h * 0.055);
      if (charId === 'arda') {
        ctx.fillStyle = '#FFB703';
        ctx.beginPath();
        ctx.moveTo(w * 0.12, -h * 0.87);
        ctx.lineTo(w * 0.27, -h * 0.96);
        ctx.lineTo(w * 0.22, -h * 0.85);
        ctx.closePath();
        ctx.fill();
      } else if (isApiz) {
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(-w * 0.055, -h * 0.94, w * 0.11, h * 0.035);
      }
    }
  }

  /**
   * Render Karakter Perempuan: ANANDA (Pelari Tangguh Berhijab/Ponytail Sporty Cirebon)
   */
  renderFemaleRunner(ctx, w, h, scale, legOffset, armOffset, stride) {
    const skin = '#F5C6A5';
    const hair = '#241A2B';
    const jacket = '#7753C9';
    const jacketShade = '#5638A3';
    const lilac = '#D8C5FF';
    const leggings = '#28233A';
    // A compact side ponytail stays close to the shared runner silhouette.
    const hairBounce = stride * 2 * scale;
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(w * 0.14, -h * 0.9);
    ctx.quadraticCurveTo(w * 0.29, -h * 0.93, w * 0.31 + hairBounce, -h * 0.83);
    ctx.quadraticCurveTo(w * 0.33 + hairBounce, -h * 0.74, w * 0.24 + hairBounce, -h * 0.73);
    ctx.quadraticCurveTo(w * 0.28 + hairBounce, -h * 0.82, w * 0.12, -h * 0.82);
    ctx.closePath();
    ctx.fill();

    // Tapered leggings and white-lilac running shoes.
    ctx.fillStyle = leggings;
    ctx.beginPath();
    ctx.moveTo(-w * 0.22 + legOffset, -h * 0.36);
    ctx.lineTo(-w * 0.02 + legOffset, -h * 0.34);
    ctx.lineTo(-w * 0.08 + legOffset, -h * 0.04);
    ctx.lineTo(-w * 0.22 + legOffset, -h * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.02 - legOffset, -h * 0.34);
    ctx.lineTo(w * 0.22 - legOffset, -h * 0.36);
    ctx.lineTo(w * 0.22 - legOffset, -h * 0.04);
    ctx.lineTo(w * 0.08 - legOffset, -h * 0.04);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F8F4FF';
    ctx.beginPath();
    ctx.roundRect(-w * 0.32 + legOffset, -h * 0.09, w * 0.28, h * 0.075, 3 * scale);
    ctx.roundRect(w * 0.04 - legOffset, -h * 0.09, w * 0.28, h * 0.075, 3 * scale);
    ctx.fill();
    ctx.fillStyle = '#B69BEF';
    ctx.fillRect(-w * 0.27 + legOffset, -h * 0.035, w * 0.22, h * 0.022);
    ctx.fillRect(w * 0.05 - legOffset, -h * 0.035, w * 0.22, h * 0.022);

    // Fitted running jacket with shaped waist and light side panels.
    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, -h * 0.72);
    ctx.lineTo(-w * 0.25, -h * 0.69);
    ctx.lineTo(-w * 0.31, -h * 0.47);
    ctx.lineTo(-w * 0.29, -h * 0.32);
    ctx.lineTo(w * 0.29, -h * 0.32);
    ctx.lineTo(w * 0.31, -h * 0.47);
    ctx.lineTo(w * 0.25, -h * 0.69);
    ctx.lineTo(w * 0.35, -h * 0.72);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = jacketShade;
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, -h * 0.36);
    ctx.lineTo(-w * 0.25, -h * 0.5);
    ctx.lineTo(-w * 0.2, -h * 0.66);
    ctx.lineTo(-w * 0.13, -h * 0.64);
    ctx.lineTo(-w * 0.13, -h * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.2, -h * 0.36);
    ctx.lineTo(w * 0.25, -h * 0.5);
    ctx.lineTo(w * 0.2, -h * 0.66);
    ctx.lineTo(w * 0.13, -h * 0.64);
    ctx.lineTo(w * 0.13, -h * 0.36);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = lilac;
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.67);
    ctx.lineTo(0, -h * 0.39);
    ctx.moveTo(-w * 0.16, -h * 0.57);
    ctx.quadraticCurveTo(0, -h * 0.5, w * 0.16, -h * 0.57);
    ctx.stroke();

    // Small shield badge keeps her character skill visible in the outfit.
    ctx.fillStyle = '#F7D97A';
    ctx.beginPath();
    ctx.moveTo(w * 0.1, -h * 0.65);
    ctx.lineTo(w * 0.17, -h * 0.62);
    ctx.lineTo(w * 0.16, -h * 0.55);
    ctx.lineTo(w * 0.1, -h * 0.51);
    ctx.lineTo(w * 0.04, -h * 0.55);
    ctx.lineTo(w * 0.03, -h * 0.62);
    ctx.closePath();
    ctx.fill();

    // Short jacket sleeves, forearms and hands in a running pose.
    ctx.fillStyle = jacketShade;
    ctx.beginPath();
    ctx.moveTo(-w * 0.24 + armOffset, -h * 0.69);
    ctx.lineTo(-w * 0.34 + armOffset, -h * 0.64);
    ctx.lineTo(-w * 0.43 + armOffset, -h * 0.45);
    ctx.lineTo(-w * 0.33 + armOffset, -h * 0.41);
    ctx.lineTo(-w * 0.18 + armOffset, -h * 0.61);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w * 0.24 - armOffset, -h * 0.69);
    ctx.lineTo(w * 0.34 - armOffset, -h * 0.64);
    ctx.lineTo(w * 0.43 - armOffset, -h * 0.45);
    ctx.lineTo(w * 0.33 - armOffset, -h * 0.41);
    ctx.lineTo(w * 0.18 - armOffset, -h * 0.61);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(-w * 0.37 + armOffset, -h * 0.4, Math.max(1, w * 0.09), 0, Math.PI * 2);
    ctx.arc(w * 0.37 - armOffset, -h * 0.4, Math.max(1, w * 0.09), 0, Math.PI * 2);
    ctx.fill();

    // Face, swept fringe and lilac sports headband.
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -h * 0.85, w * 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-w * 0.23, -h * 0.87);
    ctx.quadraticCurveTo(-w * 0.24, -h * 1.03, 0, -h * 1.04);
    ctx.quadraticCurveTo(w * 0.23, -h * 1.03, w * 0.23, -h * 0.87);
    ctx.lineTo(w * 0.14, -h * 0.9);
    ctx.lineTo(w * 0.03, -h * 0.87);
    ctx.lineTo(-w * 0.08, -h * 0.91);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#B69BEF';
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, -h * 0.93);
    ctx.quadraticCurveTo(0, -h * 0.97, w * 0.22, -h * 0.93);
    ctx.lineTo(w * 0.2, -h * 0.88);
    ctx.quadraticCurveTo(0, -h * 0.92, -w * 0.2, -h * 0.88);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2B203B';
    ctx.beginPath();
    ctx.ellipse(-w * 0.08, -h * 0.85, Math.max(0.8, w * 0.022), Math.max(1, h * 0.025), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.08, -h * 0.85, Math.max(0.8, w * 0.022), Math.max(1, h * 0.025), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2B203B';
    ctx.lineWidth = Math.max(0.8, 1.3 * scale);
    ctx.beginPath();
    ctx.moveTo(-w * 0.12, -h * 0.89);
    ctx.lineTo(-w * 0.04, -h * 0.9);
    ctx.moveTo(w * 0.04, -h * 0.9);
    ctx.lineTo(w * 0.12, -h * 0.89);
    ctx.stroke();

    ctx.strokeStyle = '#A95C69';
    ctx.lineWidth = Math.max(0.8, 1.2 * scale);
    ctx.beginPath();
    ctx.moveTo(w * 0.03, -h * 0.78);
    ctx.quadraticCurveTo(w * 0.09, -h * 0.74, w * 0.15, -h * 0.78);
    ctx.stroke();
    ctx.fillStyle = 'rgba(239, 145, 165, 0.5)';
    ctx.beginPath();
    ctx.arc(-w * 0.14, -h * 0.81, Math.max(0.8, 1.6 * scale), 0, Math.PI * 2);
    ctx.arc(w * 0.14, -h * 0.81, Math.max(0.8, 1.6 * scale), 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render Karakter Laki-Laki: ARDA, AKBAR, APIZ
   */
  renderMaleRunner(ctx, w, h, scale, legOffset, armOffset, stride, charId) {
    const isAkbar = charId === 'akbar';
    let jacketColor = '#FF6B00';
    let jacketAccent = '#FFB703';
    let headbandColor = '#8B2616';
    let pantsColor = '#152238';

    if (isAkbar) {
      jacketColor = '#E74C3C';
      jacketAccent = '#F1C40F';
      headbandColor = '#C0392B';
    } else if (charId === 'apiz') {
      jacketColor = '#27AE60';
      jacketAccent = '#2ECC71';
      headbandColor = '#1E8449';
    }

    if (isAkbar) {
      // Sprinter shorts over dark compression tights.
      ctx.fillStyle = '#152238';
      ctx.fillRect(-w * 0.25 + legOffset, -h * 0.19, w * 0.18, h * 0.17);
      ctx.fillRect(w * 0.07 - legOffset, -h * 0.19, w * 0.18, h * 0.17);
      ctx.fillStyle = jacketColor;
      ctx.fillRect(-w * 0.29 + legOffset, -h * 0.36, w * 0.27, h * 0.19);
      ctx.fillRect(w * 0.04 - legOffset, -h * 0.36, w * 0.27, h * 0.19);
      ctx.fillStyle = '#0B1325';
      ctx.fillRect(-w * 0.25 + legOffset, -h * 0.04, w * 0.2, h * 0.035);
      ctx.fillRect(w * 0.05 - legOffset, -h * 0.04, w * 0.2, h * 0.035);
      ctx.fillStyle = '#FFF8E7';
      ctx.fillRect(-w * 0.3 + legOffset, -h * 0.075, w * 0.27, h * 0.045);
      ctx.fillRect(w * 0.04 - legOffset, -h * 0.075, w * 0.27, h * 0.045);
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(-w * 0.2 + legOffset, -h * 0.08, w * 0.12, h * 0.018);
      ctx.fillRect(w * 0.12 - legOffset, -h * 0.08, w * 0.12, h * 0.018);
    } else {
      // Arda's long Cirebon running pants and gold shoes.
      ctx.fillStyle = pantsColor;
      ctx.fillRect(-w * 0.28 + legOffset, -h * 0.35, w * 0.22, h * 0.32);
      ctx.fillStyle = '#FFB703';
      ctx.fillRect(-w * 0.32 + legOffset, -h * 0.08, w * 0.28, h * 0.1);
      ctx.fillStyle = '#0B1325';
      ctx.fillRect(w * 0.06 - legOffset, -h * 0.35, w * 0.22, h * 0.32);
      ctx.fillStyle = '#FFB703';
      ctx.fillRect(w * 0.04 - legOffset, -h * 0.08, w * 0.28, h * 0.1);
    }

    if (isAkbar) {
      // Navy compression sleeves remain visible under the racing vest.
      ctx.fillStyle = '#152238';
      ctx.fillRect(-w * 0.45 + armOffset, -h * 0.7, w * 0.16, h * 0.3);
      ctx.fillRect(w * 0.29 - armOffset, -h * 0.7, w * 0.16, h * 0.3);

      // Sleeveless red sprint jersey with a lightning stripe and race number.
      ctx.fillStyle = jacketColor;
      ctx.beginPath();
      ctx.moveTo(-w * 0.29, -h * 0.72);
      ctx.lineTo(-w * 0.12, -h * 0.72);
      ctx.lineTo(-w * 0.07, -h * 0.62);
      ctx.lineTo(w * 0.07, -h * 0.62);
      ctx.lineTo(w * 0.12, -h * 0.72);
      ctx.lineTo(w * 0.29, -h * 0.72);
      ctx.lineTo(w * 0.35, -h * 0.32);
      ctx.lineTo(-w * 0.35, -h * 0.32);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#F1C40F';
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, -h * 0.42);
      ctx.lineTo(w * 0.05, -h * 0.55);
      ctx.lineTo(-w * 0.01, -h * 0.45);
      ctx.lineTo(w * 0.28, -h * 0.58);
      ctx.lineTo(w * 0.22, -h * 0.4);
      ctx.closePath();
      ctx.fill();

      if (scale > 0.35) {
        ctx.fillStyle = '#FFF8E7';
        ctx.font = `bold ${Math.max(5, Math.floor(9 * scale))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('07', 0, -h * 0.64);
      }
    } else {
      // Arda's long-sleeved orange Cirebon running jacket.
      ctx.fillStyle = jacketColor;
      ctx.beginPath();
      ctx.roundRect(-w * 0.35, -h * 0.72, w * 0.7, h * 0.4, 4 * scale);
      ctx.fill();

      ctx.strokeStyle = jacketAccent;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.55);
      ctx.lineTo(0, -h * 0.5);
      ctx.lineTo(w * 0.3, -h * 0.55);
      ctx.stroke();

      ctx.fillStyle = '#D94E00';
      ctx.fillRect(-w * 0.45 + armOffset, -h * 0.7, w * 0.16, h * 0.3);
      ctx.fillRect(w * 0.29 - armOffset, -h * 0.7, w * 0.16, h * 0.3);
    }

    // Kepala Karakter
    ctx.fillStyle = '#FFDFC4';
    ctx.beginPath();
    ctx.arc(0, -h * 0.85, w * 0.24, 0, Math.PI * 2);
    ctx.fill();

    // Akbar's raised sprint quiff contrasts with Arda's short hair under an iket.
    ctx.fillStyle = isAkbar ? '#202632' : '#1C1814';
    ctx.beginPath();
    ctx.arc(0, -h * 0.9, w * 0.25, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    if (isAkbar) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -h * 0.91);
      ctx.lineTo(-w * 0.1, -h * 1.04);
      ctx.lineTo(-w * 0.02, -h * 0.94);
      ctx.lineTo(w * 0.08, -h * 1.06);
      ctx.lineTo(w * 0.13, -h * 0.92);
      ctx.closePath();
      ctx.fill();
    }

    // Arda wears a Cirebon iket; Akbar wears a narrow sprint headband.
    ctx.fillStyle = headbandColor;
    ctx.fillRect(-w * (isAkbar ? 0.24 : 0.26), -h * (isAkbar ? 0.92 : 0.94), w * (isAkbar ? 0.48 : 0.52), h * (isAkbar ? 0.055 : 0.09));
    ctx.fillStyle = isAkbar ? '#FFF8E7' : '#FFB703';
    ctx.fillRect(-w * 0.22, -h * 0.92, w * 0.44, h * (isAkbar ? 0.018 : 0.03));

    // Pucuk Udeng Khas Cirebon (Khusus ARDA)
    if (charId === 'arda') {
      ctx.beginPath();
      ctx.moveTo(w * 0.18, -h * 0.94);
      ctx.lineTo(w * 0.28, -h * 1.02);
      ctx.lineTo(w * 0.26, -h * 0.92);
      ctx.closePath();
      ctx.fillStyle = headbandColor;
      ctx.fill();
    }

    // Mata
    ctx.fillStyle = '#152238';
    ctx.fillRect(-w * 0.08, -h * 0.86, w * 0.06, h * 0.06);
    ctx.fillRect(w * 0.04, -h * 0.86, w * 0.06, h * 0.06);
  }
}

/**
 * ============================================================================
 * POLICE OFFICER NPC (Karakter 3D Polisi Pengejar Dinamis)
 * Menyesuaikan posisi Z berdasarkan tingkat kesalahan player:
 * 0 mistake -> SAFE (Jauh di belakang)
 * 1 mistake -> CHASING (Mendekat)
 * 2 mistakes -> VERY CLOSE (Tepat di belakang, sirene menyala, menggapai)
 * 3 mistakes -> DANGER / CAUGHT (Menangkap player!)
 * ============================================================================
 */
class PoliceOfficer {
  constructor(game) {
    this.game = game;
    this.currentLaneX = 1;
    this.laneTrackingSpeed = 5.2;
    this.jumpY = 0;
    this.z = 20; // Posisi Z awal di belakang
    this.animTimer = 0;
    this.tiltAngle = 0;
    this.width = 48;
    this.height = 72;
    this.reachProgress = 0;
    this.strobeTimer = 0;
  }

  reset() {
    this.currentLaneX = 1;
    this.jumpY = 0;
    this.z = 20;
    this.animTimer = 0;
    this.tiltAngle = 0;
    this.reachProgress = 0;
    this.strobeTimer = 0;
  }

  update(dt) {
    this.animTimer += dt * (10 + this.game.speed * 0.008);
    this.strobeTimer += dt * 14;

    const jumpDiff = this.game.player.y - this.jumpY;
    this.jumpY += jumpDiff * Math.min(1, dt * 14);

    // 1. Polisi mengikuti jalur lari player
    const targetLane = this.game.player.currentLaneX;
    const diff = targetLane - this.currentLaneX;
    this.currentLaneX += diff * Math.min(1, dt * this.laneTrackingSpeed);
    this.tiltAngle = Math.max(-0.14, Math.min(0.14, diff * 0.16));

    // 2. Posisi Z Polisi diatur berdasarkan policeDistance (0 s/d 100)
    // 100 (Safe) -> z = 18 (jauh di bawah kamera / belakang)
    // 50 (Chasing) -> z = 55
    // 20 (Very Close) -> z = 85 (tepat di punggung player)
    // 0 (Caught) -> z = player.z - 5
    const playerZ = this.game.player.z;
    const minZ = 16;
    const maxZ = playerZ - 12;
    const closenessRatio = 1 - Math.max(0, Math.min(100, this.game.policeDistance)) / 100;
    const targetZ = minZ + Math.pow(closenessRatio, 1.2) * (maxZ - minZ);

    this.z += (targetZ - this.z) * Math.min(1, dt * 4.5);

    // 3. Animasi Menggapai Tangan saat Dekat (< 40)
    if (this.game.policeDistance < 40) {
      this.reachProgress = Math.min(1, this.reachProgress + dt * 4.0);
    } else {
      this.reachProgress = Math.max(0, this.reachProgress - dt * 3.0);
    }
  }

  render(ctx) {
    const pos = this.game.project(this.currentLaneX, this.z, this.jumpY);
    const groundPos = this.game.project(this.currentLaneX, this.z, 0);
    if (!pos || !groundPos) return;

    const screenX = pos.x;
    const screenY = pos.y;
    const scale = pos.scale;

    ctx.save();

    // 1. Bayangan Polisi di Aspal
    const shadowW = Math.max(0.1, this.width * scale * 1.15);
    const shadowH = Math.max(0.1, 14 * scale);
    ctx.beginPath();
    ctx.ellipse(groundPos.x, groundPos.y, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(11, 19, 37, 0.55)';
    ctx.fill();

    // 2. Transformasi Posisi Polisi
    ctx.translate(screenX, screenY);
    ctx.rotate(this.tiltAngle);

    const w = this.width * scale;
    const h = this.height * scale;

    const stride = Math.sin(this.animTimer);
    const legOffset = stride * 12 * scale;
    const armOffset = -stride * 10 * scale;

    // Celana Seragam Polisi
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-w * 0.28 + legOffset, -h * 0.35, w * 0.22, h * 0.32);
    ctx.fillStyle = '#020617';
    ctx.fillRect(-w * 0.32 + legOffset, -h * 0.08, w * 0.28, h * 0.1);

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(w * 0.06 - legOffset, -h * 0.35, w * 0.22, h * 0.32);
    ctx.fillStyle = '#020617';
    ctx.fillRect(w * 0.04 - legOffset, -h * 0.08, w * 0.28, h * 0.1);

    // Kemeja Seragam Polisi (Navy Blue)
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.roundRect(-w * 0.36, -h * 0.74, w * 0.72, h * 0.42, 4 * scale);
    ctx.fill();

    // Sabuk Polisi
    ctx.fillStyle = '#020617';
    ctx.fillRect(-w * 0.36, -h * 0.37, w * 0.72, h * 0.07);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-w * 0.08, -h * 0.37, w * 0.16, h * 0.07);

    if (scale > 0.35) {
      ctx.fillStyle = '#DBEAFE';
      ctx.font = `bold ${Math.max(4, Math.floor(8 * scale))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('POLISI', 0, -h * 0.56);
    }

    // Strobo di Pundak Polisi (Biru Kiri, Merah Kanan)
    const flashLeft = Math.sin(this.strobeTimer) > 0;
    ctx.fillStyle = flashLeft ? '#38BDF8' : '#0284C7';
    ctx.beginPath();
    ctx.arc(-w * 0.37, -h * 0.76, Math.max(0.1, 3 * scale), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = !flashLeft ? '#EF4444' : '#991B1B';
    ctx.beginPath();
    ctx.arc(w * 0.37, -h * 0.76, Math.max(0.1, 3 * scale), 0, Math.PI * 2);
    ctx.fill();

    // Lengan Mengayun / Menggapai
    ctx.fillStyle = '#1E40AF';
    if (this.reachProgress > 0) {
      const reachY = -h * 0.76 - this.reachProgress * 12 * scale;
      ctx.fillRect(-w * 0.44, reachY, w * 0.15, h * 0.34);
      ctx.fillRect(w * 0.29, reachY, w * 0.15, h * 0.34);
      ctx.fillStyle = '#FFDFC4';
      ctx.beginPath();
      ctx.arc(-w * 0.36, reachY, Math.max(0.1, 5 * scale), 0, Math.PI * 2);
      ctx.arc(w * 0.36, reachY, Math.max(0.1, 5 * scale), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-w * 0.46 + armOffset, -h * 0.72, w * 0.15, h * 0.32);
      ctx.fillRect(w * 0.31 - armOffset, -h * 0.72, w * 0.15, h * 0.32);
      ctx.fillStyle = '#FFDFC4';
      ctx.beginPath();
      ctx.arc(-w * 0.38 + armOffset, -h * 0.42, Math.max(0.1, 4.5 * scale), 0, Math.PI * 2);
      ctx.arc(w * 0.38 - armOffset, -h * 0.42, Math.max(0.1, 4.5 * scale), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FFDFC4';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.85, Math.max(0.1, w * 0.23), Math.max(0.1, h * 0.14), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.79, Math.max(0.1, w * 0.21), Math.max(0.1, h * 0.07), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.94, Math.max(0.1, w * 0.28), Math.max(0.1, h * 0.1), 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-w * 0.22, -h * 0.93, w * 0.44, h * 0.04);

    ctx.fillStyle = '#020617';
    ctx.fillRect(-w * 0.08, -h * 0.86, w * 0.16, h * 0.025);

    ctx.restore();
  }
}
