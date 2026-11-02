import { CaretLeft, CaretRight, Question, SignOut, type Icon } from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useMatches, useNavigate, useParams } from 'react-router-dom';
import { initials } from '../domain/format';
import type { User } from '../domain/types';
import { resetDemo, signOut } from '../store/store';
import { useToast } from './act';
import { Logo, Mark } from './ui';

export interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
}

export type PageTitle = string | ((params: Record<string, string | undefined>) => string);

function usePageTitle(): string {
  const params = useParams();
  const title = useMatches()
    .map((match) => (match.handle as { title?: PageTitle } | undefined)?.title)
    .filter(Boolean)
    .at(-1);
  return typeof title === 'function' ? title(params) : (title ?? '');
}

const WEBSITE_URL = '/';

export function Shell({ user, nav, children }: { user: User; nav: NavItem[]; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 960);
  const title = usePageTitle();
  const toast = useToast();
  const navigate = useNavigate();
  const me = initials(user.name);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 960) setCollapsed(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.title = title ? `${title} · Find My Trial` : 'Find My Trial';
  }, [title]);

  return (
    <div className="shell">
      <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
        <a className="brand brand--link" href={WEBSITE_URL} title="Find My Trial website">
          <Logo />
          {!collapsed && (
            <div>
              <div className="brand__name">
                Find<span>My</span>Trial
              </div>
              <div className="brand__tag">Clinical trial referrals</div>
            </div>
          )}
        </a>
        {nav.map(({ to, label, icon: NavIcon, end }) => (
          <NavLink key={to} to={to} end={end} title={label} className="nav-item">
            <NavIcon size={20} />
            <span className="nav-item__label">{label}</span>
          </NavLink>
        ))}
        <div className="sidebar__spacer" />
        {!collapsed && (
          <div className="me">
            <div className="avatar avatar--ink">{me}</div>
            <div className="me__text">
              <div className="me__name">{user.name}</div>
              <div className="me__role">{user.roleLabel}</div>
            </div>
            <a
              className="me__out"
              href={WEBSITE_URL}
              title="Sign out"
              aria-label="Sign out"
              onClick={() => signOut()}
            >
              <SignOut size={18} />
            </a>
          </div>
        )}
        <button
          type="button"
          className="sidebar__toggle"
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <CaretRight size={16} /> : <CaretLeft size={16} />}
        </button>
      </aside>

      <div className="column">
        <header className="topbar">
          <a className="topbar__brand" href={WEBSITE_URL} aria-label="Find My Trial website">
            <Mark size={28} />
          </a>
          <div className="topbar__title">{title}</div>
          <div className="topbar__spacer" />
          <a className="topbar__help" href={WEBSITE_URL}>
            <Question size={18} />
            <span className="hide-sm">Help</span>
          </a>
          <div className="avatar avatar--ink" title={user.name}>
            {me}
          </div>
          {collapsed && (
            <a className="topbar__help" href={WEBSITE_URL} title="Sign out" aria-label="Sign out" onClick={() => signOut()}>
              <SignOut size={18} />
            </a>
          )}
        </header>
        <main className="main">{children}</main>
        <footer className="footer">
          <span>© 2026 Find My Trial · Trial matches require eligibility review by the research team.</span>
          <button
            type="button"
            className="footer__reset"
            onClick={() => {
              resetDemo();
              navigate(`/${user.role}`);
              toast('Sample data reset');
            }}
          >
            Reset sample data
          </button>
        </footer>
      </div>
    </div>
  );
}
