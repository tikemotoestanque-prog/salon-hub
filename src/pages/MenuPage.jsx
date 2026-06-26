import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { priceOf, yen } from '../utils.js'

// メニュー名をカテゴリに振り分け（最初に当たったものを採用）
const CATS = [
  { key: 'perm', label: 'パーマ・縮毛矯正', icon: '🌀', test: /パーマ|矯正|デジ/ },
  { key: 'bleach', label: 'ブリーチ・ハイトーン', icon: '✨', test: /ブリーチ/ },
  { key: 'color', label: 'カラー', icon: '🎨', test: /カラー|白髪/ },
  { key: 'spa', label: 'ヘッドスパ', icon: '💆', test: /スパ/ },
  { key: 'tr', label: 'トリートメント', icon: '💧', test: /トリートメント|TR/ },
  { key: 'mens', label: 'メンズ', icon: '💈', test: /メンズ/ },
  { key: 'cut', label: 'カット', icon: '✂️', test: /.*/ },
]
const catOf = (menu) => CATS.find((c) => c.test.test(menu)) || CATS[CATS.length - 1]

// LINEリッチメニューの「MENU」専用ページ。HPトップではなくメニューに直行
export default function MenuPage() {
  const { settings } = useStore()
  const nav = useNavigate()

  // カテゴリごとにメニューをまとめる
  const groups = CATS.map((c) => ({ ...c, items: settings.menus.filter((m) => catOf(m).key === c.key) })).filter((g) => g.items.length > 0)

  return (
    <div className="lp">
      <div className="lp-demobar">
        🧪 これは<strong>メニュー専用ページ</strong>です。LINEの「メニュー」ボタンの飛び先を想定。
        <Link to="/" className="lp-back">← 管理画面に戻る</Link>
      </div>

      <section className="ap-head">
        <div className="lp-logo">HAIR SALON GRACE</div>
        <h1>メニュー & 料金</h1>
        <p>髪のお悩みに合わせて、最適なメニューをご提案します。</p>
      </section>

      <section className="lp-sec">
        {groups.map((g) => (
          <div className="mn-cat" key={g.key}>
            <div className="mn-cat-head"><span>{g.icon}</span>{g.label}</div>
            <div className="lp-menu">
              {g.items.map((m) => (
                <div className="lp-menu-item" key={m}>
                  <span>{m}</span>
                  <b>{yen(priceOf(m))}〜</b>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="lp-small">※ 料金は目安です。髪の長さ・状態により変動します。指名・お時間のかかるメニューは別途承ります。</p>
      </section>

      <section className="lp-foot">
        <h2>気になるメニューはLINEでご相談ください</h2>
        <p>「どれが合うか分からない」もOK。トークでお悩みを伺い、ぴったりのメニューをご案内します。</p>
        <button className="lp-btn line big" onClick={() => nav('/book')}>📲 LINEで予約する</button>
      </section>
    </div>
  )
}
