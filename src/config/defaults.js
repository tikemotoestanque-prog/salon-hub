export const DEFAULT_SALON_NAME = 'サンプル店'
export const DEFAULT_INDUSTRY = '店舗'
export const DEFAULT_ICON_EMOJI = '🍀'
export const DEFAULT_ADDRESS = '〒000-0000 ○○県○○市○○ 1-2-3（デモ）'

// LINE自動送信の既定文面（api/_lib/templates.js 経由でも利用）。
// プレースホルダ: {salonName} {customerName} {date} {time} {menu} {staff}
export const DEFAULT_LINE_TEMPLATES = {
  greeting:
    'ご登録ありがとうございます😊\n{salonName}です！\n\nご予約はメニューから24時間いつでもどうぞ。\nご相談もこのトークからお気軽に🌿',
  bookingConfirm:
    '{customerName}様、ご予約ありがとうございます！\n\n📅 {date} {time}〜\n📋 {menu}\n👤 担当：{staff}\n\nご来店をお待ちしております😊',
  reminder:
    '{customerName}様、明日のご来店リマインドです😊\n\n📅 {date} {time}〜\n📋 {menu}\n👤 担当：{staff}\n\nお気をつけてお越しください🌿',
}
