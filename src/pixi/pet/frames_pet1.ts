export const FRAMES_PET1 = (() => {
  const frames: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < 141; i++) {
    frames.push({ x: 0, y: i * 320, w: 240, h: 320 });
  }
  return frames;
})();
