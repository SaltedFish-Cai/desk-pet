export const FRAMES_PET3 = (() => {
  const frames: { x: number; y: number; w: number; h: number }[] = [];
  for (let i = 0; i < 163; i++) {
    frames.push({ x: 0, y: i * 320, w: 240, h: 320 });
  }
  return frames;
})();
