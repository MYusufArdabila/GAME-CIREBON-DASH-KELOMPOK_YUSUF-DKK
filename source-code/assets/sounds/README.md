# STRUKTUR & PANDUAN AUDIO — CIREBON DASH

Direktori ini dipersiapkan untuk menyimpan file audio eksternal (MP3/OGG/WAV) jika ingin menggantikan atau melengkapi synthesizer internal Web Audio API (`SoundManager` di `js/game.js`).

### Format & File yang Direkomendasikan:

1. `bgm-cirebon-street.mp3`
   * Musik latar bertema gamelan kontemporer khas Cirebon dengan tempo enerjik (115–128 BPM).
   * Gunakan audio royalty-free / berlisensi bebas (misal: CC0 atau buatan sendiri).
   * **PENTING**: Jangan menggunakan musik berhak cipta (copyrighted).

2. `sfx-run-loop.wav` / `sfx-footsteps.wav`
   * Suara langkah lari berulang pelari di atas aspal.

3. `sfx-jump.wav`
   * Efek suara lentik ketika pelari melompat.

4. `sfx-coin.wav`
   * Denting frekuensi tinggi (+1 koin emas).

5. `sfx-hit.wav` / `sfx-crash.wav`
   * Suara benturan tumpul saat menabrak rintangan.

6. `sfx-whoosh.wav`
   * Efek desiran angin saat berpindah jalur ke kiri atau ke kanan.

7. `sfx-click.wav`
   * Feedback klik tombol UI antarmuka menu.

*Saat ini, seluruh efek suara di atas disintesis secara real-time via Web Audio API browser tanpa file audio eksternal sehingga tidak ada resiko error CORS saat dijalankan lokal.*
