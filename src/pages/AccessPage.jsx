import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { DEFAULT_SALON_NAME, DEFAULT_ADDRESS } from '../config/defaults.js'

// LINEリッチメニューの「ACCESS」専用ページ。HP全体ではなく、店舗情報に直行する
export default function AccessPage() {
  const { settings } = useStore()
  const nav = useNavigate()
  const salonName = settings.salonName || DEFAULT_SALON_NAME
  const address = settings.address || DEFAULT_ADDRESS

  return (
    <div className="lp">
      <div className="lp-demobar">
        🧪 これは<strong>アクセス専用ページ</strong>です。LINEの「アクセス」ボタンの飛び先を想定。
        <Link to="/" className="lp-back">← 管理画面に戻る</Link>
      </div>

      <section className="ap-head">
        <div className="lp-logo">{salonName}</div>
        <h1>アクセス</h1>
        <p>ご来店ありがとうございます。道順・駐車場のご案内です。</p>
      </section>

      {/* 地図（デモ表示） */}
      <div className="ap-map">
        <div className="ap-map-grid" />
        <div className="ap-road ap-road-h" />
        <div className="ap-road ap-road-v" />
        <div className="ap-pin">📍</div>
        <div className="ap-pin-label">{salonName}</div>
        <div className="ap-station">🚉 ○○駅</div>
        <span className="ap-map-note">※ デモ用の地図イメージです（実際はGoogleマップが入ります）</span>
      </div>

      <section className="lp-sec">
        <dl className="lp-info">
          <dt>住所</dt><dd>{address}</dd>
          <dt>アクセス</dt><dd>○○線「○○駅」東口より徒歩5分</dd>
          <dt>駐車場</dt><dd>提携コインパーキングあり（2時間まで無料券をお渡しします）</dd>
          <dt>営業時間</dt><dd>10:00 – 20:00（最終受付 19:00）</dd>
          <dt>定休日</dt><dd>毎週火曜日</dd>
          <dt>TEL</dt><dd>03-1234-5678（デモ）</dd>
        </dl>
      </section>

      <section className="lp-foot">
        <h2>ご予約はLINEがいちばん簡単です</h2>
        <p>道に迷われた際も、LINEのトークからお気軽にお問い合わせください。</p>
        <button className="lp-btn line big" onClick={() => nav('/book')}>📲 LINEで予約する</button>
      </section>
    </div>
  )
}
