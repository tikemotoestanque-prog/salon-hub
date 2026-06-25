import { Fragment } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { daysSince, gReview, TODAY, TODAY_ISO } from '../utils.js'

const WD = ['日', '月', '火', '水', '木', '金', '土']
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return fmt(d) }
const dtNum = (iso, time) => new Date(iso + 'T' + time + ':00').getTime()
const dateChip = (iso) => { const d = new Date(iso + 'T00:00:00'); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）` }
const shortDate = (iso) => { const d = new Date(iso + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}（${WD[d.getDay()]}）` }

function firstName(name) {
  if (!name) return 'お客'
  return name.trim().split(/\s+/)[0]
}

// 顧客データから、お客さんのLINEに届くメッセージ群（送信日時つき）を組み立てる
function buildMessages(c) {
  const staff = c.assignedStaff || 'スタッフ'
  const days = daysSince(c.lastVisit)
  const menu = c.lastMenu || 'メニュー'
  const msgs = []

  if (!c.history || c.history.length === 0) {
    msgs.push({ date: c.lastVisit || TODAY_ISO, time: '12:05', title: '友だち追加あいさつ', text: `${c.name}様、友だち追加ありがとうございます！🌿\n当サロンの公式LINEです。\nご予約・ご相談はこのトークからお気軽にどうぞ😊` })
  } else {
    msgs.push({ date: c.lastVisit, time: '19:30', title: '来店当日サンクス', text: `${c.name}様、本日はご来店ありがとうございました！担当の${staff}です✂️\n「${menu}」の仕上がりはいかがでしたか？\n気になる点があればいつでもこちらからご相談くださいね😊` })
    msgs.push({ date: addDays(c.lastVisit, 14), time: '10:00', title: '2週間後ホームケア案内', text: `その後、髪の調子はいかがですか？😌\n仕上がりを長持ちさせるホームケアのコツです🧴\n洗い流さないトリートメントを毛先中心になじませるのがおすすめですよ✨` })
  }

  if (days != null && days >= 30) {
    msgs.push({ date: addDays(c.lastVisit, 35), time: '11:00', title: '再来店リマインド', text: `${c.name}様、前回のご来店からそろそろ「${menu}」の時期です🗓\n下のメニューの「ご予約」からいつでもご予約いただけます💁‍♀️` })
  }

  if (gReview(c.integrations?.google) === '依頼送信済') {
    msgs.push({ date: addDays(c.lastVisit, 3), time: '18:30', title: 'クチコミ依頼', text: `${c.name}様、いつもありがとうございます🙏\nもしよろしければ、Googleでご感想をいただけるととても励みになります！\n（無理のない範囲で大丈夫です😊）\n👉 クチコミを書く` })
  }

  if (c.birthday) {
    const bm = Number(c.birthday.slice(5, 7))
    if (bm === TODAY.getMonth() + 1) {
      msgs.push({ date: `${TODAY.getFullYear()}-${String(bm).padStart(2, '0')}-01`, time: '10:00', title: '誕生月クーポン', text: `🎉 ${c.name}様、お誕生月おめでとうございます！\n今月使えるバースデークーポンをプレゼント🎁\nご来店を心よりお待ちしております✨` })
    }
  }

  // 送信日時順に並べ、過去＝既読 / 未来＝配信予約中 を判定
  msgs.sort((a, b) => dtNum(a.date, a.time) - dtNum(b.date, b.time))
  msgs.forEach((m) => { m.future = m.date > TODAY_ISO })
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
        <Link className="back-link" to="/customers">← 顧客一覧へ戻る</Link>
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
            {(() => {
              let prevDate = null
              return msgs.map((m, i) => {
                const sep = m.date !== prevDate
                prevDate = m.date
                return (
                  <Fragment key={i}>
                    {sep && <div className="ldate">{dateChip(m.date)}</div>}
                    <div className={'lmsg' + (m.future ? ' future' : '')}>
                      <div className="lav">✂️</div>
                      <div className="lwrap">
                        <div className="lname">Hair Salon 公式</div>
                        <div className="lrow">
                          <div className={'lbub' + (m.future ? ' fut' : '')}>{m.text}</div>
                          <div className="ltime">
                            {m.future ? <span className="st fut">予約</span> : <span className="st read">既読</span>}
                            <span>{m.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Fragment>
                )
              })
            })()}

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

        {/* オーナーだけが見る「自動配信の裏側」 */}
        <div className="lsched">
          <h3>⚙️ この自動配信の裏側（オーナー画面）</h3>
          <p className="sub">来店日を起点に、SalonHubが自動でLINEを配信します。文面はお客さまの状態に合わせて自動生成。</p>
          {msgs.map((m, i) => (
            <div className="sch-row" key={i}>
              <span className="sch-when">{shortDate(m.date)} {m.time}</span>
              <span className="sch-title">{m.title}</span>
              <span className={'sch-st ' + (m.future ? 'fut' : 'done')}>{m.future ? '配信予約中' : '配信済'}</span>
            </div>
          ))}
        </div>

        <div className="cap">
          ※ これはデモ用のプレビューです。実際にお客さんのLINEへ送信するには、公式アカウント連携（バックエンド）が必要です。
        </div>
      </div>
    </div>
  )
}
