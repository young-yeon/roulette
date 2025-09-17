import { canvasHeight, canvasWidth, DefaultBloomColor, DefaultEntityColor, initialZoom } from './data/constants';
import { Camera } from './camera';
import { StageDef } from './data/maps';
import { Marble } from './marble';
import { ParticleManager } from './particleManager';
import { GameObject } from './gameObject';
import { UIObject } from './UIObject';
import { VectorLike } from './types/VectorLike';
import { MapEntityState } from './types/MapEntity.type';

export type RenderParameters = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  winners: Marble[];
  particleManager: ParticleManager;
  effects: GameObject[];
  winnerRank: number;
  winner: Marble | null;
  size: VectorLike;
};

export class RouletteRenderer {
  // --- Chuseok background: night sky gradient, moon, hills, lanterns ---
  private renderChuseokBackground() {
    const t = this._bgTick / 60; // coarse time in seconds
    const ctx = this.ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0b1026');   // deep night indigo
    grad.addColorStop(0.6, '#121a3a');
    grad.addColorStop(1, '#1a2148');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle stars (deterministic positions)
    ctx.save();
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 120; i++) {
      const x = (i * 139) % w;
      const y = (i * 311) % (h * 0.7);
      const r = 0.5 + ((i * 17) % 7) / 7;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = i % 9 === 0 ? '#ffd27a' : '#e6eefc';
      ctx.fill();
    }
    ctx.restore();

    // Moon
    const moonX = w * 0.18;
    const moonY = h * 0.22;
    const moonR = Math.min(w, h) * 0.10;
    const g2 = ctx.createRadialGradient(moonX, moonY, moonR * 0.2, moonX, moonY, moonR);
    g2.addColorStop(0, '#fff1b3');
    g2.addColorStop(1, '#ffd86b');
    ctx.beginPath();
    ctx.fillStyle = g2;
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    // rabbit silhouette (subtle)
    ctx.save();
    ctx.translate(moonX - moonR*0.2, moonY + moonR*0.05);
    ctx.scale(moonR/60, moonR/60);
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath(); // head
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // ear 1
    ctx.ellipse(-6, -12, 4, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // ear 2
    ctx.ellipse(6, -12, 4, 10, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // body
    ctx.ellipse(14, 10, 14, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // moving haze clouds
    const cloud = (cx, cy, sx, sy, a) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.ellipse(cx, cy, sx, sy, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#cfd8ff';
      ctx.fill();
      ctx.restore();
    };
    cloud(w * (0.1 + (t*0.02)%1), h*0.28, 80, 24, 0.06);
    cloud(w * (0.6 + (t*0.018)%1), h*0.18, 120, 32, 0.05);
    cloud(w * (0.3 + (t*0.015)%1), h*0.35, 100, 28, 0.04);


    // Hills silhouettes
    const hill = (baseY, amp, stretch, offset, color) => {
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 10) {
        const y = baseY - Math.sin((x + offset) / stretch) * amp - Math.cos((x + offset) / (stretch*0.7)) * amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    hill(h * 0.80, 22, 40, 0,   '#0f1533');
    hill(h * 0.88, 28, 55, 200, '#0c112a');
    hill(h * 0.94, 18, 35, 400, '#0a0d22');

    // Lantern string
    const yLine = h * 0.12;
    ctx.save();
    ctx.strokeStyle = '#3b3f60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, yLine);
    ctx.bezierCurveTo(w * 0.25, yLine - 20, w * 0.55, yLine + 20, w * 0.95, yLine);
    ctx.stroke();

    // Lanterns
    const lanternCount = 7;
    for (let i = 0; i < lanternCount; i++) {
      const t = i / (lanternCount - 1);
      const x = w * (0.08 + 0.84 * t);
      const y = yLine + Math.sin(t * 2 + i * 0.6) * 6;
      // tassel
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 18);
      ctx.strokeStyle = '#5a5f88';
      ctx.lineWidth = 1;
      ctx.stroke();
      // lantern body
      ctx.beginPath();
      ctx.ellipse(x, y + 24, 10, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? '#ffb74d' : '#ff7f50';
      ctx.fill();
      // highlight
      ctx.beginPath();
      ctx.ellipse(x - 3, y + 22, 3, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
    }
    ctx.restore();
  }

  private _canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  public sizeFactor = 1;

  private _images: { [key: string]: HTMLImageElement } = {};

  constructor() {
  }

  get width() {
    return this._canvas.width;
  }

  get height() {
    return this._canvas.height;
  }

  get canvas() {
    return this._canvas;
  }

  async init() {
    await this._load();

    this._canvas = document.createElement('canvas');
    this._canvas.width = canvasWidth;
    this._canvas.height = canvasHeight;
    this.ctx = this._canvas.getContext('2d', {
      alpha: false,
    }) as CanvasRenderingContext2D;

    document.body.appendChild(this._canvas);

    const resizing = (entries?: ResizeObserverEntry[]) => {
      const realSize = entries
        ? entries[0].contentRect
        : this._canvas.getBoundingClientRect();
      const width = Math.max(realSize.width / 2, 640);
      const height = (width / realSize.width) * realSize.height;
      this._canvas.width = width;
      this._canvas.height = height;
      this.sizeFactor = width / realSize.width;
    };

    const resizeObserver = new ResizeObserver(resizing);

    resizeObserver.observe(this._canvas);
    resizing();
  }

  private async _loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((rs) => {
      const img = new Image();
      img.addEventListener('load', () => {
        rs(img);
      });
      img.src = url;
    });
  }

  private async _load(): Promise<void> {
    const loadPromises =
      [
        { name: '챔루', imgUrl: new URL('../assets/images/chamru.png', import.meta.url) },
        { name: '쿠빈', imgUrl: new URL('../assets/images/kubin.png', import.meta.url) },
      ].map(({ name, imgUrl }) => {
        return (async () => {
          console.dir(imgUrl);
          this._images[name] = await this._loadImage(imgUrl.toString());
        })();
      });

    await Promise.all(loadPromises);
  }

  render(renderParameters: RenderParameters, uiObjects: UIObject[]) {
    this.ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._bgTick++;
    this.renderChuseokBackground();

this.ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    // Chuseok background
    this.renderChuseokBackground();

    this.ctx.save();
    this.ctx.scale(initialZoom, initialZoom);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = '0.4pt sans-serif';
    this.ctx.lineWidth = 3 / (renderParameters.camera.zoom + initialZoom);
    renderParameters.camera.renderScene(this.ctx, () => {
      this.renderEntities(renderParameters.entities);
      this.renderEffects(renderParameters);
      this.renderMarbles(renderParameters);
    });
    this.ctx.restore();

    uiObjects.forEach((obj) =>
      obj.render(
        this.ctx,
        renderParameters,
        this._canvas.width,
        this._canvas.height,
      ),
    );
    renderParameters.particleManager.render(this.ctx);
    this.renderWinner(renderParameters);
  }

  private renderEntities(entities: MapEntityState[]) {
    this.ctx.save();
    entities.forEach((entity) => {
      this.ctx.save();
      this.ctx.translate(entity.x, entity.y);
      this.ctx.rotate(entity.angle);
      this.ctx.fillStyle = entity.shape.color ?? DefaultEntityColor[entity.shape.type];
      this.ctx.strokeStyle = entity.shape.color ?? DefaultEntityColor[entity.shape.type];
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = entity.shape.bloomColor ?? entity.shape.color ?? DefaultBloomColor[entity.shape.type];
      const shape = entity.shape;
      switch (shape.type) {
        case 'polyline':
          if (shape.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.points[0][0], shape.points[0][1]);
            for (let i = 1; i < shape.points.length; i++) {
              this.ctx.lineTo(shape.points[i][0], shape.points[i][1]);
            }
            this.ctx.stroke();
          }
          break;
        case 'box':
          const w = shape.width * 2;
          const h = shape.height * 2;
          this.ctx.rotate(shape.rotation);
          this.ctx.fillRect(-w / 2, -h / 2, w, h);
          this.ctx.strokeRect(-w / 2, -h / 2, w, h);
          break;
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, shape.radius, 0, Math.PI * 2, false);
          this.ctx.stroke();
          break;
      }

      this.ctx.restore();
    });
    this.ctx.restore();
  }

  private renderEffects({ effects, camera }: RenderParameters) {
    effects.forEach((effect) =>
      effect.render(this.ctx, camera.zoom * initialZoom),
    );
  }

  private renderMarbles({
                          marbles,
                          camera,
                          winnerRank,
                          winners,
                        }: RenderParameters) {
    const winnerIndex = winnerRank - winners.length;

    marbles.forEach((marble, i) => {
      marble.render(
        this.ctx,
        camera.zoom * initialZoom,
        i === winnerIndex,
        false,
        this._images[marble.name] || undefined,
      );
    });
  }

  private renderWinner({ winner }: RenderParameters) {
    if (!winner) return;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(
      this._canvas.width / 2,
      this._canvas.height - 168,
      this._canvas.width / 2,
      168,
    );
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(
      'Winner',
      this._canvas.width - 10,
      this._canvas.height - 120,
    );
    this.ctx.font = 'bold 72px sans-serif';
    this.ctx.fillStyle = winner.color;
    this.ctx.fillText(
      winner.name,
      this._canvas.width - 10,
      this._canvas.height - 55,
    );
    this.ctx.restore();
  }
}
