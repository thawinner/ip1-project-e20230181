<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import FormField from '@/components/form/FormField.vue'
import BaseButton from '@/components/form/BaseButton.vue'

const props = withDefaults(defineProps<{ open: boolean; busy: boolean; serverError?: string | null; count?: number }>(), {
  serverError: null,
  count: 1,
})
const emit = defineEmits<{ confirm: [reason: string]; cancel: [] }>()

const reason = ref('')
const error = ref<string | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    reason.value = ''
    error.value = null
  },
)

function confirm() {
  error.value = reason.value.trim() ? null : 'Please give a reason for rejecting'
  if (!error.value) emit('confirm', reason.value.trim())
}
</script>

<template>
  <BaseDialog :open="open" :title="count > 1 ? `Reject ${count} write-offs` : 'Reject write-off'" size="sm" @close="emit('cancel')">
    <form novalidate @submit.prevent="confirm">
      <div class="dialog-body">
        <p class="muted">The stock does not change. The storekeeper sees your reason.</p>
        <FormField id="reject-reason" v-model="reason" label="Reason" multiline :error="error ?? serverError" />
      </div>
      <footer class="dialog-foot">
        <BaseButton type="submit" variant="danger" :loading="busy" loading-text="Rejecting…">Reject</BaseButton>
        <BaseButton @click="emit('cancel')">Cancel</BaseButton>
      </footer>
    </form>
  </BaseDialog>
</template>

<style scoped>
p {
  margin: 0;
}
</style>
