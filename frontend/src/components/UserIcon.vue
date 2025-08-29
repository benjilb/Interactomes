<!-- components/UserIcon.vue -->
<script setup lang="ts">
import { ref, defineExpose, computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { useMotions } from '@vueuse/motion'

export interface UserIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

interface Props extends /* @vue-ignore */ HTMLAttributes {
  size?: number
  class?: string
}

const props = withDefaults(defineProps<Props>(), { size: 28 })

// Refs pour piloter les 2 éléments animés (cercle + path)
const circleEl = ref<SVGCircleElement | null>(null)
const pathEl   = ref<SVGPathElement   | null>(null)

// Accès aux instances de motion
const motions = useMotions()

// Variantes (on simule pathLength/pathOffset via dasharray/dashoffset)
const pathVariants = {
  normal:   { strokeDashoffset: 100, opacity: 1 },
  animate:  { strokeDashoffset: 0,   opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
}

const circleVariants = {
  normal:  { strokeDashoffset: 100, scale: 1 },
  animate: { strokeDashoffset: 0,   scale: 1, transition: { duration: 0.4 } },
}

// strokeDasharray constant grâce à pathLength="100"
const dashArray = 100

// API publique (équivalent forwardRef)
defineExpose<UserIconHandle>({
  startAnimation() {
    motions.get(circleEl.value!)?.apply('animate')
    motions.get(pathEl.value!)?.apply('animate')
  },
  stopAnimation() {
    motions.get(circleEl.value!)?.apply('normal')
    motions.get(pathEl.value!)?.apply('normal')
  },
})

const sizeAttr = computed(() => props.size ?? 28)
</script>

<template>
  <div
      :class="props.class"
      class="usericon-wrapper"
  >
    <svg
        xmlns="http://www.w3.org/2000/svg"
        :width="sizeAttr"
        :height="sizeAttr"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
      <!-- Cercle (tête) : animé avec v-motion, variantes + hover -->
      <circle
          ref="circleEl"
          v-motion
          :variants="circleVariants"
          initial="normal"
          :hovered="'animate'"
          cx="12"
          cy="8"
          r="5"
          pathLength="100"
          :style="{ strokeDasharray: dashArray }"
      />

      <!-- Path (épaules) : animé avec v-motion, variantes + hover -->
      <path
          ref="pathEl"
          v-motion
          :variants="pathVariants"
          initial="normal"
          :hovered="'animate'"
          d="M20 21a8 8 0 0 0-16 0"
          pathLength="100"
          :style="{ strokeDasharray: dashArray }"
      />
    </svg>
  </div>
</template>

<style scoped>
.usericon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
