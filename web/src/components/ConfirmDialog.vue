<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'
import BaseButton from './form/BaseButton.vue'

withDefaults(
  defineProps<{ open: boolean; title: string; text: string; okLabel: string; danger?: boolean; busy?: boolean }>(),
  { danger: false, busy: false },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <BaseDialog :open="open" :title="title" size="sm" @close="emit('cancel')">
    <div class="dialog-body">
      <p>{{ text }}</p>
    </div>
    <footer class="dialog-foot">
      <BaseButton :variant="danger ? 'danger' : 'primary'" :loading="busy" @click="emit('confirm')">
        {{ okLabel }}
      </BaseButton>
      <BaseButton @click="emit('cancel')">Cancel</BaseButton>
    </footer>
  </BaseDialog>
</template>

<style scoped>
p {
  margin: 0;
}
</style>
