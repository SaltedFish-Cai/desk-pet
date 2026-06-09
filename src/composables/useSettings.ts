import { ref } from "vue";

export interface Settings {
  autoWalk: boolean;
  sleepEnabled: boolean;
  volume: number;
}

const settings = ref<Settings>({
  autoWalk: true,
  sleepEnabled: true,
  volume: 0.5,
});

export function useSettings() {
  function updateSettings(partial: Partial<Settings>) {
    Object.assign(settings.value, partial);
  }

  return { settings, updateSettings };
}
