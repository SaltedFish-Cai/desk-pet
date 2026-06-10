import { Container, Sprite, BaseTexture, Texture, Text, Rectangle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { PetAnimationState } from "@/composables/usePetState";
import { getCurrentWindow } from "@tauri-apps/api/window";
import pet1Sprite from "@/assets/pet1.png";
import pet2Sprite from "@/assets/pet2.png";
import pet3Sprite from "@/assets/pet3.png";
import pet4Sprite from "@/assets/pet4.png";
import { FRAMES_PET1 } from "./frames_pet1";
import { FRAMES_PET2 } from "./frames_pet2";
import { FRAMES_PET3 } from "./frames_pet3";
import { FRAMES_PET4 } from "./frames_pet4";

interface FrameData {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MS_PER_FRAME = 66; // ~15 FPS

interface SheetConfig {
  key: string;
  src: string;
  frames: FrameData[];
}

const SHEETS: SheetConfig[] = [
  { key: "pet1", src: pet1Sprite, frames: FRAMES_PET1 },
  { key: "pet2", src: pet2Sprite, frames: FRAMES_PET2 },
  { key: "pet3", src: pet3Sprite, frames: FRAMES_PET3 },
  { key: "pet4", src: pet4Sprite, frames: FRAMES_PET4 },
];

// Largest frame dimensions across all sprite sheets
const BUF_W = Math.max(...SHEETS.flatMap((s) => s.frames.map((f) => f.w)));
const BUF_H = Math.max(...SHEETS.flatMap((s) => s.frames.map((f) => f.h)));

export class Pet extends Container {
  private sprite: Sprite;
  private label: Text;
  private _currentAnim: PetAnimationState = "idle";
  private animTimer = 0;
  private frameTimer = 0;
  private frameIndex = 0;
  private ready = false;
  private pendingScale = 0;

  // Multi-sheet support
  private sheetImages = new Map<string, HTMLImageElement>();
  private currentFrames: FrameData[] = FRAMES_PET1;
  private currentSheetImg: HTMLImageElement | null = null;
  private contentHeight = 0;

  // One-shot animation state
  private playingOneShot = false;

  // Single-frame buffer (canvas → BaseTexture, updated per frame)
  private bufferCanvas: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  private bufferBaseTex!: BaseTexture;

  constructor(name: string) {
    super();

    // Shared frame buffer (sized for the largest frame across all sheets)
    this.bufferCanvas = document.createElement("canvas");
    this.bufferCanvas.width = BUF_W;
    this.bufferCanvas.height = BUF_H;
    this.bufferCtx = this.bufferCanvas.getContext("2d")!;

    // Placeholder; real texture created once the default sheet loads
    this.sprite = new Sprite(Texture.WHITE);
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);

    // --- Label ---
    this.label = new Text(name, {
      fontSize: 12,
      fill: 0x888888,
      fontFamily: "sans-serif",
    });
    this.label.anchor.set(0.5, 0);
    this.addChild(this.label);

    // --- Window drag + animation trigger ---
    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new Rectangle(-100, -100, 200, 200);
    this.on("pointerdown", this.onPointerDown);

    // --- Load all sprite sheets ---
    for (const sheet of SHEETS) {
      const img = new Image();
      img.onload = () => this.onSheetLoaded(sheet.key, img, sheet.frames);
      img.onerror = () => console.error(`[Pet] failed to load sheet: ${sheet.key}`);
      img.src = sheet.src;
    }
  }

  private onSheetLoaded(key: string, img: HTMLImageElement, frames: FrameData[]): void {
    this.sheetImages.set(key, img);

    if (key === "pet1") {
      // Initialize rendering with the first sheet
      this.currentSheetImg = img;
      this.currentFrames = frames;
      this.contentHeight = Math.max(...frames.map((f) => f.h));
      this.bufferBaseTex = BaseTexture.from(this.bufferCanvas);
      this.sprite.texture = new Texture(this.bufferBaseTex);
      this.drawFrame(0);
      this.ready = true;
      if (this.pendingScale > 0) {
        this.applyScale(this.pendingScale);
        this.pendingScale = 0;
      }
    }
  }

  private drawFrame(index: number): void {
    const img = this.currentSheetImg;
    if (!img) return;
    const f = this.currentFrames[index];
    if (!f) return;
    this.bufferCtx.clearRect(0, 0, BUF_W, BUF_H);
    // Center frame content within the buffer so anchor(0.5) keeps it visually centered
    const ox = (BUF_W - f.w) / 2;
    const oy = (BUF_H - f.h) / 2;
    this.bufferCtx.drawImage(img, f.x, f.y, f.w, f.h, ox, oy, f.w, f.h);
    this.bufferBaseTex.update();
  }

  /** Scale only the sprite, keeping the label at readable size */
  setSpriteScale(scale: number): void {
    if (!this.ready) {
      this.pendingScale = scale;
      return;
    }
    this.applyScale(scale);
  }

  private applyScale(scale: number): void {
    this.sprite.scale.set(scale);
    this.label.y = this.contentHeight * scale + 6;
    this.label.scale.set(1);
  }

  set animationState(state: PetAnimationState) {
    this._currentAnim = state;
    this.animTimer = 0;
  }

  get animationState(): PetAnimationState {
    return this._currentAnim;
  }

  update(dt: number): void {
    // Advance animation frame
    if (this.ready && this.currentSheetImg) {
      this.frameTimer += dt;
      let frameChanged = false;

      if (this.playingOneShot) {
        // Play through once, stop at the last frame
        while (this.frameTimer >= MS_PER_FRAME && this.frameIndex < this.currentFrames.length) {
          this.frameTimer -= MS_PER_FRAME;
          this.frameIndex++;
          frameChanged = true;
        }
        if (this.frameIndex >= this.currentFrames.length) {
          // Animation complete — revert to looping animation on pet1
          this.playingOneShot = false;
          this.switchSheet("pet1");
          this.frameIndex = 0;
          this.frameTimer = 0;
          frameChanged = true;
        }
      } else {
        // Normal looping animation
        while (this.frameTimer >= MS_PER_FRAME) {
          this.frameTimer -= MS_PER_FRAME;
          this.frameIndex = (this.frameIndex + 1) % this.currentFrames.length;
          frameChanged = true;
        }
      }

      if (frameChanged) {
        this.drawFrame(this.frameIndex);
      }
    }

    // State-based positional effects (idle / sleep / walk)
    this.animTimer += dt;

    switch (this._currentAnim) {
      case "idle":
        this.updateIdle(dt);
        break;
      case "sleep":
        this.updateSleep(dt);
        break;
      case "walk":
        this.updateWalk(dt);
        break;
      default:
        break;
    }
  }

  /** Switch the active sprite sheet by key ("default" | "pet1" | "pet2" | "pet3" | "pet4") */
  private switchSheet(key: string): void {
    const img = this.sheetImages.get(key);
    if (!img) return;
    this.currentSheetImg = img;
    this.currentFrames = this.getFramesForKey(key);
    this.contentHeight = Math.max(...this.currentFrames.map((f) => f.h));
  }

  private getFramesForKey(key: string): FrameData[] {
    switch (key) {
      case "pet1": return FRAMES_PET1;
      case "pet2": return FRAMES_PET2;
      case "pet3": return FRAMES_PET3;
      case "pet4": return FRAMES_PET4;
      default: return FRAMES_PET1;
    }
  }

  /** Randomly pick one of the four pet animations and play it once */
  private playRandomPet(): void {
    const petKeys = ["pet1", "pet2", "pet3", "pet4"];
    const pick = petKeys[Math.floor(Math.random() * petKeys.length)];
    const img = this.sheetImages.get(pick);
    if (!img) return; // sheet not yet loaded

    this.playingOneShot = true;
    this.switchSheet(pick);
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  // ---- Pointer events ----

  private onPointerDown(_e: FederatedPointerEvent): void {
    this.playRandomPet();
    getCurrentWindow().startDragging().catch(console.error);
  }

  // ---- Animation states ----

  private updateIdle(_dt: number): void {
    this.sprite.y = 0;
  }

  private updateSleep(_dt: number): void {
    this.sprite.y = 2;
  }

  private updateWalk(_dt: number): void {
    const wobble = Math.sin(this.animTimer * 0.005) * 1.5;
    this.rotation = wobble * 0.05;
  }
}
