import { ArrowRight, Stethoscope, UserCircle, UsersThree, type Icon } from '@phosphor-icons/react';
import { PORTALS } from '../data/content';
import { signInAs, type RoleKey } from '../lib/links';
import { Overlay } from './Overlay';

const ICONS: Record<RoleKey, Icon> = {
  patient: UserCircle,
  physician: Stethoscope,
  coordinator: UsersThree,
};

export function PortalsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Overlay label="Sign in" onClose={onClose}>
      <div className="portals">
        <h2>Which portal are you signing in to?</h2>
        <div className="portals__grid">
          {PORTALS.map(({ role, title, body }) => {
            const PortalIcon = ICONS[role];
            return (
              <a key={role} className="portal" href={signInAs(role)}>
                <PortalIcon size={48} aria-hidden="true" />
                <span className="portal__title">{title}</span>
                <span className="portal__body">{body}</span>
                <span className="portal__continue">
                  Continue
                  <ArrowRight aria-hidden="true" />
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </Overlay>
  );
}
