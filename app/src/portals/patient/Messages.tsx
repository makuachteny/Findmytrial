import { ArrowLeft, ChatCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { NotFound } from '../../components/NotFound';
import { Thread } from '../../components/ReferralWorkspace';
import { StatusBadge } from '../../components/ui';
import { plural } from '../../domain/format';
import { useCurrentUser } from '../../store/store';
import { usePatientReferrals } from './usePatientReferrals';

export function Messages() {
  const { referrals, trials } = usePatientReferrals();
  return (
    <section className="stack stack--20 messages-page">
      <h1 className="page-title">Messages</h1>
      <p className="muted">One conversation per referral, shared with your physician and the research team.</p>
      <div className="stack stack--12">
        {referrals.map((r) => {
          const last = r.messages.at(-1);
          return (
            <Link key={r.id} className="thread-link" to={r.id}>
              <div className="thread-link__icon">
                <ChatCircle size={22} />
              </div>
              <div className="thread-link__text">
                <div className="thread-link__title">{trials[r.trialId].title}</div>
                <div className="thread-link__last">
                  {last ? `${last.from.split(' ')[0]}: ${last.text}` : 'No messages yet'}
                </div>
              </div>
              <div className="thread-link__count">{plural(r.messages.length, 'message')}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function Conversation() {
  const { id } = useParams();
  const { state } = useLocation();
  const user = useCurrentUser();
  const { referrals, trials } = usePatientReferrals();
  const [draft, setDraft] = useState<string>(state?.draft ?? '');
  const referral = referrals.find((r) => r.id === id);
  if (!user || !referral) return <NotFound title="This conversation is not available" back="/patient/messages" />;
  const trial = trials[referral.trialId];

  return (
    <section className="stack stack--20 workspace">
      <Link className="back-link" to="/patient/messages">
        <ArrowLeft />
        Back to messages
      </Link>
      <div className="page-head">
        <div>
          <h1 className="page-title page-title--tight">{trial.title}</h1>
          <StatusBadge referral={referral} />
        </div>
        <Link className="underline-link" to={`/patient/referrals/${referral.id}`}>
          View referral
        </Link>
      </div>
      <Thread referral={referral} user={user} draft={draft} setDraft={setDraft} />
    </section>
  );
}
