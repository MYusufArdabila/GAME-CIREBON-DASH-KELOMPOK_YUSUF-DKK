/**
 * ============================================================================
 * CIREBON DASH — MODUL KOIN (js/coin.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Mengatur pergerakan koin emas, animasi rotasi 3D, pola spawn
 *            (trail / busur lompat), partikel koleksi, dan rendering 2.5D.
 * ============================================================================
 */

class Coin {
  /**
   * Konstruktor Koin
   * @param {Object} options
   * @param {number} options.lane - Jalur (0 = Kiri, 1 = Tengah, 2 = Kanan)
   * @param {number} options.z - Posisi Z di lintasan
   * @param {number} options.y - Ketinggian dari tanah (0 = di aspal, > 0 = melayang di udara)
   */
  constructor({ lane, z, y = 14 }) {
    this.lane = lane;
    this.z = z;
    this.y = y;
    this.radius = 16;
    this.collected = false;

    // Sudut rotasi untuk ilusi koin berputar 3D
    this.rotation = Math.random() * Math.PI * 2;
  }

  /**
   * Update posisi dan rotasi koin
   * @param {number} dt
   * @param {number} speed
   */
  update(dt, speed) {
    this.z -= speed * dt;
    this.rotation += dt * 5; // Putaran koin
  }

  /**
   * Tarik koin ke posisi player (Skill Magnet ARDA)
   */
  attractTowards(targetLane, targetZ, targetY, dt, pullForce = 8.5) {
    const laneDiff = targetLane - this.lane;
    this.lane += laneDiff * Math.min(1, dt * pullForce);
    
    // Tarik sedikit secara kedalaman Z jika masih jauh
    const zDiff = targetZ - this.z;
    this.z += zDiff * Math.min(0.7, dt * (pullForce * 0.7));

    // Tarik ketinggian Y
    const yDiff = targetY - this.y;
    this.y += yDiff * Math.min(1, dt * pullForce);
  }

  /**
   * Render koin ke canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} game
   */
  render(ctx, game) {
    if (this.collected) return;

    const pos = game.project(this.lane, this.z, this.y);
    if (!pos) return;

    const shadowPos = game.project(this.lane, this.z, 0);

    const x = pos.x;
    const y = pos.y;
    const scale = pos.scale;

    const r = this.radius * scale;
    // Efek lebar mendatar saat berputar (perspektif silinder 3D)
    const spinWidth = Math.abs(Math.cos(this.rotation)) * r;

    ctx.save();

    // 1. Bayangan di Aspal
    if (shadowPos) {
      ctx.beginPath();
      ctx.ellipse(shadowPos.x, shadowPos.y, Math.max(0.1, r * 0.8), Math.max(0.1, 5 * scale), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(11, 19, 37, 0.3)';
      ctx.fill();
    }

    // 2. Keping Koin Emas
    ctx.translate(x, y);

    // Lingkaran Luar Koin (Golden Yellow khas Cirebon)
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(0.1, Math.max(2, spinWidth)), Math.max(0.1, r), 0, 0, Math.PI * 2);
    ctx.fillStyle = '#FFB703';
    ctx.fill();

    // Border Koin Oranye Tua
    ctx.strokeStyle = '#D94E00';
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.stroke();

    // Lingkaran Dalam / Ukiran Koin
    if (spinWidth > 4 * scale) {
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(0.1, spinWidth * 0.65), Math.max(0.1, r * 0.65), 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFE066';
      ctx.fill();

      // Kilau Cahaya Putih (Sheen)
      ctx.beginPath();
      ctx.ellipse(-spinWidth * 0.2, -r * 0.25, Math.max(0.1, spinWidth * 0.25), Math.max(0.1, r * 0.25), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Efek Partikel Percikan Emas saat Koin Diambil
 */
class CoinParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 40;
    this.alpha = 1;
    this.size = 3 + Math.random() * 4;
    this.color = Math.random() < 0.5 ? '#FFB703' : '#FFF8E7';
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.alpha -= dt * 2.2;
  }

  render(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Pengelola Koin & Partikel (CoinManager)
 */
class CoinManager {
  constructor(game) {
    this.game = game;
    this.coins = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.6;
  }

  reset() {
    this.coins = [];
    this.particles = [];
    this.spawnTimer = 0.8;
  }

  /**
   * Menambahkan partikel percikan saat koin berhasil diambil
   */
  spawnCollectEffect(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push(new CoinParticle(x, y));
    }
  }

  /**
   * Update seluruh koin dan partikel
   * @param {number} dt
   * @param {number} speed
   */
  update(dt, speed) {
    const player = this.game.player;
    const isArdaMagnet = player && player.isMagnetActive && player.state !== 'dead';
    let pullingCount = 0;

    // 1. Update koin & implementasi tarikan magnet
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.update(dt, speed);

      // Skill Magnet ARDA: Tarik koin dalam radius
      if (isArdaMagnet && !coin.collected) {
        const dz = coin.z - player.z;
        // Jika koin berada di depan player dalam radius magnet (misal jarak 0 s/d 185)
        if (dz > -25 && dz < player.magnetRadius) {
          const laneDist = Math.abs(player.currentLaneX - coin.lane);
          if (laneDist < 1.8) {
            pullingCount++;
            const pullStrength = 9.5 + (1 - dz / player.magnetRadius) * 6;
            coin.attractTowards(player.currentLaneX, player.z + 10, player.y + 16, dt, pullStrength);
          }
        }
      }

      // Hapus koin jika sudah diambil atau sudah lewat layar
      if (coin.collected || coin.z < -40) {
        this.coins.splice(i, 1);
      }
    }

    if (player) {
      player.magnetPullingCount = pullingCount;
    }

    // 2. Update partikel efek
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 3. Spawning koin berkala
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = this.spawnInterval;
    }
  }

  /**
   * Pola Pemunculan Koin (Single, Trail 4 Koin, atau Busur Lompat)
   */
  spawn() {
    const lane = Math.floor(Math.random() * 3);
    const pattern = Math.random();
    const startZ = 960;

    if (pattern < 0.45) {
      // Pola 1: Deretan (Trail) 4 koin di satu jalur
      for (let i = 0; i < 4; i++) {
        this.coins.push(new Coin({
          lane: lane,
          z: startZ + i * 55,
          y: 14,
        }));
      }
    } else if (pattern < 0.75) {
      // Pola 2: Busur Melengkung (Arc) memotivasi player untuk melompat
      const heights = [14, 38, 48, 38, 14];
      for (let i = 0; i < heights.length; i++) {
        this.coins.push(new Coin({
          lane: lane,
          z: startZ + i * 50,
          y: heights[i],
        }));
      }
    } else {
      // Pola 3: Koin tersebar di dua jalur berbeda
      const otherLane = (lane + 1) % 3;
      this.coins.push(new Coin({ lane, z: startZ, y: 14 }));
      this.coins.push(new Coin({ lane, z: startZ + 50, y: 14 }));
      this.coins.push(new Coin({ lane: otherLane, z: startZ + 110, y: 14 }));
      this.coins.push(new Coin({ lane: otherLane, z: startZ + 160, y: 14 }));
    }
  }

  /**
   * Render koin dan partikel
   */
  render(ctx) {
    // Urutkan koin berdasarkan Z
    const sorted = [...this.coins].sort((a, b) => b.z - a.z);
    for (const coin of sorted) {
      coin.render(ctx, this.game);
    }

    // Gambar partikel di atas koin
    for (const p of this.particles) {
      p.render(ctx);
    }
  }
}
