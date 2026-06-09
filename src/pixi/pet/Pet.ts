import { Container, Sprite, Texture, Text } from "pixi.js";
import type { PetAnimationState } from "@/composables/usePetState";

export class Pet extends Container {
  private sprite: Sprite;
  private label: Text;
  private _currentAnim: PetAnimationState = "idle";
  private animTimer = 0;

  constructor(texture: Texture, name: string) {
    super();

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);

    this.label = new Text(name, {
      fontSize: 12,
      fill: 0x888888,
      fontFamily: "sans-serif",
    });
    this.label.anchor.set(0.5, 0);
    this.addChild(this.label);

    this.eventMode = "static";
    this.cursor = "pointer";
  }

  /** Scale only the sprite, keeping the label at readable size */
  setSpriteScale(scale: number): void {
    this.sprite.scale.set(scale);
    this.label.y = this.sprite.height * scale / 2 + 6;
    this.label.scale.set(1 / scale);
  }

  set animationState(state: PetAnimationState) {
    this._currentAnim = state;
    this.animTimer = 0;
  }

  get animationState(): PetAnimationState {
    return this._currentAnim;
  }

  update(dt: number): void {
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

  private updateIdle(_dt: number): void {
    const bounce = Math.sin(this.animTimer * 0.003) * 2;
    this.sprite.y = bounce;
  }

  private updateSleep(_dt: number): void {
    this.sprite.y = 2;
  }

  private updateWalk(_dt: number): void {
    const wobble = Math.sin(this.animTimer * 0.005) * 1.5;
    this.rotation = wobble * 0.05;
  }
}
