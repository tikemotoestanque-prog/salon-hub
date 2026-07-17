import { Link } from 'react-router-dom'
import BookingForm from '../components/BookingForm.jsx'
import { useStore } from '../store.jsx'
import { DEFAULT_SALON_NAME } from '../config/defaults.js'
import { IS_DEMO } from '../utils.js'

export default function GuestBooking() {
  const { settings } = useStore()
  const salonName = settings.salonName || DEFAULT_SALON_NAME
  return (
    <div className="cp">
      <div className="cp-frame">
        <div className="cp-bar">
          <span className="cp-salon">{salonName}</span>
          <span className="cp-user">ご予約</span>
        </div>
        <div className="cp-body">
          <div className="cp-sec">
            <p className="cp-muted" style={{ margin: '0 0 16px' }}>お名前・メニュー・ご希望のお時間を選ぶだけ。空いているお時間からお選びいただけます。</p>
            <BookingForm />
          </div>
        </div>
      </div>
      <div className="cp-note">
        {IS_DEMO && <>※ デモ予約です。確定するとお店の「予約タイムテーブル」に反映されます。</>}
        <Link to="/lp" style={{ marginLeft: IS_DEMO ? 8 : 0 }}>← HPに戻る</Link>
        <Link to="/privacy" style={{ marginLeft: 8 }}>プライバシーポリシー</Link>
      </div>
    </div>
  )
}
