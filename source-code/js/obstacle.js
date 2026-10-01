/**
 * ============================================================================
 * CIREBON DASH — MODUL OBSTACLE (js/obstacle.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Mengatur rintangan bertema Cirebon:
 *            1. Palang Jalan (Barrier) — BISA DILOMPATI
 *            2. Peti Pelabuhan (Box) — BISA DILOMPATI
 *            3. Gerobak Tradisional (Cart) — BISA DILOMPATI
 *            4. Gerobak Tahu Gejrot Khas Cirebon — BISA DILOMPATI
 *            5. Kereta Cirebon (Train) — OBSTACLE BESAR, HINDARI DENGAN PINDAH LANE
 *            Dilengkapi jaminan Safe Path dan peringatan kereta mendekat.
 * ============================================================================
 */

class Obstacle {
  /**
   * Konstruktor Objek Rintangan
   * @param {Object} options
   * @param {number} options.lane - Jalur rintangan (0 = Kiri, 1 = Tengah, 2 = Kanan)
   * @param {number} options.z - Posisi Z di lintasan (dimulai dari jauh: ~950-1100)
   * @param {string} options.type - 'barrier' | 'box' | 'cart' | 'tahu_gejrot' | 'train'
   */
  constructor({ lane, z, type }) {
    this.lane = lane;
    this.z = z;
    this.type = type || 'barrier';
    this.y = 0;              // Berada di permukaan jalan
    this.isPassed = false;   // Apakah sudah dilewati player
    this.zLength = 24;       // Panjang Z obstacle

    // Konfigurasi berdasarkan jenis rintangan
    if (this.type === 'train') {
      // KERETA BESAR CIREBON EXPRESS (SUBWAY RUNNER STYLE)
      // Obstacle besar bersambung dengan atap yang berfungsi sebagai PLATFORM lari!
      this.width = 84;
      this.height = 96;
      this.roofHeight = 74;    // Ketinggian atap tempat player berpijak/lari
      this.zLength = 420;      // Kereta panjang (Lokomotif + 2 Gerbong Penumpang)
      this.canJumpOver = false; // Bagian depan/bodi tidak bisa ditembus
      this.isPlatform = true;   // Bagian atas adalah platform yang bisa dinaiki!
      this.speedExtra = 150;   // Melaju ke arah player
      this.warningShown = false;
    } else if (this.type === 'tahu_gejrot') {
      // GEROBAK TAHU GEJROT KHAS CIREBON: BISA DILOMPATI!
      this.width = 48;
      this.height = 36;
      this.canJumpOver = true;
      this.speedExtra = 0;
    } else if (this.type === 'cart') {
      // GEROBAK TRADISIONAL CIREBON: BISA DILOMPATI!
      this.width = 46;
      this.height = 36;
      this.canJumpOver = true;
      this.speedExtra = 0;
    } else if (this.type === 'box') {
      // PETI KAYU PELABUHAN CIREBON: BISA DILOMPATI!
      this.width = 42;
      this.height = 34;
      this.canJumpOver = true;
      this.speedExtra = 0;
    } else {
      // PALANG PERBAIKAN JALAN: BISA DILOMPATI!
      this.type = 'barrier';
      this.width = 50;
      this.height = 32;
      this.canJumpOver = true;
      this.speedExtra = 0;
    }
  }

  /**
   * Update posisi Z rintangan mendekati player
   * @param {number} dt - Waktu delta
   * @param {number} speed - Kecepatan game saat ini
   */
  update(dt, speed) {
    this.z -= (speed + this.speedExtra) * dt;
  }

  /**
   * Render rintangan ke canvas dengan proyeksi perspektif 2.5D
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} game
   */
  render(ctx, game) {
    // 1. Khusus Kereta: Render seluruh gerbong dan atap 3D
    if (this.type === 'train') {
      this.renderBigTrain(ctx, game);
      return;
    }

    const pos = game.project(this.lane, this.z, this.y);
    if (!pos) return;

    const x = pos.x;
    const y = pos.y;
    const scale = pos.scale;

    const w = this.width * scale;
    const h = this.height * scale;

    ctx.save();
    try {
      ctx.translate(x, y);

      // Bayangan di Aspal
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(0.1, w * 0.6), Math.max(0.1, 7 * scale), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(11, 19, 37, 0.45)';
      ctx.fill();

      // Gambar berdasarkan tipe
      if (this.type === 'tahu_gejrot') {
        this.renderTahuGejrot(ctx, w, h, scale);
      } else if (this.type === 'cart') {
        this.renderCart(ctx, w, h, scale);
      } else if (this.type === 'box') {
        this.renderBox(ctx, w, h, scale);
      } else {
        this.renderBarrier(ctx, w, h, scale);
      }
    } finally {
      ctx.restore();
    }
  }

  /**
   * Render Kereta Besar Cirebon Express 3D (Lokomotif + Gerbong + Roof Platform)
   */
  renderBigTrain(ctx, game) {
    const numSections = 3; // Lokomotif Depan + 2 Gerbong Belakang
    const sectionLen = this.zLength / numSections;

    // Render dari gerbong paling belakang ke kepala lokomotif depan
    for (let s = numSections - 1; s >= 0; s--) {
      const zNear = this.z + s * sectionLen;
      const zFar = this.z + (s + 1) * sectionLen - 12; // Celah sambungan antar gerbong

      const posNear = game.project(this.lane, zNear, 0);
      const posFar = game.project(this.lane, zFar, 0);

      if (!posNear && !posFar) continue;
      if (zNear < -80 && zFar < -80) continue;

      const scNear = posNear ? posNear.scale : (posFar.scale * 1.3);
      const scFar = posFar ? posFar.scale : (posNear.scale * 0.7);

      const pNx = posNear ? posNear.x : posFar.x;
      const pNy = posNear ? posNear.y : posFar.y;
      const pFx = posFar ? posFar.x : posNear.x;
      const pFy = posFar ? posFar.y : posNear.y;

      const wNear = this.width * scNear;
      const hNear = this.height * scNear;
      const rNear = this.roofHeight * scNear;

      const wFar = this.width * scFar;
      const hFar = this.height * scFar;
      const rFar = this.roofHeight * scFar;

      ctx.save();

      // 1. Bayangan di Aspal
      ctx.beginPath();
      ctx.moveTo(pNx - wNear * 0.52, pNy);
      ctx.lineTo(pNx + wNear * 0.52, pNy);
      ctx.lineTo(pFx + wFar * 0.52, pFy);
      ctx.lineTo(pFx - wFar * 0.52, pFy);
      ctx.closePath();
      ctx.fillStyle = 'rgba(7, 13, 24, 0.55)';
      ctx.fill();

      // 2. Dinding Samping Kiri Gerbong (Perspektif)
      const pTL_roof_near = { x: pNx - wNear * 0.48, y: pNy - rNear };
      const pTR_roof_near = { x: pNx + wNear * 0.48, y: pNy - rNear };
      const pTL_roof_far  = { x: pFx - wFar * 0.48, y: pFy - rFar };
      const pTR_roof_far  = { x: pFx + wFar * 0.48, y: pFy - rFar };

      const pBL_ground_near = { x: pNx - wNear * 0.50, y: pNy - 4 * scNear };
      const pBR_ground_near = { x: pNx + wNear * 0.50, y: pNy - 4 * scNear };
      const pBL_ground_far  = { x: pFx - wFar * 0.50, y: pFy - 4 * scFar };
      const pBR_ground_far  = { x: pFx + wFar * 0.50, y: pFy - 4 * scFar };

      // Sisi Kiri Kereta
      ctx.fillStyle = (this.lane >= 1) ? '#152C60' : '#1C3879';
      ctx.beginPath();
      ctx.moveTo(pTL_roof_near.x, pTL_roof_near.y);
      ctx.lineTo(pTL_roof_far.x, pTL_roof_far.y);
      ctx.lineTo(pBL_ground_far.x, pBL_ground_far.y);
      ctx.lineTo(pBL_ground_near.x, pBL_ground_near.y);
      ctx.closePath();
      ctx.fill();

      // Sisi Kanan Kereta
      ctx.fillStyle = (this.lane <= 1) ? '#152C60' : '#1C3879';
      ctx.beginPath();
      ctx.moveTo(pTR_roof_near.x, pTR_roof_near.y);
      ctx.lineTo(pTR_roof_far.x, pTR_roof_far.y);
      ctx.lineTo(pBR_ground_far.x, pBR_ground_far.y);
      ctx.lineTo(pBR_ground_near.x, pBR_ground_near.y);
      ctx.closePath();
      ctx.fill();

      // Jendela-Jendela Samping Penumpang
      if (s > 0 || (s === 0 && posNear)) {
        for (let j = 0.25; j <= 0.75; j += 0.28) {
          const jX_L = pTL_roof_near.x + (pTL_roof_far.x - pTL_roof_near.x) * j;
          const jY_L = pTL_roof_near.y + (pTL_roof_far.y - pTL_roof_near.y) * j;
          const jSc = scNear + (scFar - scNear) * j;
          
          ctx.fillStyle = '#FFE082'; // Cahaya hangat dalam kabin
          ctx.fillRect(jX_L - 3 * jSc, jY_L + 12 * jSc, 6 * jSc, 14 * jSc);
          ctx.strokeStyle = '#0B1325';
          ctx.lineWidth = 1 * jSc;
          ctx.strokeRect(jX_L - 3 * jSc, jY_L + 12 * jSc, 6 * jSc, 14 * jSc);
        }
      }

      // 3. ATAP KERETA (SOLID ROOF RUNNING PLATFORM)
      // Skema Atap: Abu-abu Baja Elegan + Jalur Pijakan Kuning Emas Cirebon
      const roofGrad = ctx.createLinearGradient(0, pTL_roof_far.y, 0, pTL_roof_near.y);
      roofGrad.addColorStop(0, '#24344D');
      roofGrad.addColorStop(1, '#334B6E');
      ctx.fillStyle = roofGrad;
      ctx.beginPath();
      ctx.moveTo(pTL_roof_near.x, pTL_roof_near.y);
      ctx.lineTo(pTR_roof_near.x, pTR_roof_near.y);
      ctx.lineTo(pTR_roof_far.x, pTR_roof_far.y);
      ctx.lineTo(pTL_roof_far.x, pTL_roof_far.y);
      ctx.closePath();
      ctx.fill();

      // Jalur Catwalk / Lintasan Pijakan Lari Kuning Emas di Tengah Atap
      const pCL_roof_near = { x: pNx - wNear * 0.24, y: pNy - rNear };
      const pCR_roof_near = { x: pNx + wNear * 0.24, y: pNy - rNear };
      const pCL_roof_far  = { x: pFx - wFar * 0.24, y: pFy - rFar };
      const pCR_roof_far  = { x: pFx + wFar * 0.24, y: pFy - rFar };

      ctx.fillStyle = 'rgba(255, 183, 3, 0.45)';
      ctx.beginPath();
      ctx.moveTo(pCL_roof_near.x, pCL_roof_near.y);
      ctx.lineTo(pCR_roof_near.x, pCR_roof_near.y);
      ctx.lineTo(pCR_roof_far.x, pCR_roof_far.y);
      ctx.lineTo(pCL_roof_far.x, pCL_roof_far.y);
      ctx.closePath();
      ctx.fill();

      // Garis Grid / Panel Atap Kereta
      ctx.strokeStyle = '#0B1325';
      ctx.lineWidth = Math.max(1, 1.8 * scNear);
      ctx.beginPath();
      ctx.moveTo(pTL_roof_near.x, pTL_roof_near.y);
      ctx.lineTo(pTR_roof_near.x, pTR_roof_near.y);
      ctx.lineTo(pTR_roof_far.x, pTR_roof_far.y);
      ctx.lineTo(pTL_roof_far.x, pTL_roof_far.y);
      ctx.closePath();
      ctx.stroke();

      // AC Box / Ventilasi di Atas Atap Gerbong
      const acMidX = (pNx + pFx) * 0.5;
      const acMidY = (pNy - rNear + pFy - rFar) * 0.5;
      const acSc = (scNear + scFar) * 0.5;
      ctx.fillStyle = '#1A2332';
      ctx.fillRect(acMidX - 12 * acSc, acMidY - 7 * acSc, 24 * acSc, 6 * acSc);
      ctx.strokeStyle = '#FFB703';
      ctx.lineWidth = 1 * acSc;
      ctx.strokeRect(acMidX - 12 * acSc, acMidY - 7 * acSc, 24 * acSc, 6 * acSc);

      // 4. BOGIE RODA BAWAH (WHEELS & UNDERCARRIAGE)
      ctx.fillStyle = '#0B1325';
      ctx.fillRect(pNx - wNear * 0.46, pNy - 10 * scNear, wNear * 0.92, 10 * scNear);
      ctx.fillStyle = '#475569';
      ctx.fillRect(pNx - wNear * 0.38, pNy - 6 * scNear, wNear * 0.76, 6 * scNear);

      // 5. MUKA DEPAN LOKOMOTIF (Hanya untuk bagian kepala / Section 0)
      if (s === 0 && posNear) {
        ctx.translate(pNx, pNy);

        // Badan Depan Lokomotif (Navy Blue Keraton)
        const frontGrad = ctx.createLinearGradient(0, -hNear, 0, 0);
        frontGrad.addColorStop(0, '#1E3A8A');
        frontGrad.addColorStop(0.6, '#152E6E');
        frontGrad.addColorStop(1, '#0F214E');
        ctx.fillStyle = frontGrad;
        ctx.beginPath();
        ctx.roundRect(-wNear * 0.48, -hNear, wNear * 0.96, hNear, 8 * scNear);
        ctx.fill();

        // Garis Motif Terracotta & Gold Khas Cirebon
        ctx.fillStyle = '#FF6B00';
        ctx.fillRect(-wNear * 0.48, -hNear * 0.54, wNear * 0.96, 7 * scNear);
        ctx.fillStyle = '#FFB703';
        ctx.fillRect(-wNear * 0.48, -hNear * 0.46, wNear * 0.96, 5 * scNear);

        // Kaca Kabin Masinis Depan (Windshield)
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.roundRect(-wNear * 0.40, -hNear * 0.94, wNear * 0.80, hNear * 0.35, 5 * scNear);
        ctx.fill();

        // Pantulan Cahaya di Kaca Kabin
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(-wNear * 0.36, -hNear * 0.90, wNear * 0.34, hNear * 0.26);
        ctx.fillRect(wNear * 0.02, -hNear * 0.90, wNear * 0.34, hNear * 0.26);

        // Lampu Sorot Depan (Dual Powerful Headlights)
        const hlLeft = -wNear * 0.30;
        const hlRight = wNear * 0.30;
        const hlY = -hNear * 0.26;
        const lRad = 7 * scNear;

        // Sorot Cahaya Radial Terang ke Arah Kamera
        const beamGrad = ctx.createRadialGradient(0, hlY, 4 * scNear, 0, hlY, 55 * scNear);
        beamGrad.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
        beamGrad.addColorStop(0.3, 'rgba(255, 183, 3, 0.65)');
        beamGrad.addColorStop(1, 'rgba(255, 183, 3, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.arc(0, hlY, 55 * scNear, 0, Math.PI * 2);
        ctx.fill();

        // Fisik Lampu
        ctx.fillStyle = '#FFF8E7';
        ctx.beginPath();
        ctx.arc(hlLeft, hlY, lRad, 0, Math.PI * 2);
        ctx.arc(hlRight, hlY, lRad, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFB703';
        ctx.lineWidth = 2 * scNear;
        ctx.stroke();

        // Plakat Teks Depan "CIREBON EXPRESS"
        ctx.fillStyle = '#FFF8E7';
        ctx.font = `bold ${Math.max(8, Math.floor(10.5 * scNear))}px Poppins, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CIREBON EXPRESS', 0, -hNear * 0.38);

        // Bemper Baja Bawah
        ctx.fillStyle = '#0B1325';
        ctx.fillRect(-wNear * 0.52, -14 * scNear, wNear * 1.04, 14 * scNear);
        ctx.strokeStyle = '#FFB703';
        ctx.lineWidth = 2 * scNear;
        ctx.strokeRect(-wNear * 0.48, -hNear, wNear * 0.96, hNear);
      }

      ctx.restore();
    }
  }

  renderBarrier(ctx, w, h, scale) {
    const beamY = -h * 0.78;
    const beamHeight = Math.max(4, h * 0.28);
    const legWidth = Math.max(3, w * 0.12);

    ctx.fillStyle = '#6A1A0D';
    ctx.fillRect(-w * 0.38, beamY + beamHeight, legWidth, h * 0.38);
    ctx.fillRect(w * 0.26, beamY + beamHeight, legWidth, h * 0.38);

    ctx.fillStyle = '#8B2616';
    ctx.fillRect(-w * 0.52, beamY - 2 * scale, w * 1.04, beamHeight + 4 * scale);
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(-w * 0.5, beamY, w, beamHeight);

    ctx.fillStyle = '#FFF8E7';
    const stripeWidth = Math.max(3, w * 0.12);
    for (let stripeX = -w * 0.44; stripeX < w * 0.4; stripeX += stripeWidth * 2) {
      ctx.fillRect(stripeX, beamY, stripeWidth, beamHeight);
    }
  }

  renderBox(ctx, w, h, scale) {
    const left = -w * 0.46;
    const top = -h;
    const boxWidth = w * 0.92;
    const boxHeight = h * 0.9;

    ctx.fillStyle = '#6A3B1F';
    ctx.fillRect(left, top, boxWidth, boxHeight);
    ctx.fillStyle = '#A86A35';
    ctx.fillRect(left + 3 * scale, top + 3 * scale, boxWidth - 6 * scale, boxHeight - 6 * scale);
    ctx.strokeStyle = '#5C331B';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.strokeRect(left + 5 * scale, top + 5 * scale, boxWidth - 10 * scale, boxHeight - 10 * scale);
    ctx.beginPath();
    ctx.moveTo(0, top + 4 * scale);
    ctx.lineTo(0, top + boxHeight - 4 * scale);
    ctx.moveTo(left + 5 * scale, top + boxHeight * 0.5);
    ctx.lineTo(left + boxWidth - 5 * scale, top + boxHeight * 0.5);
    ctx.stroke();
  }

  renderCart(ctx, w, h, scale) {
    const wheelRadius = Math.max(3, h * 0.13);
    const bodyY = -h * 0.68;

    ctx.strokeStyle = '#5C331B';
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(w * 0.28, bodyY + h * 0.18);
    ctx.lineTo(w * 0.62, bodyY + h * 0.35);
    ctx.stroke();

    ctx.fillStyle = '#A84323';
    ctx.fillRect(-w * 0.45, bodyY, w * 0.9, h * 0.44);
    ctx.fillStyle = '#FFB703';
    ctx.fillRect(-w * 0.48, bodyY - h * 0.1, w * 0.96, h * 0.13);

    for (const wheelX of [-w * 0.28, w * 0.28]) {
      ctx.beginPath();
      ctx.arc(wheelX, -wheelRadius, wheelRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#1B283E';
      ctx.fill();
      ctx.strokeStyle = '#D6A15D';
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.stroke();
    }
  }

  renderTahuGejrot(ctx, w, h, scale) {
    const top = -h * 0.72;
    const wheelRadius = Math.max(3, h * 0.12);

    ctx.fillStyle = '#8B2616';
    ctx.fillRect(-w * 0.46, top + h * 0.24, w * 0.92, h * 0.34);
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(-w * 0.52, top + h * 0.16, w * 1.04, h * 0.12);
    ctx.fillStyle = '#FFB703';
    ctx.fillRect(-w * 0.4, top + h * 0.06, w * 0.8, h * 0.1);

    ctx.fillStyle = '#5D4037';
    ctx.fillRect(-w * 0.24, top - h * 0.16, w * 0.48, h * 0.18);
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.ellipse(0, top - h * 0.13, w * 0.2, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const wheelX of [-w * 0.3, w * 0.3]) {
      ctx.beginPath();
      ctx.arc(wheelX, -wheelRadius, wheelRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#1B283E';
      ctx.fill();
      ctx.strokeStyle = '#D6A15D';
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.stroke();
    }
  }
}

/**
 * Pengelola Spawning Rintangan (ObstacleManager)
 * Menjamin tidak pernah memblokir 3 jalur sekaligus (minimal 1 jalur aman).
 * Mengatur kemunculan Kereta Cirebon dengan peringatan dini (Train Warning).
 */
class ObstacleManager {
  constructor(game) {
    this.game = game;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.baseSpawnInterval = 2.2;
    this.trainWarningTimer = 0;
    this.trainWarningLane = null;
    this.trainSpawnCountdown = 0;
  }

  reset() {
    this.obstacles = [];
    this.spawnTimer = 1.5; // Jeda sebelum obstacle pertama
    this.trainWarningTimer = 0;
    this.trainWarningLane = null;
    this.trainSpawnCountdown = 0;
    this.hideTrainWarning();
  }

  /**
   * Update rintangan aktif dan spawn rintangan baru
   */
  update(dt, speed) {
    // 1. Update posisi rintangan
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(dt, speed);

      // Hapus rintangan jika sudah berada di belakang layar
      if (obs.z < -80) {
        this.obstacles.splice(i, 1);
      }
    }

    // 2. Update Countdown Peringatan Kereta Mendekat
    if (this.trainSpawnCountdown > 0) {
      this.trainSpawnCountdown -= dt;
      if (this.trainSpawnCountdown <= 0 && this.trainWarningLane !== null) {
        // Spawn Kereta pada lane yang sudah diperingatkan!
        const train = new Obstacle({
          lane: this.trainWarningLane,
          z: 1100,
          type: 'train'
        });
        this.obstacles.push(train);

        // Tambahkan deretan koin bonus di atas atap kereta!
        if (this.game.coinManager && typeof Coin !== 'undefined') {
          for (let c = 0; c < 5; c++) {
            this.game.coinManager.coins.push(new Coin({
              lane: train.lane,
              z: 1100 + 50 + c * 70,
              y: train.roofHeight + 14
            }));
          }
        }

        if (typeof SoundSystem !== 'undefined') {
          SoundSystem.playTrainHorn();
        }
        this.trainWarningLane = null;
        this.hideTrainWarning();
      }
    }

    // 3. Spawning rintangan reguler
    const currentInterval = Math.max(1.15, this.baseSpawnInterval - (speed - 500) * 0.0011);
    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = currentInterval;
    }
  }

  /**
   * Menampilkan UI Banner Peringatan Kereta Mendekat
   */
  showTrainWarning(lane) {
    const warningEl = document.getElementById('train-warning-banner');
    if (warningEl) {
      const laneNames = ['KIRI (LEFT)', 'TENGAH (CENTER)', 'KANAN (RIGHT)'];
      const laneText = laneNames[lane] || 'JALUR';
      const textEl = warningEl.querySelector('.train-warning-text');
      if (textEl) {
        textEl.textContent = `KERETA MENDEKAT DI JALUR ${laneText}!`;
      }
      warningEl.classList.add('active');
    }
  }

  hideTrainWarning() {
    const warningEl = document.getElementById('train-warning-banner');
    if (warningEl) {
      warningEl.classList.remove('active');
    }
  }

  /**
   * Spawning Rintangan dengan JAMINAN SAFE PATH
   * Selalu menjamin minimal 1 jalur bebas dilewati!
   */
  spawn() {
    const rand = Math.random();
    const spawnZ = 980;
    const types = ['barrier', 'box', 'cart', 'tahu_gejrot'];

    // Peluang Kereta muncul jika jarak sudah > 60m dan belum ada kereta aktif
    const hasTrainActive = this.obstacles.some(o => o.type === 'train') || this.trainSpawnCountdown > 0;
    if (this.game.distance > 50 && !hasTrainActive && Math.random() < 0.22) {
      // Siapkan peringatan kereta 1.8 detik sebelum kereta tiba di lintasan
      this.trainWarningLane = Math.floor(Math.random() * 3);
      this.trainSpawnCountdown = 1.6;
      this.showTrainWarning(this.trainWarningLane);
      if (typeof SoundSystem !== 'undefined') {
        SoundSystem.playTrainHorn();
      }
      return;
    }

    if (rand < 0.6) {
      // Pola 1: Satu rintangan pada salah satu jalur (2 jalur lainnya aman)
      const lane = Math.floor(Math.random() * 3);
      const type = types[Math.floor(Math.random() * types.length)];
      this.obstacles.push(new Obstacle({ lane, z: spawnZ, type }));
    } else {
      // Pola 2: Dua rintangan sekaligus (meninggalkan tepat 1 jalur aman)
      const safeLane = Math.floor(Math.random() * 3); // 0, 1, atau 2 dijamin aman
      for (let l = 0; l < 3; l++) {
        if (l !== safeLane) {
          const type = types[Math.floor(Math.random() * types.length)];
          this.obstacles.push(new Obstacle({ lane: l, z: spawnZ, type }));
        }
      }
    }
  }

  /**
   * Render seluruh rintangan terurut dari terjauh ke terdekat
   */
  render(ctx) {
    const sorted = [...this.obstacles].sort((a, b) => b.z - a.z);
    for (const obs of sorted) {
      obs.render(ctx, this.game);
    }
  }
}
