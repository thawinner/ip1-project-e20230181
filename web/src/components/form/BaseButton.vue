<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'outline' | 'danger' | 'success'
    type?: 'button' | 'submit'
    loading?: boolean
    loadingText?: string
    small?: boolean
    disabled?: boolean
  }>(),
  { variant: 'outline', type: 'button', loading: false, loadingText: undefined, small: false, disabled: false },
)
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn-${variant}`, { 'btn-sm': small }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <template v-if="loading && loadingText">{{ loadingText }}</template>
    <slot v-else />
  </button>
</template>
