import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { greeting, StatusBadge } from '../../components/ui';
import { initials, stamp, visitDay, visitDayOfMonth, visitMonth, visitTime } from '../../domain/format';
import { isMine, nextAction, openItems, ownerName } from '../../domain/referrals';
import { ROLE_LABEL } from '../../domain/seed';
import { useCurrentUser } from '../../store/store';
import { usePatientReferrals } from './usePatientReferrals';

export function Dashboard() {
  const user = useCurrentUser();
  const { referrals, trials } = usePatientReferrals();
  if (!user) return null;

  const mine = referrals.filter((r) => isMine(r, user));
  const nextRef =
    mine.find((r) => openItems(r).length > 0) ??
    mine.find((r) => !r.decision) ??
    referrals.find((r) => !r.decision) ??
    referrals[0];
  const withVisit = referrals.find((r) => r.appointment && !r.decision);
  const recent = referrals
    .flatMap((r) => r.messages.map((message) => ({ message, referralId: r.id })))
    .sort((a, b) => a.message.at.localeCompare(b.message.at))
    .slice(-3)
    .reverse();

  return (
    <section className="stack stack--28">
      <div className="hero">
        <div className="hero__text">
          <div className="hero__kicker">{greeting()}</div>
          <h1 className="hero__title">Hello, {user.name}</h1>
          <p className="hero__lead">Find a trial. Track your referral. Know your next step.</p>
        </div>
        <Link className="btn btn--white" to="trials">
          <MagnifyingGlass size={18} />
          Find a trial
        </Link>
      </div>

      <div className="dash-grid">
        <div className="stack stack--24">
          {nextRef && <NextStep referralId={nextRef.id} />}
          <div>
            <div className="card-head card-head--tight">
              <h2 className="section-title">Your referrals</h2>
              <Link className="underline-link" to="referrals">
                View all
              </Link>
            </div>
            <div className="stack stack--12">
              {referrals.map((r) => {
                const action = nextAction(r);
                return (
                  <Link key={r.id} className="ref-card" to={`referrals/${r.id}`}>
                    <div className="ref-card__top">
                      <div className="ref-card__title">{trials[r.trialId].title}</div>
                      <StatusBadge referral={r} />
                    </div>
                    <div className="meta-note">
                      {trials[r.trialId].site} · {trials[r.trialId].city} · Ref {r.id}
                    </div>
                    <div className="ref-card__next">
                      <ArrowRight />
                      <span>
                        Next: {action.text}{' '}
                        <span className="faint">· {ownerName(r, action.owner)}</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
              {referrals.length === 0 && <div className="empty">No referrals yet. Find a trial to get started.</div>}
            </div>
          </div>
        </div>

        <div className="stack stack--24">
          <div className="card card--pad-sm">
            <div className="small-heading">Upcoming screening appointment</div>
            {withVisit?.appointment ? (
              <div className="appt">
                <div className="appt__date">
                  <div className="appt__month">{visitMonth(withVisit.appointment)}</div>
                  <div className="appt__day">{visitDayOfMonth(withVisit.appointment)}</div>
                </div>
                <div>
                  <div className="appt__when">
                    {visitDay(withVisit.appointment)} · {visitTime(withVisit.appointment)}
                  </div>
                  <div className="meta-note">{withVisit.appointment.place}</div>
                  <div className="appt__trial">{trials[withVisit.trialId].shortTitle}</div>
                  <Link className="underline-link underline-link--gap" to={`referrals/${withVisit.id}`}>
                    View referral
                  </Link>
                </div>
              </div>
            ) : (
              <div className="muted">
                No screening visit scheduled yet. You'll see it here once the research team schedules one.
              </div>
            )}
          </div>
          <div className="card card--pad-sm">
            <div className="card-head card-head--tight">
              <div className="small-heading small-heading--flush">Recent messages</div>
              <Link className="underline-link underline-link--small" to="messages">
                All messages
              </Link>
            </div>
            {recent.map(({ message, referralId }) => (
              <Link key={message.id} className="recent" to={`messages/${referralId}`}>
                <div className="avatar avatar--tint">{initials(message.from)}</div>
                <div className="recent__text">
                  <div className="recent__head">
                    <span>{message.from}</span>
                    <span className="recent__role">{ROLE_LABEL[message.role]}</span>
                  </div>
                  <div className="recent__body">{message.text}</div>
                  <div className="meta-note">{stamp(message.at)}</div>
                </div>
              </Link>
            ))}
            {recent.length === 0 && <div className="muted">No messages yet.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function NextStep({ referralId }: { referralId: string }) {
  const user = useCurrentUser();
  const { referrals, trials } = usePatientReferrals();
  const referral = referrals.find((r) => r.id === referralId);
  if (!user || !referral) return null;
  const trial = trials[referral.trialId];
  const action = nextAction(referral);
  const mine = isMine(referral, user);
  const upload = mine && openItems(referral).length > 0;
  return (
    <div className="next-step">
      <div className="kicker kicker--icon">
        <ArrowRight size={14} />
        Your next step
      </div>
      <div className="next-step__text">{action.text}</div>
      <div className="meta-note meta-note--below">
        {trial.shortTitle} ·{' '}
        {mine
          ? 'Assigned to you'
          : `Waiting on ${ownerName(referral, action.owner)} (${ROLE_LABEL[action.owner].toLowerCase()})`}
      </div>
      <Link className="btn btn--primary" to={`referrals/${referral.id}${upload ? '?tab=documents' : ''}`}>
        {upload ? 'Upload now' : 'Open referral'}
        <ArrowRight />
      </Link>
    </div>
  );
}
