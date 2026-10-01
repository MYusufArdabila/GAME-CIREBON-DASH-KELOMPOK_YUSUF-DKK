# PANDUAN STRUKTUR ASSET — CIREBON DASH

Direktori ini dipersiapkan untuk menyimpan seluruh aset visual dan audio game **Cirebon Dash**.

Pada **Tahap 1 (Main Menu & UI)**, seluruh elemen visual (Background, Awan Mega Mendung, Arsitektur Keraton Cirebon, Jalan Runner, Karakter, dan Efek Suara) diimplementasikan secara mandiri menggunakan **Inline SVG, CSS Shapes, dan Web Audio API**. Hal ini memastikan game dapat langsung dibuka dan dimainkan secara offline/lokal tanpa CORS error.

Pada **Tahap 2 (Implementasi Gameplay)**, folder-folder berikut dapat diisi dengan file asli:

### 1. `characters/`

- Format: PNG / WebP (Spritesheet animasi berlari, melompat, meluncur).
- Karakter:
  - `runner-ridd.png` (RIDD — Pelari utama berikat kepala batik Mega Mendung)
  - `runner-bill.png` (BILL — Pelari pesisir pantura)
  - `runner-pisz.png` (PISZ — Sprinter kilat)
  - `runner-farr.png` (FARR — Pendekar pelindung keraton)

### 2. `environment/`

- Objek lingkungan rute jalan Cirebon:
  - `road-texture.png` (Tekstur aspal & trotoar batu bata)
  - `candi-bentar.png` (Gapura Keraton Kasepuhan Cirebon)
  - `obstacle-becak.png` (Rintangan Becak Cirebon)
  - `obstacle-gerobak.png` (Rintangan Gerobak Tahu Gejrot)
  - `lampu-keraton.png` (Lentera jalan klasik)

### 3. `images/`

- `logo-cirebon-dash.png` (Render resolusi tinggi logo utama)
- `bg-sky.png` (Langit gradasi Cirebon)
- `megamendung-pattern.svg` (Pola batik Mega Mendung)

### 4. `icons/`

- `coin.png` (Sprite koin emas kasepuhan)
- `trophy.png` (Ikon skor tertinggi)
- `settings.png`, `play.png`, `heart.png`

### 5. `sounds/`

- `bgm-cirebon.mp3` (Musik latar gamelan kontemporer khas Cirebon)
- `sfx-jump.wav` (Efek suara melompat)
- `sfx-coin.wav` (Efek suara mengambil koin)
- `sfx-crash.wav` (Efek suara menabrak rintangan)
