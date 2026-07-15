import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { DEFAULT_SALON_NAME, DEFAULT_ADDRESS, DEFAULT_PHONE } from '../config/defaults.js'

// お客様向けのプライバシーポリシー。店名・住所・電話番号はsettingsから差し込むので、
// forkごとに文面を書き直す必要がない（標準の型）。
export default function PrivacyPolicy() {
  const { settings } = useStore()
  const nav = useNavigate()
  const salonName = settings.salonName || DEFAULT_SALON_NAME
  const address = settings.address || DEFAULT_ADDRESS
  const phone = settings.phone || DEFAULT_PHONE

  return (
    <div className="lp">
      <div className="lp-demobar">
        🧪 これは<strong>プライバシーポリシーのページ</strong>です。フッター等からのリンク先を想定。
        <Link to="/" className="lp-back">← 管理画面に戻る</Link>
      </div>

      <section className="ap-head">
        <div className="lp-logo">{salonName}</div>
        <h1>プライバシーポリシー</h1>
        <p>お客さまの個人情報の取り扱いについて、以下のとおりお知らせします。</p>
      </section>

      <section className="lp-sec" style={{ maxWidth: 720, textAlign: 'left' }}>
        <div style={{ lineHeight: 1.95, fontSize: 14.5 }}>
          <p style={{ marginBottom: 24 }}>
            {salonName}（以下「当店」といいます）は、お客さまの個人情報を大切に取り扱います。
            当店が提供する顧客管理・LINEでのご案内・ご予約管理のためのツール「オカエル」における
            個人情報の取り扱いについて、以下のとおりお知らせします。
          </p>

          <h3 style={sectionTitle}>1. お店の情報</h3>
          <dl className="lp-info" style={{ margin: '0 0 24px', maxWidth: '100%' }}>
            <dt>店名</dt><dd>{salonName}</dd>
            <dt>住所</dt><dd>{address}</dd>
            <dt>TEL</dt><dd>{phone}</dd>
          </dl>

          <h3 style={sectionTitle}>2. 取得する情報</h3>
          <p style={pStyle}>ご予約・ご来店・LINEでのご登録等を通じて、以下のような情報をお預かりします。</p>
          <ul style={ulStyle}>
            <li>お名前・フリガナ・性別・生年月日</li>
            <li>電話番号・メールアドレス</li>
            <li>LINEのご登録情報（友だち登録時に発行されるID）</li>
            <li>ご来店日・ご利用メニュー・ご予約内容・担当スタッフ</li>
            <li>施術メモ、アレルギー等のご記入内容、（該当する場合）施術前後のお写真</li>
          </ul>

          <h3 style={sectionTitle}>3. 利用目的</h3>
          <p style={pStyle}>お預かりした情報は、以下の目的のために利用します。</p>
          <ul style={ulStyle}>
            <li>ご予約の管理、ご来店履歴の記録・共有（スタッフ間）</li>
            <li>LINEでのご予約確認・前日リマインド・お誕生日のご案内・再来店のお声がけ</li>
            <li>お客さまお一人おひとりに合わせたご提案・接客のため</li>
          </ul>
          <p style={pStyle}>上記の目的以外で、お預かりした情報を利用することはありません。</p>

          <h3 style={sectionTitle}>4. 第三者提供・業務委託について</h3>
          <p style={pStyle}>
            当店は、ご予約・顧客管理システムとして「オカエル」（提供：ソーシャルスマイラー）を利用しており、
            お預かりした情報の保管・管理を同社に業務委託しています。データはクラウド上のデータベースに
            安全に保管され、LINEでのご案内はLINEヤフー株式会社が提供するメッセージ配信の仕組みを通じて
            お届けしています。
          </p>
          <p style={pStyle}>法令に基づく場合を除き、ご本人の同意なく上記以外の第三者に情報を提供することはありません。</p>

          <h3 style={sectionTitle}>5. 安全管理措置</h3>
          <p style={pStyle}>当店は、お預かりした個人情報の漏えい・滅失・毀損の防止その他の安全管理のため、必要かつ適切な措置を講じます。</p>

          <h3 style={sectionTitle}>6. 開示・訂正・削除等のご請求</h3>
          <p style={pStyle}>
            ご自身の情報の開示・訂正・削除等をご希望の場合は、LINEのトークまたは下記の連絡先まで
            お気軽にお申し付けください。ご本人確認の上、法令に従い対応いたします。
          </p>

          <h3 style={sectionTitle}>7. お問い合わせ窓口</h3>
          <p style={pStyle}>
            {salonName}　TEL：{phone}<br />
            またはLINE公式アカウントのトークからお問い合わせください。
          </p>

          <h3 style={sectionTitle}>8. 本ポリシーの変更について</h3>
          <p style={pStyle}>本ポリシーの内容は、必要に応じて変更することがあります。変更後の内容は、本ページに掲載したときから効力を生じます。</p>
        </div>
      </section>

      <section className="lp-foot">
        <h2>ご予約はLINEがいちばん簡単です</h2>
        <p>道に迷われた際も、LINEのトークからお気軽にお問い合わせください。</p>
        <button className="lp-btn line big" onClick={() => nav('/book')}>📲 LINEで予約する</button>
      </section>
    </div>
  )
}

const sectionTitle = { fontSize: 16, fontWeight: 700, color: '#4a4036', margin: '28px 0 10px' }
const pStyle = { margin: '0 0 12px' }
const ulStyle = { margin: '0 0 12px', paddingLeft: '1.4em' }
