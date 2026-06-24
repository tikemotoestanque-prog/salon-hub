import { useParams, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { daysSince, gReview, TODAY } from '../utils.js'

function firstName(name) {
  if (!name) return 'お客'
  return name.trim().split(/\s+/)[0]
}

// 顧客データから、お客さんのLINEに届くメッセージ群を組み立てる
function buildMessages(c) {
  const staff = c.assignedStaff || 'スタッフ'
  const days = daysSince(c.lastVisit)
  const menu = c.lastMenu || 'メニュー'
  const msgs = []

  if (!c.history || c.history.length === 0) {
    msgs.push({ date: '', text: `${c.name}様、友だち追加ありがとうございます！🌿\n当サロンの公式LINEです。\nご予約・ご相談はこのトークからお気軽にどうぞ😊` })
  } else {
    msgs.push({ date: c.lastVisit, text: `${c.name}様、本日はご来店ありがとうございました！担当の${staff}です✂️\n「${menu}」の仕上がりはいかがでしたか？\n気になる点があればいつでもこちらからご相談くださいね😊` })
    msgs.push({ date: '', text: `その後、髪の調子はいかがですか？😌\n仕上がりを長持ちさせるホームケアのコツです🧴\n洗い流さないトリートメントを毛先中心になじませるのがおすすめですよ✨` })
  }

  if (days != null && days >= 30) {
    msgs.push({ date: '', text: `${c.name}様、前回のご来店から${days}日が経ちました🗓\nそろそろ「${menu}」の時期です。\n下のメニューの「ご予約」からいつでもご予約いただけます💁‍♀️` })
  }

  if (gReview(c.integrations?.google) === '依頼送信済') {
    msgs.push({ date: '', text: `${c.name}様、いつもありがとうございます🙏\nもしよろしければ、Googleでご感想をいただけるととても励みになります！\n（無理のない範囲で大丈夫です😊）\n👉 クチコミを書く` })
  }

  if (c.birthday) {
    const bm = Number(c.birthday.slice(5, 7))
    if (bm === TODAY.getMonth() + 1) {
      msgs.push({ date: '', text: `🎉 ${c.name}様、お誕生月おめでとうございます！\n今月使えるバースデークーポンをプレゼント🎁\nご来店を心よりお待ちしております✨` })
    }
  }

  return msgs
}

export default function CustomerMyPage() {
  const { id } = useParams()
  const { customers } = useStore()
  const c = customers.find((x) => x.id === id)

  if (!c) {
    return (
      <div className="empty">
        顧客が見つかりません。<br />
        <Link className="back-link" to="/">← 顧客一覧へ戻る</Link>
      </div>
    )
  }

  const msgs = buildMessages(c)

  return (
    <div>
      <Link className="back-link" to={'/customer/' + c.id}>← 顧客詳細へ戻る</Link>
      <div className="page-head">
        <div>
          <h1>お客さん画面プレビュー</h1>
          <p>{c.name}様のLINEにはこう見えます（デモ）</p>
        </div>
      </div>

      <div className="lineprev">
        <div className="phone">
          <div className="lbar"><span className="back">‹</span><span>✂️ Hair Salon 公式</span></div>
          <div className="ltalk">
            {msgs.map((m, i) => (
              <div className="lmsg" key={i}>
                <div className="lav">✂️</div>
                <div>
                  {m.date && <div className="lname">{m.date}</div>}
                  <div className="lbub">{m.text}</div>
                </div>
              </div>
            ))}

            <div className="lmsg">
              <div className="lav">✂️</div>
              <div className="lcard">
                <div className="hd">📋 {firstName(c.name)}様のマイカルテ</div>
                <div className="bd">
                  <div className="r"><span>前回メニュー</span><b>{c.lastMenu || '-'}</b></div>
                  <div className="r"><span>前回ご来店</span><b>{c.lastVisit || '-'}</b></div>
                  <div className="r"><span>ご来店回数</span><b>{c.visitCount || 0}回</b></div>
                  <div className="r"><span>次回おすすめ</span><b>{c.lastMenu || 'カット'}</b></div>
                </div>
                <div className="cta">＋ このメニューで予約する</div>
              </div>
            </div>
          </div>
          <div className="lmenu">
            <div className="mi"><span className="ic">📅</span>ご予約</div>
            <div className="mi"><span className="ic">🪪</span>会員証</div>
            <div className="mi"><span className="ic">🎁</span>クーポン</div>
          </div>
        </div>
        <div className="cap">
          ※ これはデモ用のプレビューです。実際にお客さんのLINEへ送信するには、公式アカウント連携（バックエンド）が必要です。
        </div>
      </div>
    </div>
  )
}
