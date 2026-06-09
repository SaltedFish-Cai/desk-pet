import { Application, Assets } from "pixi.js";
import { Pet } from "./pet";
import petImage from "@/assets/pet.png";

export async function createRenderer(canvas: HTMLCanvasElement): Promise<{
  app: Application;
  pet: Pet;
}> {
  const app = new Application({
    view: canvas,
    width: canvas.clientWidth || window.innerWidth,
    height: canvas.clientHeight || window.innerHeight,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const texture = await Assets.load(petImage);
  const pet = new Pet(texture, "小宠");
  pet.setSpriteScale(0.12);
  pet.x = app.screen.width / 2;
  pet.y = app.screen.height / 2;
  app.stage.addChild(pet);

  app.ticker.add(() => {
    pet.update(app.ticker.deltaMS);
  });

  return { app, pet };
}

export function destroyRenderer(app: Application): void {
  app.destroy(true, { children: true });
}
