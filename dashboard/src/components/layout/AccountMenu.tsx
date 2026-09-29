import { ChevronDown, LogOut, Monitor, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { navigate } from '../../lib/router'
import { ROLE_META } from '../../lib/status'
import { useStore } from '../../state/store-context'
import { useAuth } from '../../state/auth-context'
import { useTheme } from '../../state/theme-context'
import { Avatar } from '../ui/Avatar'
import { Menu, MenuItem, MenuLabel, MenuRadioItem, MenuSeparator } from '../ui/Menu'

export function AccountMenu() {
  const { currentUser } = useStore()
  const { logout } = useAuth()
  const { preference, setPreference } = useTheme()
  return (
    <Menu
      label="Account"
      minWidth={260}
      trigger={(props) => (
        <button type="button" className="account-trigger" {...props} aria-label={`Account menu for ${currentUser.name}`}>
          <Avatar name={currentUser.name} />
          <ChevronDown aria-hidden="true" />
        </button>
      )}
    >
      <div className="account-header" role="presentation">
        <Avatar name={currentUser.name} size="lg" />
        <span className="account-header__text">
          <span className="account-header__name">{currentUser.name}</span>
          <span className="account-header__email">
            {currentUser.email} · {ROLE_META[currentUser.role].label}
          </span>
        </span>
      </div>
      <MenuSeparator />
      <MenuItem icon={UserRound} onSelect={() => navigate('users', { q: currentUser.email })}>
        Your staff profile
      </MenuItem>
      <MenuItem icon={ShieldCheck} onSelect={() => navigate('settings', { tab: 'security' })}>
        Security settings
      </MenuItem>
      <MenuSeparator />
      <MenuLabel>Theme</MenuLabel>
      <MenuRadioItem icon={Sun} checked={preference === 'light'} onSelect={() => setPreference('light')}>
        Light
      </MenuRadioItem>
      <MenuRadioItem icon={Moon} checked={preference === 'dark'} onSelect={() => setPreference('dark')}>
        Dark
      </MenuRadioItem>
      <MenuRadioItem icon={Monitor} checked={preference === 'system'} onSelect={() => setPreference('system')}>
        Match system
      </MenuRadioItem>
      <MenuSeparator />
      <MenuItem icon={LogOut} onSelect={logout}>
        Sign out
      </MenuItem>
    </Menu>
  )
}
