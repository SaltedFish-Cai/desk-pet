import { reactive } from "vue";

export type PetAnimationState = "idle" | "walk" | "sleep" | "interact" | "drag";

export interface PetState {
  name: string;
  animationState: PetAnimationState;
  x: number;
  y: number;
  energy: number;
  mood: number;
}

const state = reactive<PetState>({
  name: "",
  animationState: "idle",
  x: 150,
  y: 300,
  energy: 100,
  mood: 100,
});

export function usePetState() {
  function setAnimationState(newState: PetAnimationState) {
    state.animationState = newState;
  }

  function setPosition(x: number, y: number) {
    state.x = x;
    state.y = y;
  }

  return { state, setAnimationState, setPosition };
}
