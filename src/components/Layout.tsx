import { NavLink, Outlet } from 'react-router';
import { useAppStore } from '../store/AppStore';
import { IconChart, IconList, IconPlay, IconSettings, IconSun, IconTimer } from './Icons';

const TABS = [
  { to: '/exercises', label: 'Exercises', Icon: IconList },
  { to: '/session', label: 'Session', Icon: IconPlay },
  { to: '/timer', label: 'Timer', Icon: IconTimer },
  { to: '/analytics', label: 'Analytics', Icon: IconChart },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
];

function Links() {
  const { data } = useAppStore();
  return (
    <>
      {TABS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          <Icon />
          <span>{label}</span>
          {to === '/session' && data.active && <span className="dot" aria-label="Session in progress" />}
        </NavLink>
      ))}
    </>
  );
}

export function Layout() {
  return (
    <div className="app">
      <div className="backdrop" aria-hidden="true" />
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <IconSun width={24} height={24} style={{ color: 'var(--accent-text)' }} />
          HomeBody
        </div>
        <Links />
      </nav>
      <Outlet />
      <nav className="tabbar" aria-label="Main">
        <Links />
      </nav>
    </div>
  );
}
