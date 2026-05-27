<template>
  <i 
    class="fas"
    :class="iconClass"
  ></i>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status: string
}

const props = defineProps<Props>()

const iconClass = computed(() => {
  switch (props.status) {
    case 'completed': return 'fa-check-circle text-green-500'
    case 'processing': return 'fa-circle-notch fa-spin text-blue-500'
    case 'retrying': return 'fa-redo fa-spin text-yellow-500'
    case 'failed': return 'fa-times-circle text-red-500'
    default: return 'fa-clock text-gray-400'
  }
})
</script>
