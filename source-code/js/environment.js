/**
 * ============================================================================
 * CIREBON DASH — MODUL ENVIRONMENT MAP (js/environment.js)
 * Mata Kuliah: Desain Web (Semester 5)
 * Deskripsi: Mengelola peta kota Cirebon tanpa henti (Cirebon City Run)
 *            secara prosedural: 4 tema map, bangunan ruko, keraton, urban, mall,
 *            kendaraan dekoratif (angkot & becak), NPC warga, props trotoar,
 *            dan HANYA 1 GAPURA UTAMA CIREBON (Landmark Monumental).
 * ============================================================================
 */

/**
 * ----------------------------------------------------------------------------
 * 1. KELAS BANGUNAN DEKORATIF (Building)
 * Menghasilkan ruko bertingkat, warung makan khas, dan arsitektur keraton.
 * ----------------------------------------------------------------------------
 */
class Building {
  constructor(options) {
    this.side = options.side;               // 'left' | 'right'
    this.z = options.z;                     // Posisi kedalaman Z di dunia game
    this.width = options.width || 135;      // Lebar bangunan
    this.height = options.height || 180;    // Tinggi bangunan
    this.floors = options.floors || 2;      // Jumlah lantai
    this.wallColor = options.wallColor;     // Warna dinding
    this.roofColor = options.roofColor;     // Warna atap genteng
    this.awningColor = options.awningColor; // Warna kanopi kain
    this.signText = options.signText || ''; // Papan nama toko / warung
    this.segmentType = options.segmentType; // 'street' | 'keraton' | 'urban' | 'mall'

    // Offset posisi jalur: sisi kiri berada di luar trotoar kiri, kanan di luar trotoar kanan
    this.lane = this.side === 'left' ? -2.2 : 3.2;
  }

  update(dt, speed) {
    this.z -= speed * dt;
  }

  render(ctx, game) {
    const pos = game.project(this.lane, this.z, 0);
    if (!pos) return;

    const x = pos.x;
    const y = pos.y;
    const scale = pos.scale;

    const w = this.width * scale;
    const h = this.height * scale;

    // Transisi jarak halus (fade-in natural dari horizon menuju dekat)
    const alpha = Math.min(1, Math.max(0, (1050 - this.z) / 250));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    // Render khusus berdasarkan tipe segmen
    if (this.segmentType === 'keraton') {
      this.renderKeratonBuilding(ctx, w, h, scale);
    } else if (this.segmentType === 'urban') {
      this.renderUrbanBuilding(ctx, w, h, scale);
    } else if (this.segmentType === 'mall') {
      this.renderMallBuilding(ctx, w, h, scale);
    } else {
      this.renderShophouse(ctx, w, h, scale);
    }

    ctx.restore();
  }

  /**
   * Render Ruko Bertingkat Kota Cirebon
   */
  renderShophouse(ctx, w, h, scale) {
    // Dinding Utama Bangunan
    ctx.fillStyle = this.wallColor;
    ctx.fillRect(-w * 0.5, -h, w, h);

    // Bayangan Sisi Dalam
    ctx.fillStyle = 'rgba(11, 19, 37, 0.15)';
    ctx.fillRect(this.side === 'left' ? w * 0.35 : -w * 0.5, -h, w * 0.15, h);

    // Atap Genteng Cirebon
    ctx.fillStyle = this.roofColor;
    ctx.beginPath();
    ctx.moveTo(-w * 0.55, -h);
    ctx.lineTo(w * 0.55, -h);
    ctx.lineTo(w * 0.45, -h - 22 * scale);
    ctx.lineTo(-w * 0.45, -h - 22 * scale);
    ctx.closePath();
    ctx.fill();

    // Jendela Lantai Atas
    const winW = w * 0.22;
    const winH = h * 0.22;
    ctx.fillStyle = '#152238';
    ctx.fillRect(-w * 0.35, -h * 0.85, winW, winH);
    ctx.fillRect(w * 0.12, -h * 0.85, winW, winH);

    // Kaca Jendela dengan Pantulan Langit Hangat
    ctx.fillStyle = '#FFDE8A';
    ctx.fillRect(-w * 0.33, -h * 0.83, winW - 4 * scale, winH - 4 * scale);
    ctx.fillRect(w * 0.14, -h * 0.83, winW - 4 * scale, winH - 4 * scale);

    // Kanopi Garis-Garis di Atas Pintu Toko
    ctx.fillStyle = this.awningColor;
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, -h * 0.45);
    ctx.lineTo(w * 0.5, -h * 0.45);
    ctx.lineTo(w * 0.52, -h * 0.35);
    ctx.lineTo(-w * 0.52, -h * 0.35);
    ctx.closePath();
    ctx.fill();

    // Pintu Kaca / Pintu Geser Toko
    ctx.fillStyle = '#203354';
    ctx.fillRect(-w * 0.3, -h * 0.35, w * 0.6, h * 0.35);

    // Papan Nama Toko / Signboard (Teks toko Cirebon asli)
    if (this.signText && scale > 0.35) {
      ctx.fillStyle = '#FFB703';
      ctx.fillRect(-w * 0.42, -h * 0.6, w * 0.84, 18 * scale);
      ctx.strokeStyle = '#0B1325';
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(-w * 0.42, -h * 0.6, w * 0.84, 18 * scale);

      ctx.fillStyle = '#0B1325';
      ctx.font = `bold ${Math.max(7, Math.floor(9 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.signText, 0, -h * 0.6 + 9 * scale);
    }
  }

  /**
   * Render Arsitektur Keraton (Tembok Bata Merah & Atap Limasan Bertingkat)
   */
  renderKeratonBuilding(ctx, w, h, scale) {
    // Tembok Utama Bata Merah Keraton Kasepuhan
    ctx.fillStyle = '#A84323';
    ctx.fillRect(-w * 0.5, -h * 0.8, w, h * 0.8);

    // Tekstur Garis Bata Horizontal (Safe bounded loop)
    ctx.fillStyle = '#8B2616';
    const bStep = Math.max(4, 16 * scale);
    for (let by = -h * 0.75; by < 0; by += bStep) {
      ctx.fillRect(-w * 0.5, by, w, Math.max(1, 2 * scale));
    }

    // Atap Meru Limasan Khas Cirebon Bertingkat Dua
    ctx.fillStyle = '#6A1A0D';
    // Tingkat 1 (Bawah)
    ctx.beginPath();
    ctx.moveTo(-w * 0.6, -h * 0.8);
    ctx.lineTo(w * 0.6, -h * 0.8);
    ctx.lineTo(w * 0.4, -h * 0.95);
    ctx.lineTo(-w * 0.4, -h * 0.95);
    ctx.closePath();
    ctx.fill();

    // Tingkat 2 (Puncak Mahkota Atap)
    ctx.fillStyle = '#FFB703';
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, -h * 0.95);
    ctx.lineTo(w * 0.35, -h * 0.95);
    ctx.lineTo(0, -h * 1.15);
    ctx.closePath();
    ctx.fill();

    // Ornamen Gerbang Candi Bentar Melengkung
    ctx.fillStyle = '#0B1325';
    ctx.beginPath();
    ctx.arc(0, -h * 0.4, w * 0.22, Math.PI, 0);
    ctx.lineTo(w * 0.22, 0);
    ctx.lineTo(-w * 0.22, 0);
    ctx.closePath();
    ctx.fill();

    // Motif Mega Mendung Emas di Atas Pintu
    ctx.strokeStyle = '#FFB703';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(0, -h * 0.4, w * 0.16, Math.PI, 0);
    ctx.stroke();

    // Papan Nama Cagar Budaya
    if (this.signText && scale > 0.35) {
      ctx.fillStyle = '#FFB703';
      ctx.fillRect(-w * 0.4, -h * 0.62, w * 0.8, 16 * scale);
      ctx.fillStyle = '#0B1325';
      ctx.font = `bold ${Math.max(6, Math.floor(8 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.signText, 0, -h * 0.62 + 8 * scale);
    }
  }

  /**
   * Render Kios Pasar Tradisional (Kanopi Terpal & Keranjang Pasar)
   */
  renderMarketBuilding(ctx, w, h, scale) {
    // Dinding Belakang Kios
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(-w * 0.5, -h * 0.7, w, h * 0.7);

    // Tenda Kanopi Pasar Bergaris Warna-Warni
    ctx.fillStyle = this.awningColor;
    ctx.beginPath();
    ctx.moveTo(-w * 0.58, -h * 0.75);
    ctx.lineTo(w * 0.58, -h * 0.75);
    ctx.lineTo(w * 0.5, -h * 0.5);
    ctx.lineTo(-w * 0.5, -h * 0.5);
    ctx.closePath();
    ctx.fill();

    // Meja Dagangan Pasar Kayu
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(-w * 0.45, -h * 0.45, w * 0.9, h * 0.45);

    // Buah & Sayuran Dagangan di Meja
    ctx.fillStyle = '#E67E22';
    ctx.beginPath();
    ctx.arc(-w * 0.25, -h * 0.48, 10 * scale, 0, Math.PI * 2);
    ctx.arc(0, -h * 0.48, 10 * scale, 0, Math.PI * 2);
    ctx.arc(w * 0.25, -h * 0.48, 10 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Papan Nama Kios Pasar
    if (this.signText && scale > 0.35) {
      ctx.fillStyle = '#FFF8E7';
      ctx.font = `bold ${Math.max(6, Math.floor(8 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(this.signText, 0, -h * 0.8);
    }
  }

  /**
   * Render Sentra Kuliner Khas Cirebon (Empal Gentong & Nasi Jamblang)
   */
  renderCulinaryBuilding(ctx, w, h, scale) {
    // Dinding Bambu / Kayu Hangat
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(-w * 0.5, -h * 0.75, w, h * 0.75);

    // Atap Rumbia / Genteng Tradisional
    ctx.fillStyle = '#A84323';
    ctx.beginPath();
    ctx.moveTo(-w * 0.55, -h * 0.75);
    ctx.lineTo(w * 0.55, -h * 0.75);
    ctx.lineTo(w * 0.4, -h * 0.95);
    ctx.lineTo(-w * 0.4, -h * 0.95);
    ctx.closePath();
    ctx.fill();

    // Spanduk Banner Kain Kuliner Khas Cirebon
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(-w * 0.45, -h * 0.65, w * 0.9, 24 * scale);
    ctx.strokeStyle = '#FFB703';
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeRect(-w * 0.45, -h * 0.65, w * 0.9, 24 * scale);

    if (this.signText && scale > 0.32) {
      ctx.fillStyle = '#FFF8E7';
      ctx.font = `bold ${Math.max(6, Math.floor(9 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.signText, 0, -h * 0.65 + 12 * scale);
    }

    // Gentong Tanah Liat Display di Depan Warung
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.arc(-w * 0.28, -h * 0.2, 14 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(-w * 0.35, -h * 0.35, 14 * scale, 4 * scale);

    // Lentera Lampu Gantung Warung Menyala
    ctx.fillStyle = '#FFD166';
    ctx.beginPath();
    ctx.arc(w * 0.25, -h * 0.5, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  renderUrbanBuilding(ctx, w, h, scale) {
    ctx.fillStyle = this.wallColor;
    ctx.fillRect(-w * 0.5, -h, w, h);
    ctx.fillStyle = '#263746';
    ctx.fillRect(-w * 0.43, -h * 0.9, w * 0.86, h * 0.78);

    const floors = Math.max(3, Math.min(6, this.floors || 5));
    const floorHeight = h * 0.72 / floors;
    const windowWidth = w * 0.13;
    const windowGap = w * 0.055;
    const firstWindowX = -((windowWidth * 4 + windowGap * 3) / 2);
    for (let floor = 0; floor < floors; floor++) {
      const rowY = -h * 0.84 + floor * floorHeight;
      ctx.fillStyle = floor % 2 === 0 ? '#8ED8E8' : '#B7E6EC';
      for (let column = 0; column < 4; column++) {
        ctx.fillRect(firstWindowX + column * (windowWidth + windowGap), rowY, windowWidth, floorHeight * 0.58);
      }
      ctx.fillStyle = '#DCE6E8';
      ctx.fillRect(-w * 0.44, rowY + floorHeight * 0.72, w * 0.88, Math.max(1, 2 * scale));
    }

    ctx.fillStyle = this.roofColor;
    ctx.fillRect(-w * 0.53, -h, w * 1.06, h * 0.08);
    ctx.fillStyle = this.awningColor;
    ctx.fillRect(-w * 0.43, -h * 0.16, w * 0.86, h * 0.13);
    ctx.fillStyle = '#10283A';
    ctx.fillRect(-w * 0.12, -h * 0.16, w * 0.24, h * 0.13);

    if (this.signText && scale > 0.35) {
      ctx.fillStyle = '#FFF8E7';
      ctx.font = `bold ${Math.max(6, Math.floor(8 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.signText, 0, -h * 0.095);
    }
  }

  renderMallBuilding(ctx, w, h, scale) {
    ctx.fillStyle = '#DCE6E8';
    ctx.fillRect(-w * 0.56, -h, w * 1.12, h);

    ctx.fillStyle = '#243B53';
    ctx.fillRect(-w * 0.51, -h * 0.94, w * 1.02, h * 0.12);
    ctx.fillStyle = '#FFB703';
    ctx.fillRect(-w * 0.51, -h * 0.82, w * 1.02, h * 0.025);

    ctx.fillStyle = '#6EC5D6';
    ctx.fillRect(-w * 0.48, -h * 0.77, w * 0.96, h * 0.5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let panel = 0; panel < 5; panel++) {
      ctx.fillRect(-w * 0.46 + panel * w * 0.19, -h * 0.75, w * 0.025, h * 0.46);
    }

    ctx.fillStyle = '#243B53';
    ctx.fillRect(-w * 0.5, -h * 0.27, w, h * 0.27);
    ctx.fillStyle = '#FF6B00';
    ctx.fillRect(-w * 0.17, -h * 0.4, w * 0.34, h * 0.13);
    ctx.fillStyle = '#FFF8E7';
    ctx.fillRect(-w * 0.11, -h * 0.25, w * 0.22, h * 0.25);

    ctx.fillStyle = '#F1C40F';
    ctx.beginPath();
    ctx.moveTo(-w * 0.59, -h);
    ctx.lineTo(w * 0.59, -h);
    ctx.lineTo(w * 0.53, -h * 1.08);
    ctx.lineTo(-w * 0.53, -h * 1.08);
    ctx.closePath();
    ctx.fill();

    if (this.signText && scale > 0.3) {
      ctx.fillStyle = '#FFF8E7';
      ctx.font = `bold ${Math.max(6, Math.floor(10 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.signText, 0, -h * 0.88);
    }
  }
}

/**
 * ----------------------------------------------------------------------------
 * 2. PROPS TEPI JALAN & TROTOAR (RoadsideProp)
 * Lampu jalan keraton, pohon peneduh, tiang listrik kabel, tanaman pot.
 * ----------------------------------------------------------------------------
 */
class RoadsideProp {
  constructor(options) {
    this.type = options.type;   // 'lantern' | 'tree' | 'pole' | 'pot' | 'sign'
    this.side = options.side;   // 'left' | 'right'
    this.z = options.z;
    // Berada di tepi trotoar (di luar jalur 3 lane runner)
    this.lane = this.side === 'left' ? -0.85 : 2.85;
  }

  update(dt, speed) {
    this.z -= speed * dt;
  }

  render(ctx, game) {
    const pos = game.project(this.lane, this.z, 0);
    if (!pos) return;

    const x = pos.x;
    const y = pos.y;
    const scale = pos.scale;

    const alpha = Math.min(1, Math.max(0, (1000 - this.z) / 250));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    if (this.type === 'lantern') {
      this.renderLantern(ctx, scale);
    } else if (this.type === 'tree') {
      this.renderTree(ctx, scale);
    } else if (this.type === 'pole') {
      this.renderPole(ctx, scale);
    } else if (this.type === 'sign') {
      this.renderStreetSign(ctx, scale);
    } else {
      this.renderPot(ctx, scale);
    }

    ctx.restore();
  }

  /**
   * Lentera Keraton Antik dengan Kaca Menyala Emas
   */
  renderLantern(ctx, scale) {
    const h = 75 * scale;
    // Tiang Besi Hitam Elegan
    ctx.fillStyle = '#152238';
    ctx.fillRect(-2 * scale, -h, 4 * scale, h);

    // Kepala Lentera
    ctx.fillStyle = '#8B2616';
    ctx.fillRect(-9 * scale, -h - 18 * scale, 18 * scale, 18 * scale);

    // Kaca Lentera Bercahaya Hangat
    ctx.fillStyle = '#FFD166';
    ctx.fillRect(-6 * scale, -h - 15 * scale, 12 * scale, 12 * scale);

    // Puncak Lentera Emas
    ctx.fillStyle = '#FFB703';
    ctx.beginPath();
    ctx.arc(0, -h - 20 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Pohon Peneduh Tropis / Palem
   */
  renderTree(ctx, scale) {
    const h = 110 * scale;
    // Batang Pohon
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(-4 * scale, -h, 8 * scale, h);

    // Daun Rindang Bertingkat
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.arc(0, -h - 18 * scale, 34 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(-8 * scale, -h - 25 * scale, 24 * scale, 0, Math.PI * 2);
    ctx.arc(8 * scale, -h - 25 * scale, 24 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Tiang Listrik Kota dengan Kabel Melengkung
   */
  renderPole(ctx, scale) {
    const h = 135 * scale;
    ctx.fillStyle = '#37474F';
    ctx.fillRect(-3 * scale, -h, 6 * scale, h);

    // Palang Salang Atas
    ctx.fillRect(-24 * scale, -h + 10 * scale, 48 * scale, 4 * scale);

    // Isolator Kabel Keramik Putih
    ctx.fillStyle = '#ECEFF1';
    ctx.fillRect(-20 * scale, -h + 6 * scale, 4 * scale, 4 * scale);
    ctx.fillRect(16 * scale, -h + 6 * scale, 4 * scale, 4 * scale);
  }

  /**
   * Rambu Lalu Lintas Kota Cirebon
   */
  renderStreetSign(ctx, scale) {
    const h = 60 * scale;
    ctx.fillStyle = '#78909C';
    ctx.fillRect(-2 * scale, -h, 4 * scale, h);

    // Papan Rambu Biru Kota Cirebon
    ctx.fillStyle = '#0D47A1';
    ctx.fillRect(-18 * scale, -h - 16 * scale, 36 * scale, 16 * scale);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(-18 * scale, -h - 16 * scale, 36 * scale, 16 * scale);

    if (scale > 0.4) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.max(5, Math.floor(6 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('CIREBON', 0, -h - 5 * scale);
    }
  }

  /**
   * Pot Bunga Tropis Trotoar
   */
  renderPot(ctx, scale) {
    // Pot Bata Merah
    ctx.fillStyle = '#A84323';
    ctx.beginPath();
    ctx.moveTo(-10 * scale, -16 * scale);
    ctx.lineTo(10 * scale, -16 * scale);
    ctx.lineTo(7 * scale, 0);
    ctx.lineTo(-7 * scale, 0);
    ctx.closePath();
    ctx.fill();

    // Tanaman Hias Hijau
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(0, -22 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.arc(0, -22 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * ----------------------------------------------------------------------------
 * 3. KENDARAAN DEKORATIF TEPI JALAN (DecorativeVehicle)
 * Angkot Cirebon, motor parkir, dan becak khas (DI LUAR 3 JALUR LARI).
 * ----------------------------------------------------------------------------
 */
class DecorativeVehicle {
  constructor(options) {
    this.type = options.type; // 'angkot' | 'becak' | 'motor'
    this.side = options.side; // 'left' | 'right'
    this.z = options.z;
    // Berada di tepi jalan / bahu jalan
    this.lane = this.side === 'left' ? -0.95 : 2.95;
  }

  update(dt, speed) {
    this.z -= speed * dt;
  }

  render(ctx, game) {
    const pos = game.project(this.lane, this.z, 0);
    if (!pos) return;

    const x = pos.x;
    const y = pos.y;
    const scale = pos.scale;

    const alpha = Math.min(1, Math.max(0, (950 - this.z) / 250));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    if (this.type === 'angkot') {
      this.renderAngkot(ctx, scale);
    } else if (this.type === 'becak') {
      this.renderBecak(ctx, scale);
    } else {
      this.renderMotor(ctx, scale);
    }

    ctx.restore();
  }

  /**
   * Angkot Biru Khas Jalur Kota Cirebon (Parkir di Tepi Jalan)
   */
  renderAngkot(ctx, scale) {
    const w = 55 * scale;
    const h = 40 * scale;

    // Body Angkot Biru Laut Khas Cirebon
    ctx.fillStyle = '#0288D1';
    ctx.fillRect(-w * 0.5, -h, w, h * 0.7);

    // Kaca Depan & Samping
    ctx.fillStyle = '#E0F7FA';
    ctx.fillRect(-w * 0.42, -h * 0.9, w * 0.84, h * 0.3);

    // Bumper Hitam Bawah
    ctx.fillStyle = '#263238';
    ctx.fillRect(-w * 0.48, -h * 0.3, w * 0.96, h * 0.3);

    // Roda Kiri & Kanan
    ctx.fillStyle = '#102027';
    ctx.beginPath();
    ctx.arc(-w * 0.3, 0, 7 * scale, 0, Math.PI * 2);
    ctx.arc(w * 0.3, 0, 7 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Tulisan Trayek 'D1' Cirebon
    if (scale > 0.4) {
      ctx.fillStyle = '#FFE082';
      ctx.font = `bold ${Math.max(5, Math.floor(7 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('D1 CIREBON', 0, -h * 0.45);
    }
  }

  /**
   * Becak Tradisional Cirebon Parkir
   */
  renderBecak(ctx, scale) {
    const w = 36 * scale;
    const h = 32 * scale;

    // Tenda Becak Cirebon (Kuning Terpal)
    ctx.fillStyle = '#FBC02D';
    ctx.beginPath();
    ctx.moveTo(-w * 0.45, -h);
    ctx.lineTo(w * 0.45, -h);
    ctx.lineTo(w * 0.35, -h * 0.4);
    ctx.lineTo(-w * 0.35, -h * 0.4);
    ctx.closePath();
    ctx.fill();

    // Kursi Penumpang Belakang
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(-w * 0.35, -h * 0.4, w * 0.7, h * 0.35);

    // Roda Becak Jari-Jari
    ctx.strokeStyle = '#37474F';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(-w * 0.32, 0, 8 * scale, 0, Math.PI * 2);
    ctx.arc(w * 0.32, 0, 8 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Sepeda Motor Warga Parkir
   */
  renderMotor(ctx, scale) {
    const w = 24 * scale;
    const h = 28 * scale;

    // Body Motor Merah
    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(-w * 0.35, -h * 0.7, w * 0.7, h * 0.35);

    // Stang & Spion
    ctx.fillStyle = '#263238';
    ctx.fillRect(-w * 0.45, -h * 0.85, w * 0.9, 3 * scale);

    // Roda
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(0, 0, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * ----------------------------------------------------------------------------
 * 4. WARGA CIREBON SANTAI DI TROTOAR (RoadsideNPC)
 * Warga santai berdiri atau berjalan di pinggir trotoar jalan.
 * ----------------------------------------------------------------------------
 */
class RoadsideNPC {
  constructor(options) {
    this.side = options.side;
    this.z = options.z;
    this.shirtColor = options.shirtColor || '#FFB703';
    this.hasIket = options.hasIket !== undefined ? options.hasIket : true;
    this.animOffset = Math.random() * Math.PI * 2;
    // Berada di tengah trotoar
    this.lane = this.side === 'left' ? -0.85 : 2.85;
  }

  update(dt, speed) {
    this.z -= speed * dt;
    this.animOffset += dt * 3;
  }

  render(ctx, game) {
    const pos = game.project(this.lane, this.z, 0);
    if (!pos) return;

    const x = pos.x;
    const y = pos.y;
    const scale = pos.scale;

    const alpha = Math.min(1, Math.max(0, (950 - this.z) / 250));

    const w = 18 * scale;
    const h = 42 * scale;
    const sway = Math.sin(this.animOffset) * 1.5 * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    // Bayangan Kaki
    ctx.fillStyle = 'rgba(11, 19, 37, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(0.1, w * 0.55), Math.max(0.1, 3 * scale), 0, 0, Math.PI * 2);
    ctx.fill();

    // Celana Panjang Navy
    ctx.fillStyle = '#152238';
    ctx.fillRect(-w * 0.3, -h * 0.45, w * 0.6, h * 0.45);

    // Baju Kaos / Kemeja Santai
    ctx.fillStyle = this.shirtColor;
    ctx.fillRect(-w * 0.4, -h * 0.75 + sway, w * 0.8, h * 0.32);

    // Kepala
    ctx.fillStyle = '#FFDFC4';
    ctx.beginPath();
    ctx.arc(0, -h * 0.85 + sway, w * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Iket Batik Cirebon di Kepala (Jika Ada)
    if (this.hasIket) {
      ctx.fillStyle = '#8B2616';
      ctx.fillRect(-w * 0.32, -h * 0.95 + sway, w * 0.64, 4 * scale);
      ctx.fillStyle = '#FFB703';
      ctx.fillRect(-w * 0.28, -h * 0.93 + sway, w * 0.56, 1.5 * scale);
    }

    ctx.restore();
  }
}

/**
 * ----------------------------------------------------------------------------
 * 5. GAPURA MONUMENTAL UTAMA CIREBON (LandmarkArch)
 * WAJIB: HANYA SATU GAPURA UTAMA CIREBON untuk keseluruhan map/session!
 * - Tiang gapura berada di luar 3 jalur runner (di atas trotoar).
 * - Balok & mahkota atap melintang tinggi di atas kepala pemain.
 * - Tidak menghalangi RIDD, tidak menjadi obstacle.
 * - Mengikuti perspektif 3D natural dari kejauhan hingga dilewati sekali.
 * ----------------------------------------------------------------------------
 */
class LandmarkArch {
  constructor(options) {
    this.z = options ? (options.z || 850) : 850;
    this.title = (options && options.title) || 'GAPURA KERATON CIREBON';
    this.theme = (options && options.theme) || 'keraton';
    this.isPassed = false;
  }

  update(dt, speed) {
    this.z -= (speed || 500) * dt;
  }

  render(ctx, game) {
    if (!game || typeof game.project !== 'function') return;
    if (this.z < -90 || this.z > 1400) return;

    // Tiang kiri di lane -0.75 dan tiang kanan di lane 2.75 (di luar 3 jalur runner)
    const leftPos = game.project(-0.75, this.z, 0);
    const rightPos = game.project(2.75, this.z, 0);
    if (!leftPos || !rightPos) return;

    const scale = Math.max(0.01, (leftPos.scale + rightPos.scale) / 2);
    // Ketinggian balok gapura yang tinggi dan lapang (player bebas melompat tanpa terhalang)
    const archHeight = Math.max(1, 245 * scale);
    const pillarW = Math.max(1, 38 * scale);

    const alpha = Math.min(1, Math.max(0, (1100 - this.z) / 250));
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. TIANG GAPURA KIRI (Candi Bentar Bata Merah Khas Cirebon Bertingkat)
    const pLX = leftPos.x;
    const pLY = leftPos.y;

    // Dinding Tiang Kiri Utama
    ctx.fillStyle = '#8B2616';
    ctx.fillRect(pLX - pillarW, pLY - archHeight, pillarW, archHeight);
    ctx.fillStyle = '#A84323';
    ctx.fillRect(pLX - pillarW + 4 * scale, pLY - archHeight, Math.max(1, pillarW - 8 * scale), archHeight);

    // Relief Garis Bata Merah Tiang Kiri (Safe bounded loop)
    ctx.fillStyle = '#6A1A0D';
    const stepL = Math.max(4, 18 * scale);
    for (let by = pLY - archHeight + 20 * scale; by < pLY; by += stepL) {
      ctx.fillRect(pLX - pillarW, by, pillarW, Math.max(1, 2 * scale));
    }

    // Mahkota Undakan Atas Tiang Kiri
    ctx.fillStyle = '#8B2616';
    ctx.beginPath();
    ctx.moveTo(pLX - pillarW - 6 * scale, pLY - archHeight);
    ctx.lineTo(pLX + 4 * scale, pLY - archHeight);
    ctx.lineTo(pLX - 2 * scale, pLY - archHeight - 20 * scale);
    ctx.lineTo(pLX - pillarW, pLY - archHeight - 20 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFB703';
    ctx.fillRect(pLX - pillarW + 2 * scale, pLY - archHeight - 8 * scale, Math.max(1, pillarW - 4 * scale), Math.max(1, 3 * scale));

    // 2. TIANG GAPURA KANAN (Candi Bentar Bata Merah Khas Cirebon Bertingkat)
    const pRX = rightPos.x;
    const pRY = rightPos.y;

    // Dinding Tiang Kanan Utama
    ctx.fillStyle = '#8B2616';
    ctx.fillRect(pRX, pRY - archHeight, pillarW, archHeight);
    ctx.fillStyle = '#A84323';
    ctx.fillRect(pRX + 4 * scale, pRY - archHeight, Math.max(1, pillarW - 8 * scale), archHeight);

    // Relief Garis Bata Merah Tiang Kanan (Safe bounded loop)
    ctx.fillStyle = '#6A1A0D';
    const stepR = Math.max(4, 18 * scale);
    for (let by = pRY - archHeight + 20 * scale; by < pRY; by += stepR) {
      ctx.fillRect(pRX, by, pillarW, Math.max(1, 2 * scale));
    }

    // Mahkota Undakan Atas Tiang Kanan
    ctx.fillStyle = '#8B2616';
    ctx.beginPath();
    ctx.moveTo(pRX - 4 * scale, pRY - archHeight);
    ctx.lineTo(pRX + pillarW + 6 * scale, pRY - archHeight);
    ctx.lineTo(pRX + pillarW, pRY - archHeight - 20 * scale);
    ctx.lineTo(pRX + 2 * scale, pRY - archHeight - 20 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFB703';
    ctx.fillRect(pRX + 2 * scale, pRY - archHeight - 8 * scale, Math.max(1, pillarW - 4 * scale), Math.max(1, 3 * scale));

    // 3. BALOK GAPURA MELINTANG TINGGI DI ATAS 3 JALUR
    const beamY = pLY - archHeight;
    const beamW = (pRX + pillarW) - (pLX - pillarW);
    const beamX = pLX - pillarW;
    const beamH = Math.max(1, 38 * scale);

    ctx.fillStyle = '#6A1A0D';
    ctx.fillRect(beamX, beamY, beamW, beamH);

    // Aksen Emas Motif Mega Mendung di Balok
    ctx.fillStyle = '#FFB703';
    ctx.fillRect(beamX, beamY + 4 * scale, beamW, Math.max(1, 3.5 * scale));
    ctx.fillRect(beamX, beamY + beamH - 6 * scale, beamW, Math.max(1, 3.5 * scale));

    // 4. ATAP MERU BERTINGKAT KHAS KERATON CIREBON (DI TENGAH ATAS BALOK)
    const midX = (pLX + pRX) / 2;
    
    // Tingkat 1 Meru
    ctx.fillStyle = '#8B2616';
    ctx.beginPath();
    ctx.moveTo(midX - 70 * scale, beamY);
    ctx.lineTo(midX + 70 * scale, beamY);
    ctx.lineTo(midX + 50 * scale, beamY - 24 * scale);
    ctx.lineTo(midX - 50 * scale, beamY - 24 * scale);
    ctx.closePath();
    ctx.fill();

    // Tingkat 2 Meru
    ctx.fillStyle = '#A84323';
    ctx.beginPath();
    ctx.moveTo(midX - 45 * scale, beamY - 24 * scale);
    ctx.lineTo(midX + 45 * scale, beamY - 24 * scale);
    ctx.lineTo(midX + 25 * scale, beamY - 42 * scale);
    ctx.lineTo(midX - 25 * scale, beamY - 42 * scale);
    ctx.closePath();
    ctx.fill();

    // Puncak Mahkota Meru Emas Cirebon
    ctx.fillStyle = '#FFB703';
    ctx.beginPath();
    ctx.moveTo(midX - 20 * scale, beamY - 42 * scale);
    ctx.lineTo(midX + 20 * scale, beamY - 42 * scale);
    ctx.lineTo(midX, beamY - 60 * scale);
    ctx.closePath();
    ctx.fill();

    // 5. PAPAN NAMA IDENTITAS GAPURA CIREBON
    if (scale > 0.28) {
      ctx.fillStyle = '#FFF8E7';
      ctx.font = `bold ${Math.max(7, Math.floor(13 * scale))}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.title, midX, beamY + beamH * 0.5);
    }

    ctx.restore();
  }
}

/**
 * ----------------------------------------------------------------------------
 * 6. PENGELOLA MAP UTAMA (EnvironmentManager)
 * Mengatur siklus segmen prosedural, parallax skyline, objek daur ulang,
 * dan memastikan dunia terasa ramai tanpa membebani performa.
 * ----------------------------------------------------------------------------
 */
class EnvironmentManager {
  constructor(game) {
    this.game = game;

    // Koleksi objek aktif di dunia 2.5D
    this.buildings = [];
    this.props = [];
    this.vehicles = [];
    this.npcs = [];
    this.landmarks = [];

    // HANYA 1 GAPURA untuk keseluruhan run
    this.hasSpawnedGapura = false;

    // Empat kawasan bergantian sepanjang rute.
    this.SEGMENTS = ['street', 'keraton', 'urban', 'mall'];
    this.currentSegmentIndex = 0;

    // Pelacak jarak untuk pergantian segmen (setiap ~380 meter berpindah kawasan)
    this.segmentLength = 380;
    this.nextSpawnZ = 300;
  }

  reset() {
    this.buildings = [];
    this.props = [];
    this.vehicles = [];
    this.npcs = [];
    this.landmarks = [];
    this.currentSegmentIndex = 0;
    this.hasSpawnedGapura = false;
    this.nextSpawnZ = 120;

    // Inisialisasi bentang jalan awal sepanjang 1000 satuan Z
    while (this.nextSpawnZ < 1050) {
      this.generateEnvironmentSlice(this.nextSpawnZ);
      this.nextSpawnZ += 150;
    }

    // WAJIB: SATU GAPURA UTAMA CIREBON (hanya 1 untuk keseluruhan session)
    this.landmarks.push(new LandmarkArch({
      z: 850,
      title: 'GAPURA KERATON CIREBON',
      theme: 'keraton'
    }));
    this.hasSpawnedGapura = true;
  }

  /**
   * Menentukan jenis segmen saat ini berdasarkan jarak lari pemain
   */
  getCurrentSegmentType() {
    const dist = this.game.distance || 0;
    const segIndex = Math.floor(dist / this.segmentLength) % this.SEGMENTS.length;
    return this.SEGMENTS[segIndex];
  }

  /**
   * Membuat satu potongan elemen lingkungan di koordinat Z tertentu
   */
  generateEnvironmentSlice(spawnZ) {
    const segType = this.getCurrentSegmentType();

    // Palet warna dan signage berganti mengikuti tema kawasan.
    const palettes = {
      street: {
        walls: ['#FFF8E7', '#F5E6CC', '#E0D0B8', '#D8C3A5'],
        roofs: ['#A84323', '#8B2616', '#6A1A0D'],
        awnings: ['#FF6B00', '#FFB703', '#152238'],
        signs: ['TOKO KELONTONG', 'BATIK TRUSMI', 'APOTEK KASEPUHAN', 'WARUNG BERKAH', 'AIRLANG BERKAH']
      },
      keraton: {
        walls: ['#A84323', '#963B1E', '#B34A28'],
        roofs: ['#6A1A0D', '#8B2616'],
        awnings: ['#FFB703', '#8B2616'],
        signs: ['KERATON KASEPUHAN', 'SANGGAR TOPENG', 'MUSEUM BENDA KUNO', 'TAMAN KERAJUT']
      },
      urban: {
        walls: ['#ECEFF1', '#CFD8DC', '#B0BEC5', '#FFF8E7'],
        roofs: ['#37474F', '#263238'],
        awnings: ['#0288D1', '#FF6B00', '#152238'],
        signs: ['HOTEL GRAGE', 'BANK CIREBON', 'GRAHA SILIWANGI', 'MEGA MENDUNG PLAZA']
      },
      mall: {
        walls: ['#DCE6E8', '#ECEFF1', '#CFD8DC'],
        roofs: ['#243B53', '#37474F'],
        awnings: ['#FFB703', '#0288D1', '#FF6B00'],
        signs: ['GRAGE CITY MALL', 'CSB MALL', 'CIREBON SUPERMALL', 'MALL BATIK PLAZA']
      }
    };

    const curPal = palettes[segType];

    // 1. Tambahkan Bangunan di Sisi Kiri & Kanan (Toko & Ruko Cirebon)
    ['left', 'right'].forEach((side) => {
      const wallColor = curPal.walls[Math.floor(Math.random() * curPal.walls.length)];
      const roofColor = curPal.roofs[Math.floor(Math.random() * curPal.roofs.length)];
      const awningColor = curPal.awnings[Math.floor(Math.random() * curPal.awnings.length)];
      const signText = curPal.signs[Math.floor(Math.random() * curPal.signs.length)];
      const buildingSize = segType === 'urban'
        ? { width: 170, height: 250 + Math.random() * 55, floors: 5 }
        : segType === 'mall'
          ? { width: 230, height: 205 + Math.random() * 35, floors: 3 }
          : { width: 140, height: 150 + Math.random() * 70, floors: 2 };

      this.buildings.push(new Building({
        side,
        z: spawnZ,
        width: buildingSize.width,
        height: buildingSize.height,
        floors: buildingSize.floors,
        wallColor,
        roofColor,
        awningColor,
        signText,
        segmentType: segType
      }));
    });

    // 2. Tambahkan Props Trotoar (Lampu Lentera, Pohon, Pot, Tiang Listrik, Rambu)
    ['left', 'right'].forEach((side) => {
      const propTypes = ['lantern', 'tree', 'pot', 'pole', 'sign'];
      const type = propTypes[Math.floor(Math.random() * propTypes.length)];
      this.props.push(new RoadsideProp({
        type,
        side,
        z: spawnZ + 30
      }));
    });

    // 3. Tambahkan Kendaraan Parkir Dekoratif (Angkot, Becak, atau Motor)
    if (Math.random() < 0.45) {
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const vehTypes = ['angkot', 'becak', 'motor'];
      const type = vehTypes[Math.floor(Math.random() * vehTypes.length)];
      this.vehicles.push(new DecorativeVehicle({
        type,
        side,
        z: spawnZ + 60
      }));
    }

    // 4. Tambahkan NPC Warga Santai di Trotoar
    if (Math.random() < 0.55) {
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const shirtColors = ['#FFB703', '#FF6B00', '#2E7D32', '#FFF8E7', '#0288D1'];
      this.npcs.push(new RoadsideNPC({
        side,
        z: spawnZ + 80,
        shirtColor: shirtColors[Math.floor(Math.random() * shirtColors.length)],
        hasIket: Math.random() < 0.6
      }));
    }

    // CATATAN: TIDAK MENAMBAHKAN GAPURA TAMBAHAN DISINI.
    // GAPURA HANYA 1 BUAH SEPANJANG SESI GAMEPLAY.
  }

  /**
   * Update seluruh elemen lingkungan dan daur ulang objek yang lewat
   */
  update(dt, speed) {
    // 1. Update Bangunan
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      b.update(dt, speed);
      if (b.z < -90) this.buildings.splice(i, 1);
    }

    // 2. Update Props
    for (let i = this.props.length - 1; i >= 0; i--) {
      const p = this.props[i];
      p.update(dt, speed);
      if (p.z < -80) this.props.splice(i, 1);
    }

    // 3. Update Kendaraan Dekoratif
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      v.update(dt, speed);
      if (v.z < -80) this.vehicles.splice(i, 1);
    }

    // 4. Update NPC
    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const n = this.npcs[i];
      n.update(dt, speed);
      if (n.z < -80) this.npcs.splice(i, 1);
    }

    // 5. Update Landmark Gapura Utama (Dihapus jika sudah lewat dan TIDAK PERNAH DI-RESPAWN)
    for (let i = this.landmarks.length - 1; i >= 0; i--) {
      const l = this.landmarks[i];
      l.update(dt, speed);
      if (l.z < -100) {
        this.landmarks.splice(i, 1);
      }
    }

    // 6. Prosedural Generator: Tambahkan irisan baru di kejauhan secara seamless
    this.nextSpawnZ -= speed * dt;
    while (this.nextSpawnZ < 980) {
      this.generateEnvironmentSlice(this.nextSpawnZ + 120);
      this.nextSpawnZ += 150;
    }
  }

  /**
   * Render Parallax Skyline Jauh (Gunung Ciremai, Mega Mendung & Siluet Kota)
   */
  renderSkyline(ctx, width, height, vanishingY, speed, distance) {
    // Parallax Factor
    const farOffset = (distance * 0.12) % width;
    const midOffset = (distance * 0.35) % width;

    // 1. Siluet Gunung Ciremai Biru Lembut di Kejauhan
    ctx.fillStyle = 'rgba(32, 51, 84, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, vanishingY);
    ctx.lineTo(width * 0.2, vanishingY - 60);
    ctx.lineTo(width * 0.35, vanishingY - 110); // Puncak Ciremai
    ctx.lineTo(width * 0.55, vanishingY - 45);
    ctx.lineTo(width * 0.75, vanishingY - 80);
    ctx.lineTo(width, vanishingY - 30);
    ctx.lineTo(width, vanishingY);
    ctx.closePath();
    ctx.fill();

    // 2. Lapisan Awan Mega Mendung Bergerak (Parallax Kecepatan Lambat)
    ctx.fillStyle = 'rgba(21, 34, 56, 0.38)';
    for (let i = -1; i < 4; i++) {
      const cx = (i * 320 - farOffset) % (width + 320);
      this.drawStylizedMegaMendung(ctx, cx, vanishingY * 0.42, 100);
    }

    // 3. Siluet Menara Masjid Agung Sang Cipta Rasa & Atap Keraton di Horizon
    ctx.fillStyle = '#1B283E';
    for (let i = -1; i < 3; i++) {
      const hx = (i * width * 0.65 - midOffset) % (width + 300);
      // Atap Limasan & Menara Cirebon
      ctx.beginPath();
      ctx.moveTo(hx, vanishingY);
      ctx.lineTo(hx + 30, vanishingY - 25);
      ctx.lineTo(hx + 60, vanishingY - 48); // Menara
      ctx.lineTo(hx + 90, vanishingY - 25);
      ctx.lineTo(hx + 140, vanishingY);
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * Gambar Awan Mega Mendung Tradisional Halus
   */
  drawStylizedMegaMendung(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.24, 0, Math.PI * 2);
    ctx.arc(x + size * 0.32, y - size * 0.12, size * 0.32, 0, Math.PI * 2);
    ctx.arc(x + size * 0.68, y, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Render Seluruh Objek Lingkungan yang Berada di Luar Jalur Lari
   * Diurutkan dari Z terbesar (paling jauh) ke Z terkecil (paling dekat)
   */
  renderEnvironmentObjects(ctx) {
    // Gabungkan seluruh objek ke dalam satu array terurut Z
    const allObjects = [
      ...this.buildings,
      ...this.props,
      ...this.vehicles,
      ...this.npcs,
      ...this.landmarks
    ].sort((a, b) => b.z - a.z);

    for (const obj of allObjects) {
      if (obj && typeof obj.render === 'function') {
        try {
          obj.render(ctx, this.game);
        } catch (err) {
          // Abaikan kesalahan render objek terisolasi agar game loop tetap mulus
        }
      }
    }
  }
}
