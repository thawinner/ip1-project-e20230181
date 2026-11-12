<script setup lang="ts">
import type { User } from '@/types'

defineProps<{ user: User }>()
</script>

<template>
  <span v-if="!user.isActive" class="badge">Deactivated</span>
  <span v-else-if="user.mustChangePassword" class="badge warn">Must change password</span>
  <span v-else class="badge ok">Active</span>
</template>
