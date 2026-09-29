import { Bell, CircleCheck, Info, TriangleAlert, CircleAlert } from 'lucide-react'
import { formatRelative } from '../../lib/format'
import { navigate } from '../../lib/router'
import { useStore } from '../../state/store-context'
import type { Tone } from '../../types'
import { Button } from '../ui/Button'
import { Popover } from '../ui/Popover'
import { EmptyState } from '../ui/States'

const TONE_ICON: Record<Tone, typeof Info> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
}

export function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useStore()
  const unread = notifications.filter((item) => !item.read).length
  const sorted = [...notifications].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <Popover
      label="Notifications"
      width={380}
      trigger={(props) => (
        <span className="topbar__icon-btn">
          <Button {...props} variant="ghost" iconOnly icon={Bell} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} />
          {unread ? (
            <span className="topbar__badge" aria-hidden="true">
              {unread}
            </span>
          ) : null}
        </span>
      )}
    >
      {(close) => (
        <>
          <div className="notifications__head">
            <h2 className="notifications__title">Notifications</h2>
            <Button variant="ghost" size="sm" disabled={unread === 0} onClick={markAllNotificationsRead}>
              Mark all as read
            </Button>
          </div>
          {sorted.length === 0 ? (
            <EmptyState compact icon={Bell} title="You're all caught up" description="Alerts about disk usage, keys, and backups appear here." />
          ) : (
            <ul className="notifications__list">
              {sorted.map((item) => {
                const Icon = TONE_ICON[item.tone]
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="notification"
                      onClick={() => {
                        markNotificationRead(item.id)
                        if (item.target) navigate(item.target.view, item.target.params ?? {})
                        close()
                      }}
                    >
                      <span className={`notification__icon notification__icon--${item.tone}`} aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="notification__body">
                        <span className="notification__title">
                          {item.title}
                          {!item.read ? (
                            <>
                              <span className="notification__unread" aria-hidden="true" />
                              <span className="sr-only">(unread)</span>
                            </>
                          ) : null}
                        </span>
                        <span className="notification__text" style={{ display: 'block' }}>
                          {item.body}
                        </span>
                        <span className="notification__time" style={{ display: 'block' }}>
                          {formatRelative(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </Popover>
  )
}
