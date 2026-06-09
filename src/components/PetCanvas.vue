<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { createRenderer, destroyRenderer } from "@/pixi";

const canvasRef = ref<HTMLCanvasElement | null>(null);
let cleanup: (() => void) | null = null;

onMounted(async () => {
  if (canvasRef.value) {
    const { app } = await createRenderer(canvasRef.value);
    cleanup = () => destroyRenderer(app);
  }
});

onUnmounted(() => {
  cleanup?.();
});
</script>

<template>
  <canvas ref="canvasRef" class="pet-canvas" />
</template>

<style scoped>
.pet-canvas {
  display: block;
  width: 100%;
  height: 100vh;
}
</style>
