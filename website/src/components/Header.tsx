import { List, MagnifyingGlass, UserCircle } from '@phosphor-icons/react';
import { NAV_LINKS } from '../data/content';
import { Brand } from './Brand';

interface HeaderProps {
  signedIn: boolean;
  onSearch: () => void;
  onSignIn: () => void;
  onMenu: () => void;
}

export function Header({ signedIn, onSearch, onSignIn, onMenu }: HeaderProps) {
  return (
    <header className="header">
      <a className="header__home" href="#top" aria-label="Find My Trial home">
        <Brand />
      </a>
      <nav className="header__nav" aria-label="Main">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <div className="header__actions">
        <button type="button" onClick={onSearch} aria-label="Search trials">
          <MagnifyingGlass size={20} aria-hidden="true" />
          <span className="hide-below-tablet">Search trials</span>
        </button>
        <button className="header__sign-in" type="button" onClick={onSignIn}>
          <UserCircle size={20} aria-hidden="true" />
          <span>{signedIn ? 'My portal' : 'Sign in'}</span>
        </button>
        <button className="header__menu" type="button" onClick={onMenu} aria-label="Menu">
          <List size={22} aria-hidden="true" />
          <span className="hide-below-tablet">Menu</span>
        </button>
      </div>
    </header>
  );
}
