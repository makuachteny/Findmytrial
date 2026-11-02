import { ArrowLeft, ArrowRight, FirstAidKit, UserCircle, UsersThree, type Icon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { isRegistryId } from '../domain/registry';
import { ACCOUNTS, USERS } from '../domain/seed';
import type { Role, User } from '../domain/types';
import { signIn, useCurrentUser } from '../store/store';
import { Field, Mark } from './ui';

const PORTALS: { role: Role; product: string; icon: Icon }[] = [
  { role: 'patient', product: 'Patient portal', icon: UserCircle },
  { role: 'physician', product: 'Physician portal', icon: FirstAidKit },
  { role: 'coordinator', product: 'Research site platform', icon: UsersThree },
];

function destination(user: User, trial: string): string {
  const deepLink = user.role === 'patient' && isRegistryId(trial) ? `/trials/${trial}` : '';
  return `/${user.role}${deepLink}`;
}

export function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const current = useCurrentUser();
  const trial = params.get('trial') ?? '';
  const requested = params.get('role');
  const initial = PORTALS.find((p) => p.role === requested)?.role ?? 'patient';
  const [role, setRole] = useState<Role>(initial);
  const [accountId, setAccountId] = useState(USERS[initial].id);
  const accounts = ACCOUNTS.filter((account) => account.role === role);
  const account = accounts.find((a) => a.id === accountId) ?? USERS[role];

  // Links from the website land here, so someone already signed in goes straight through.
  if (current && (!requested || requested === current.role)) {
    return <Navigate to={destination(current, trial)} replace />;
  }

  const open = () => {
    signIn(account);
    navigate(destination(account, trial), { replace: true });
  };

  return (
    <div className="signin">
      <form
        className="signin__panel"
        onSubmit={(event) => {
          event.preventDefault();
          open();
        }}
      >
        <div className="brand">
          <Mark size={40} />
          <div>
            <div className="brand__name">
              Find<span>My</span>Trial
            </div>
            <div className="brand__tag">Clinical trial referrals</div>
          </div>
        </div>
        <h1 className="signin__title">Sign in</h1>
        <p className="muted">Choose a sample account. Everything here uses sample data, so no password is needed.</p>
        <div className="signin__accounts" role="radiogroup" aria-label="Portal">
          {PORTALS.map(({ role: key, product, icon: PortalIcon }) => (
            <label key={key} className="account" data-selected={role === key}>
              <input
                type="radio"
                name="portal"
                checked={role === key}
                onChange={() => {
                  setRole(key);
                  setAccountId(USERS[key].id);
                }}
              />
              <PortalIcon size={24} />
              <span>
                <span className="account__product">{product}</span>
                <span className="account__name">
                  {ACCOUNTS.filter((a) => a.role === key).length} sample accounts
                </span>
              </span>
            </label>
          ))}
        </div>
        <Field label="Sample account">
          {(id) => (
            <select id={id} className="input" value={account.id} onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · {option.detail}
                </option>
              ))}
            </select>
          )}
        </Field>
        <button type="submit" className="btn btn--primary btn--block">
          Continue as {account.name}
          <ArrowRight />
        </button>
        <a className="signin__back" href="/">
          <ArrowLeft />
          Back to the Find My Trial website
        </a>
      </form>
    </div>
  );
}
