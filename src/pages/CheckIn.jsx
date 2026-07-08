import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import jsQR from 'jsqr'
import { useStore } from '../store.jsx'
import { stampStatus, MILESTONE_COUPONS, TODAY_ISO } from '../utils.js'

// QRテキストから顧客IDを取り出す（okaeru-checkin:ID / .../u/ID / 生ID に対応）
function parseId(text) {
  if (!text) return null
  const t = text.trim()
  const m = t.match(/okaeru-checkin:(\S+)/i)
  if (m) return m[1]
  const um = t.match(/\/u\/([^/?#\s]+)/)
  if (um) return um[1]
  return t
}

export default function CheckIn() {
  const { customers, checkIn } = useStore()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const scanningRef = useRef(true)

  const [phase, setPhase] = useState('scanning') // scanning | confirm | result
  const [found, setFound] = useState(null)
  const [result, setResult] = useState(null)
  const [camError, setCamError] = useState('')
  const [manual, setManual] = useState('')

  // カメラ起動 & スキャンループ
  useEffect(() => {
    if (phase !== 'scanning') return
    let cancelled = false
    scanningRef.current = true

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, audio: false,
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        await v.play()
        tick()
      } catch (err) {
        setCamError(err?.name === 'NotAllowedError'
          ? 'カメラの使用が許可されませんでした。ブラウザの許可設定を確認するか、下の手動チェックインをご利用ください。'
          : 'カメラを起動できませんでした。下の手動チェックインをご利用ください。')
      }
    }

    const tick = () => {
      if (cancelled || !scanningRef.current) return
      const v = videoRef.current
      const canvas = canvasRef.current
      if (v && canvas && v.readyState === v.HAVE_ENOUGH_DATA) {
        canvas.width = v.videoWidth
        canvas.height = v.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        if (code && code.data) {
          handleDetect(code.data)
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    start()
    return () => {
      cancelled = true
      scanningRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [phase])

  const handleDetect = (text) => {
    const id = parseId(text)
    const c = customers.find((x) => x.id === id)
    scanningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (!c) {
      setCamError(`QRを読み取りましたが、該当する顧客が見つかりませんでした（${id}）。もう一度お試しください。`)
      // 少し待って再スキャン
      setTimeout(() => { setCamError(''); scanningRef.current = true; setPhase('scanning') }, 1800)
      return
    }
    setFound(c)
    setPhase('confirm')
  }

  const handleManual = () => {
    const c = customers.find((x) => x.id === manual.trim()) ||
      customers.find((x) => x.name === manual.trim())
    if (!c) { alert('該当する顧客が見つかりませんでした'); return }
    setFound(c)
    setPhase('confirm')
  }

  const confirmCheckIn = () => {
    const r = checkIn(found.id)
    setResult(r)
    setPhase('result')
  }

  const reset = () => {
    setFound(null); setResult(null); setCamError(''); setManual('')
    setPhase('scanning')
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>📷 QRチェックイン</h1>
          <p>お客様のマイページQRコードを読み取って来店を記録します</p>
        </div>
        <Link className="btn ghost" to="/">ダッシュボードへ</Link>
      </div>

      {phase === 'scanning' && (
        <div className="card section" style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '4 / 3' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {!camError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: '60%', aspectRatio: '1', border: '3px solid rgba(255,255,255,.85)', borderRadius: 16, boxShadow: '0 0 0 9999px rgba(0,0,0,.25)' }} />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {camError
            ? <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 10 }}>{camError}</div>
            : <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>枠内にお客様のQRコードをかざしてください</div>}

          <div style={{ borderTop: '1px solid #eee', marginTop: 16, paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>手動チェックイン（QRが使えない時）</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                list="checkin-customers"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="お客様名 または 顧客ID"
                style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
              />
              <datalist id="checkin-customers">
                {customers.map((c) => <option key={c.id} value={c.name}>{c.id}</option>)}
              </datalist>
              <button className="btn" onClick={handleManual}>検索</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'confirm' && found && (
        <ConfirmCard c={found} onConfirm={confirmCheckIn} onCancel={reset} />
      )}

      {phase === 'result' && result?.ok && (
        <ResultCard result={result} onNext={reset} />
      )}
    </div>
  )
}

function ConfirmCard({ c, onConfirm, onCancel }) {
  const stamp = stampStatus(c)
  const visitedToday = c.lastVisit === TODAY_ISO || (c.history || []).some((h) => h.date === TODAY_ISO)
  return (
    <div className="card section" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>このお客様をチェックインしますか？</div>
      <div style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 2px' }}>{c.name} 様</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{c.kana}・現在 {stamp.visitCount} 回来店</div>

      <div className="cp-stamps" style={{ maxWidth: 320, margin: '0 auto' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={'cp-stamp' + (i < stamp.currentStamps ? ' on' : '')}>{i < stamp.currentStamps ? '★' : i + 1}</span>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
        {visitedToday
          ? '本日はすでにご来店済みです（スタンプは1日1回・来店回数は増えません）'
          : <>チェックインで <b>{stamp.visitCount + 1}</b> 回目・あと {stamp.nextMilestone - stamp.visitCount - 1} 回で次の特典</>}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={onCancel}>戻る</button>
        <button className="btn" style={{ flex: 2 }} onClick={onConfirm}>✓ チェックインする</button>
      </div>
    </div>
  )
}

function ResultCard({ result, onNext }) {
  const { customer, after, milestoneReached, alreadyToday } = result
  const stamp = stampStatus(customer)
  const unlocked = milestoneReached
    ? MILESTONE_COUPONS[Math.min(Math.floor(after / 10) - 1, MILESTONE_COUPONS.length - 1)]
    : null
  return (
    <div className="card section" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>{milestoneReached ? '🎉' : '✅'}</div>
      <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>{customer.name} 様 チェックイン完了</div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>
        {alreadyToday
          ? `本日2回目のご来店です（来店回数は ${after} 回のまま）`
          : <>来店 <b>{after}</b> 回目を記録しました</>}
      </div>

      <div className="cp-stamps" style={{ maxWidth: 320, margin: '16px auto 0' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={'cp-stamp' + (i < stamp.currentStamps ? ' on' : '')}>{i < stamp.currentStamps ? '★' : i + 1}</span>
        ))}
      </div>

      {unlocked && (
        <div style={{ background: '#f0f6f1', border: '2px solid #2c5e3c', borderRadius: 12, padding: '14px 16px', marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#2c5e3c', fontWeight: 700 }}>{after}回達成で特典が解放されました！</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{unlocked.emoji} {unlocked.t}</div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>お客様のマイページにクーポンが届きます</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <Link className="btn ghost" style={{ flex: 1 }} to={'/customer/' + customer.id}>カルテを見る</Link>
        <button className="btn" style={{ flex: 1 }} onClick={onNext}>続けてスキャン</button>
      </div>
    </div>
  )
}
