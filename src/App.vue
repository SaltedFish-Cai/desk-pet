<script setup lang="ts">
import PetCanvas from "./components/PetCanvas.vue";
import { usePetState } from "./composables/usePetState";

const { state } = usePetState();
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
