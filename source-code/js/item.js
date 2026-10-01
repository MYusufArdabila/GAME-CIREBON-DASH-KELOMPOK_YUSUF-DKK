/**
 * CIREBON DASH gameplay power-up pickups.
 */
class PowerUpPickup {
  constructor(type, lane, z) {
    this.type = type;
    this.lane = lane;
    this.z = z;
    this.y = 38;
    this.phase = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  update(dt, speed) {
    this.z -= speed * dt;
    this.phase += dt * 4;
  }

  render(ctx, game) {
    if (this.collected) return;
    const pos = game.project(this.lane, this.z, this.y + Math.sin(this.phase) * 4);
    if (!pos) return;

    const scale = pos.scale;
    const radius = Math.max(7, 19 * scale);
    const color = this.type === 'magnet' ? '#38BDF8' : '#F97316';

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(4, 16 * scale);
    ctx.fillStyle = 'rgba(11, 19, 37, 0.94)';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, 2.5 * scale);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.type === 'magnet' ? '#7DD3FC' : '#FDBA74';
    ctx.beginPath();
    if (this.type === 'magnet') {
      ctx.moveTo(-radius * 0.42, -radius * 0.42);
      ctx.lineTo(-radius * 0.42, radius * 0.12);
      ctx.quadraticCurveTo(-radius * 0.42, radius * 0.55, 0, radius * 0.55);
      ctx.quadraticCurveTo(radius * 0.42, radius * 0.55, radius * 0.42, radius * 0.12);
      ctx.lineTo(radius * 0.42, -radius * 0.42);
      ctx.stroke();

      ctx.strokeStyle = '#FFF8E7';
      ctx.lineWidth = Math.max(1.5, 2.5 * scale);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.42, -radius * 0.2);
      ctx.lineTo(-radius * 0.42, -radius * 0.42);
      ctx.moveTo(radius * 0.42, -radius * 0.2);
      ctx.lineTo(radius * 0.42, -radius * 0.42);
      ctx.stroke();
    } else {
      ctx.moveTo(-radius * 0.48, radius * 0.15);
      ctx.lineTo(-radius * 0.22, radius * 0.06);
      ctx.lineTo(-radius * 0.04, -radius * 0.35);
      ctx.lineTo(radius * 0.12, -radius * 0.35);
      ctx.lineTo(radius * 0.22, -radius * 0.02);
      ctx.lineTo(radius * 0.5, radius * 0.13);
      ctx.lineTo(radius * 0.46, radius * 0.35);
      ctx.lineTo(-radius * 0.38, radius * 0.35);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-radius * 0.28, radius * 0.16);
      ctx.lineTo(radius * 0.2, radius * 0.16);
      ctx.moveTo(-radius * 0.05, -radius * 0.15);
      ctx.lineTo(radius * 0.17, -radius * 0.15);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class PowerUpManager {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.spawnTimer = 7;
    this.nextType = 'magnet';
  }

  reset() {
    this.items = [];
    this.spawnTimer = 7;
    this.nextType = 'magnet';
  }

  update(dt, speed) {
    for (let index = this.items.length - 1; index >= 0; index--) {
      const item = this.items[index];
      item.update(dt, speed);
      if (item.collected || item.z < -40) this.items.splice(index, 1);
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = 18;
    }
  }

  spawn() {
    const lane = Math.floor(Math.random() * 3);
    this.items.push(new PowerUpPickup(this.nextType, lane, 980));
    this.nextType = this.nextType === 'magnet' ? 'boots' : 'magnet';
  }

  collectNearby() {
    const player = this.game.player;
    for (const item of this.items) {
      if (item.collected) continue;

      const depthDistance = Math.abs(player.z - item.z);
      const laneDistance = Math.abs(player.currentLaneX - item.lane);
      if (depthDistance >= 34 || laneDistance >= 0.65) continue;

      item.collected = true;
      if (item.type === 'magnet') {
        player.activateMagnet(30);
      } else {
        player.activateHighJump(40);
      }

      if (typeof SoundSystem !== 'undefined') SoundSystem.playCoin();
      if (typeof UI !== 'undefined') {
        UI.showToast(item.type === 'magnet' ? 'MAGNET AKTIF · 30 DETIK' : 'SEPATU LOMPAT AKTIF · 40 DETIK');
      }
    }
  }

  render(ctx) {
    for (const item of this.items) item.render(ctx, this.game);
  }
}