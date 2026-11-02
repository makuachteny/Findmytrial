import { ArrowRight, UserCircle } from '@phosphor-icons/react';
import { NAV_LINKS } from '../data/content';
import { Overlay } from './Overlay';

interface MenuOverlayProps {
  signedIn: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export function MenuOverlay({ signedIn, onClose, onSignIn }: MenuOverlayProps) {
  return (
    <Overlay label="Menu" onClose={onClose}>
      <nav className="menu" aria-label="Menu">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={onClose}>
            {link.label}
            <ArrowRight aria-hidden="true" />
          </a>
        ))}
      </nav>
      <div className="menu__action">
        <button className="button button--solid button--block" type="button" onClick={onSignIn}>
          <UserCircle size={22} aria-hidden="true" />
          {signedIn ? 'My portal' : 'Sign in'}
        </button>
      </div>
    </Overlay>
  );
}
