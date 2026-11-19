import { reactive } from 'vue'

export const toastState = reactive({
  message: '',
  kind: null,
  action: null,
  visible: false,
})

let timer = null

export function toast(message, opt = {}) {
  toastState.message = message
  toastState.kind = opt.kind ?? null
  toastState.action = opt.action ?? null
  toastState.visible = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    toastState.visible = false
  }, opt.action ? 5200 : 2400)
}

export function runToastAction() {
  const fn = toastState.action?.fn
  toastState.visible = false
  if (fn) fn()
}
