import { createContext, useCallback, useContext, useRef, useState } from 'react'

// アプリ全体共通の「保存しました」「失敗しました」通知。
// クリック操作の反応が画面上でわかりにくい箇所（フォームが長い・遷移しない等）向けに、
// 画面右下に一時的に表示するトーストとして使う。
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback((message, type = 'success') => {
    const id = ++counter.current
    setToasts((list) => [...list, { id, message, type }])
    setTimeout(() => dismiss(id), type === 'error' ? 4000 : 2600)
  }, [dismiss])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={'toast toast-' + t.type} onClick={() => dismiss(t.id)}>
            {t.type === 'error' ? '⚠️ ' : '✓ '}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// useToast()() のように呼ぶ（notify関数そのものを返す）。
// 使い方: const toast = useToast(); toast('保存しました'); toast('送信に失敗しました', 'error')
export const useToast = () => useContext(ToastContext) || (() => {})
