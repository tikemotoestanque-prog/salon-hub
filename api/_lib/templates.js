// LINE自動送信の文面テンプレート
// プレースホルダ規約: {salonName} {customerName} {date} {time} {menu} {staff}
// 業種依存の絵文字は既定から外し、中立的な表現にしている（店ごとにSettingsで上書き可）。

export const DEFAULT_TEMPLATES = {
  greeting:
    'ご登録ありがとうございます😊\n{salonName}です！\n\nご予約はメニューから24時間いつでもどうぞ。\nご相談もこのトークからお気軽に🌿',
  bookingConfirm:
    '{customerName}様、ご予約ありがとうございます！\n\n📅 {date} {time}〜\n📋 {menu}\n👤 担当：{staff}\n\nご来店をお待ちしております😊',
  reminder:
    '{customerName}様、明日のご来店リマインドです😊\n\n📅 {date} {time}〜\n📋 {menu}\n👤 担当：{staff}\n\nお気をつけてお越しください🌿',
}

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
