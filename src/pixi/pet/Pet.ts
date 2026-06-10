import { Container, Sprite, Texture, Text, Rectangle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { PetAnimationState } from "@/composables/usePetState";
import { getCurrentWindow } from "@tauri-apps/api/window";
import pet1Sprite from "@/assets/pet1.png";
import pet2Sprite from "@/assets/pet2.png";
import pet3Sprite from "@/assets/pet3.png";
import pet4Sprite from "@/assets/pet4.png";
import pet5Sprite from "@/assets/pet5.png";
import { FRAMES_PET1 } from "./frames_pet1";
import { FRAMES_PET2 } from "./frames_pet2";
import { FRAMES_PET3 } from "./frames_pet3";
import { FRAMES_PET4 } from "./frames_pet4";
import { FRAMES_PET5 } from "./frames_pet5";

interface FrameData {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MS_PER_FRAME = 22; // ~45 FPS

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
  { key: "pet5", src: pet5Sprite, frames: FRAMES_PET5 },
];

export class Pet extends Container {
  private sprite: Sprite;
  private label: Text;
  private _currentAnim: PetAnimationState = "idle";
  private animTimer = 0;
  private frameTimer = 0;
  private frameIndex = 0;
  private ready = false;
  private pendingScale = 0;

  // Multi-sheet support: pre-cropped PIXI textures
  private preparedTextures = new Map<string, Texture[]>();
  private currentTextures: Texture[] = [];
  private currentFrames: FrameData[] = FRAMES_PET1;
  private contentHeight = 0;

  // One-shot animation state
  private playingOneShot = false;
  private petCycleIndex = 0;

  constructor(name: string) {
    super();

    // Placeholder; real texture assigned once the default sheet loads
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
    // Extract each frame into its own small canvas → PIXI Texture.
    // This avoids uploading the full (very tall) sprite sheet to the GPU,
    // which would exceed WebGL max texture size on most hardware.
    const textures = frames.map((f) => {
      const c = document.createElement("canvas");
      c.width = f.w;
      c.height = f.h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      return Texture.from(c);
    });
    this.preparedTextures.set(key, textures);

    if (key === "pet1") {
      // Initialize rendering with the first sheet
      this.currentTextures = textures;
      this.currentFrames = frames;
      this.contentHeight = Math.max(...frames.map((f) => f.h));
      this.sprite.texture = textures[0];
      this.ready = true;
      if (this.pendingScale > 0) {
        this.applyScale(this.pendingScale);
        this.pendingScale = 0;
      }
    }
  }

  private drawFrame(index: number): void {
    const tex = this.currentTextures[index];
    if (tex) this.sprite.texture = tex;
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
    if (this.ready) {
      this.frameTimer += dt;
      let frameChanged = false;

      if (this.playingOneShot) {
        // Play through once, stop at the last frame
        while (this.frameTimer >= MS_PER_FRAME && this.frameIndex < this.currentTextures.length) {
          this.frameTimer -= MS_PER_FRAME;
          this.frameIndex++;
          frameChanged = true;
        }
        if (this.frameIndex >= this.currentTextures.length) {
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
          this.frameIndex = (this.frameIndex + 1) % this.currentTextures.length;
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

  /** Switch the active sprite sheet by key ("pet1" | "pet2" | "pet3" | "pet4" | "pet5") */
  private switchSheet(key: string): void {
    const texArr = this.preparedTextures.get(key);
    if (!texArr) return;
    this.currentTextures = texArr;
    this.currentFrames = this.getFramesForKey(key);
    this.contentHeight = Math.max(...this.currentFrames.map((f) => f.h));
  }

  private getFramesForKey(key: string): FrameData[] {
    switch (key) {
      case "pet1": return FRAMES_PET1;
      case "pet2": return FRAMES_PET2;
      case "pet3": return FRAMES_PET3;
      case "pet4": return FRAMES_PET4;
      case "pet5": return FRAMES_PET5;
      default: return FRAMES_PET1;
    }
  }

  /** Pick the next pet animation in sequence (1→2→3→4→5→1) and play it once */
  private playNextPet(): void {
    const petKeys = ["pet1", "pet2", "pet3", "pet4", "pet5"];
    const pick = petKeys[this.petCycleIndex];
    const texArr = this.preparedTextures.get(pick);
    if (!texArr) return; // sheet not yet loaded

    this.petCycleIndex = (this.petCycleIndex + 1) % petKeys.length;

    this.playingOneShot = true;
    this.switchSheet(pick);
    this.frameIndex = 0;
    this.frameTimer = 0;
  }

  // ---- Pointer events ----

  private onPointerDown(_e: FederatedPointerEvent): void {
    this.playNextPet();
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
