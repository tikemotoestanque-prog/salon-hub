import { DEFAULT_LINE_TEMPLATES } from '../config/defaults.js'

export const DEFAULT_TEMPLATES = DEFAULT_LINE_TEMPLATES

// settings.lineTemplates があればキーごとに上書き、なければ既定を使う
export function getTemplates(settings) {
  const custom = (settings && settings.lineTemplates) || {}
  return {
    greeting: custom.greeting || DEFAULT_TEMPLATES.greeting,
    bookingConfirm: custom.bookingConfirm || DEFAULT_TEMPLATES.bookingConfirm,
    reminder: custom.reminder || DEFAULT_TEMPLATES.reminder,
  }
}

// {key} を vars[key] に置換。未定義キーは空文字にする。
export function applyTemplate(tmpl, vars) {
  if (!tmpl) return ''
  return tmpl.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars ? vars[key] : undefined
    return v == null ? '' : String(v)
  })
}
