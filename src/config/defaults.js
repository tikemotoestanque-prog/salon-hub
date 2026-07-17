export const DEFAULT_SALON_NAME = 'サンプル店'
export const DEFAULT_INDUSTRY = '店舗'
export const DEFAULT_ICON_EMOJI = '🍀'
export const DEFAULT_ADDRESS = '〒000-0000 ○○県○○市○○ 1-2-3（デモ）'
export const DEFAULT_PHONE = '03-1234-5678（デモ）'

// LINE自動送信の既定文面（api/_lib/templates.js 経由でも利用）。
// プレースホルダ: {salonName} {customerName} {date} {time} {menu} {staff}
export const DEFAULT_LINE_TEMPLATES = {
  greeting:
    'ご登録ありがとうございます😊\n{salonName}です！\n\nご予約はメニューから24時間いつでもどうぞ。\nご相談もこのトークからお気軽に🌿',
  bookingConfirm:
    '{customerName}様、ご予約ありがとうございます！\n\n📅 {date} {time}〜\n📋 {menu}\n👤 担当：{staff}\n\nご来店をお待ちしております😊',
  reminder:
    '{customerName}様、明日のご来店リマインドです😊\n\n📅 {date} {time}〜\n📋 {menu}\n👤 担当：{staff}\n\nお気をつけてお越しください🌿',
  birthday:
    '{customerName}様、お誕生日おめでとうございます🎉\n\n{salonName}より、日頃の感謝を込めて。\nこの機会にぜひご来店ください🌿',
  reengage:
    '{customerName}様、ご無沙汰しております😊\n\n{salonName}です。お元気にお過ごしでしょうか？\nよろしければまたのご来店をお待ちしております🌿',
  revisitNudge:
    '{customerName}様、そろそろ{menu}の頃合いかもしれません🌿\n\nご都合の良いタイミングで、ぜひまたお立ち寄りください。\n{salonName}スタッフ一同、お待ちしております😊',
}
