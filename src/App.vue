<script setup lang="ts">
import { onMounted } from "vue";
import { enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { getCurrentWindow } from "@tauri-apps/api/window";
import PetCanvas from "./components/PetCanvas.vue";
import { usePetState } from "./composables/usePetState";

const { state } = usePetState();

onMounted(async () => {
  // Set transparent background on the webview (macOS)
  try {
    getCurrentWindow().setBackgroundColor({ red: 0, green: 0, blue: 0, alpha: 0 });
  } catch (e) {
    console.warn("setBackgroundColor not supported", e);
  }

  const already = await isEnabled();
  if (!already) {
    await enable();
  }
});
</script>

<template>
  <PetCanvas />
  <div class="ui-overlay">
    <span class="pet-name">{{ state.name }}</span>
  </div>
</template>

<style scoped>
.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
}

.pet-name {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #888;
  white-space: nowrap;
}
</style>
