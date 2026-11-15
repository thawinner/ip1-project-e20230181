<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import FormField from '@/components/form/FormField.vue'
import BaseButton from '@/components/form/BaseButton.vue'
import { passwordError } from '@/utils/accountRules'

const props = defineProps<{ open: boolean; name: string; busy: boolean; serverError: string | null }>()
const emit = defineEmits<{ confirm: [password: string]; cancel: [] }>()

const password = ref('')
const error = ref<string | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    password.value = ''
    error.value = null
  },
)

function confirm() {
  error.value = passwordError(password.value)
  if (!error.value) emit('confirm', password.value)
}
</script>

<template>
  <BaseDialog :open="open" :title="`Reset password: ${name}`" @close="emit('cancel')">
    <form novalidate @submit.prevent="confirm">
      <div class="dialog-body">
        <p class="muted">Give them this temporary password. They must choose their own at the next login.</p>
        <FormField
          id="reset-password"
          v-model="password"
          label="Temporary password"
          required
          horizontal
          autocomplete="off"
          help="8+ characters with a letter and a number"
          :error="error ?? serverError"
        />
      </div>
      <footer class="dialog-foot">
        <BaseButton type="submit" variant="primary" :loading="busy" loading-text="Saving…">Reset password</BaseButton>
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
