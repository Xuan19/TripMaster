<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { forgotPassword, login, register, resetPassword } from '../../services/api/authApi'

const emit = defineEmits<{
  (e: 'authenticated', username: string): void
}>()

const mode = ref<'login' | 'register' | 'forgot' | 'reset'>('login')
const username = ref('')
const email = ref('')
const password = ref('')
const resetToken = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)

function getApiErrorMessage(error: any, fallback: string) {
  const data = error?.response?.data
  if (!data) return fallback

  if (typeof data.message === 'string' && data.message.trim().length > 0) {
    return data.message
  }

  if (data.errors && typeof data.errors === 'object') {
    const parts: string[] = []
    Object.values(data.errors).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (typeof entry === 'string' && entry.trim().length > 0) parts.push(entry.trim())
        })
      }
    })
    if (parts.length > 0) return parts.join(' ')
  }

  return fallback
}

async function submit() {
  if (isSubmitting.value) return
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const trimmedUsername = username.value.trim()
    const trimmedEmail = email.value.trim()
    const trimmedToken = resetToken.value.trim()

    if (mode.value === 'register') {
      if (!trimmedUsername || !trimmedEmail || !password.value) {
        errorMessage.value = 'Username, email and password are required.'
        return
      }
      const response = await register(trimmedUsername, trimmedEmail, password.value)
      successMessage.value = response.verificationToken
        ? `${response.message} Verification token: ${response.verificationToken}`
        : response.message
      mode.value = 'login'
      password.value = ''
      return
    }

    if (mode.value === 'login') {
      if (!trimmedUsername || !password.value) {
        errorMessage.value = 'Username/email and password are required.'
        return
      }
      const response = await login(trimmedUsername, password.value)
      emit('authenticated', response.username)
      return
    }

    if (mode.value === 'forgot') {
      if (!trimmedEmail) {
        errorMessage.value = 'Email is required.'
        return
      }
      const response = await forgotPassword(trimmedEmail)
      successMessage.value = response.message
      if (response.resetToken) {
        resetToken.value = response.resetToken
        successMessage.value = `${response.message} Token: ${response.resetToken}`
      }
      mode.value = 'reset'
      return
    }

    if (!trimmedEmail || !trimmedToken || !password.value) {
      errorMessage.value = 'Email, reset token and new password are required.'
      return
    }
    await resetPassword(trimmedEmail, trimmedToken, password.value)
    successMessage.value = 'Password reset successful. You can now sign in.'
    mode.value = 'login'
    password.value = ''
    resetToken.value = ''
  } catch (error: any) {
    errorMessage.value =
      mode.value === 'register'
        ? getApiErrorMessage(error, 'Registration failed.')
        : mode.value === 'login'
          ? getApiErrorMessage(error, 'Login failed.')
          : mode.value === 'forgot'
            ? getApiErrorMessage(error, 'Forgot password request failed.')
            : getApiErrorMessage(error, 'Reset password failed.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="auth-panel">
    <h2>
      {{
        mode === 'login'
          ? 'Sign in'
          : mode === 'register'
            ? 'Create account'
            : mode === 'forgot'
              ? 'Forgot password'
              : 'Reset password'
      }}
    </h2>

    <div v-if="mode === 'login' || mode === 'register'" class="field-group">
      <label>{{ mode === 'login' ? 'Username or email' : 'Username' }}</label>
      <InputText v-model="username" :placeholder="mode === 'login' ? 'username or email' : 'username'" />
    </div>

    <div v-if="mode === 'register' || mode === 'forgot' || mode === 'reset'" class="field-group">
      <label>Email</label>
      <InputText v-model="email" placeholder="email@example.com" />
    </div>

    <div v-if="mode === 'reset'" class="field-group">
      <label>Reset token</label>
      <InputText v-model="resetToken" placeholder="paste reset token" />
    </div>

    <div v-if="mode !== 'forgot'" class="field-group">
      <label>{{ mode === 'reset' ? 'New password' : 'Password' }}</label>
      <Password v-model="password" :feedback="false" toggle-mask />
    </div>

    <Message v-if="successMessage" severity="success" :closable="false">{{ successMessage }}</Message>
    <Message v-if="errorMessage" severity="error" :closable="false">{{ errorMessage }}</Message>

    <Button
      type="button"
      :label="
        mode === 'login'
          ? 'Sign in'
          : mode === 'register'
            ? 'Create account'
            : mode === 'forgot'
              ? 'Generate reset token'
              : 'Reset password'
      "
      :loading="isSubmitting"
      class="auth-primary-btn"
      @click="submit"
    />

    <Button
      v-if="mode === 'login' || mode === 'register'"
      type="button"
      text
      :label="mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'"
      class="auth-switch-btn"
      @click="mode = mode === 'login' ? 'register' : 'login'"
    />

    <Button
      v-if="mode === 'login'"
      type="button"
      text
      label="Forgot password?"
      class="auth-switch-btn"
      @click="mode = 'forgot'"
    />

    <Button
      v-if="mode === 'forgot' || mode === 'reset'"
      type="button"
      text
      label="Back to sign in"
      class="auth-switch-btn"
      @click="mode = 'login'"
    />
  </section>
</template>
