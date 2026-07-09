import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { priceOf, yen } from '../utils.js'
import { DEFAULT_SALON_NAME } from '../config/defaults.js'

const REVIEWS = [
  { n: '30代 女性', t: '担当の方が髪質をすごく覚えてくれていて、毎回安心してお任せできます。LINEで予約できるのもラク！' },
  { n: '40代 女性', t: '白髪染めの薬剤を肌に合わせて調整してくれます。アフターのケア案内も丁寧。' },
  { n: '20代 男性', t: '予約からカルテまでスマホで完結。次回の提案もLINEで来るので通いやすいです。' },
]

export default function LandingPage() {
  const { settings } = useStore()
  const nav = useNavigate()
  const menus = settings.menus.slice(0, 8)

  return (
    <div className="lp">
      <div className="lp-demobar">
        🧪 これは<strong>デモの店舗HP</strong>です。「LINEで予約」を押すと、HP→公式LINE→オカエルに新規顧客として流入する動線を体験できます。
        <Link to="/" className="lp-back">← 管理画面に戻る</Link>
      </div>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-in">
          <div className="lp-logo">{settings.salonName || DEFAULT_SALON_NAME}</div>
          <h1>あなたの「似合う」を、<br />ずっと覚えているサロン。</h1>
          <p>カルテ・薬剤レシピ・髪の悩みをすべて記録。次に来たときも、いつものあなたに最適な提案を。</p>
          <div className="lp-cta">
            <button className="lp-btn line" onClick={() => nav('/book')}>📲 LINEで予約する</button>
          </div>
          <div className="lp-note">＊LINE登録で、次回予約・クーポン・マイカルテがすべてLINEに届きます</div>
        </div>
      </section>

      {/* MENU */}
      <section className="lp-sec">
        <div className="lp-eyebrow">MENU & PRICE</div>
        <h2>メニュー & 料金</h2>
        <div className="lp-menu">
          {menus.map((mn) => (
            <div className="lp-menu-item" key={mn}>
              <span>{mn}</span>
              <b>{yen(priceOf(mn))}〜</b>
            </div>
          ))}
        </div>
        <p className="lp-small">※ 料金は目安です。髪の長さ・状態により変動します。</p>
      </section>

      {/* STAFF */}
      <section className="lp-sec alt">
        <div className="lp-eyebrow">STYLIST</div>
        <h2>スタイリスト</h2>
        <div className="lp-staff">
          {settings.staff.map((s) => (
            <div className="lp-staff-card" key={s}>
              <div className="lp-ava">{s.charAt(0)}</div>
              <div className="lp-staff-name">{s}</div>
              <div className="lp-staff-role">スタイリスト</div>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="lp-sec">
        <div className="lp-eyebrow">VOICE</div>
        <h2>お客様の声</h2>
        <div className="lp-reviews">
          {REVIEWS.map((r, i) => (
            <div className="lp-review" key={i}>
              <div className="lp-stars">★★★★★</div>
              <p>{r.t}</p>
              <div className="lp-review-n">— {r.n}</div>
            </div>
          ))}
        </div>
      </section>

      {/* INFO */}
      <section className="lp-sec alt">
        <div className="lp-eyebrow">INFORMATION</div>
        <h2>店舗情報</h2>
        <dl className="lp-info">
          <dt>営業時間</dt><dd>10:00 – 20:00（最終受付 19:00）</dd>
          <dt>定休日</dt><dd>毎週火曜日</dd>
          <dt>住所</dt><dd>〒000-0000 ○○県○○市○○ 1-2-3（デモ）</dd>
          <dt>TEL</dt><dd>03-1234-5678（デモ）</dd>
        </dl>
      </section>

      {/* FOOTER CTA */}
      <section className="lp-foot">
        <h2>ご予約はLINEがいちばん簡単です</h2>
        <p>友だち追加 → トークから予約 → 来店後はマイカルテとリマインドが自動で届きます。</p>
        <button className="lp-btn line big" onClick={() => nav('/book')}>📲 LINEで予約する</button>
      </section>
    </div>
  )
}
