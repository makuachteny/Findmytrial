import { ArrowRight, WarningCircle } from '@phosphor-icons/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { greeting, KpiCard, matchesChip, StatusBadge, StatusChips } from '../../components/ui';
import { longDate } from '../../domain/format';
import { openItems, ownerName, visibleReferrals } from '../../domain/referrals';
import { useAppState, useCurrentUser } from '../../store/store';
import { ReferralActions } from './ReferralActions';

export function QueuePage({ dashboard }: { dashboard?: boolean }) {
  const state = useAppState();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  if (!user) return null;

  const status = params.get('status') ?? 'all';
  const visible = visibleReferrals(state, user);
  const rows = visible.filter((r) => matchesChip(r, status));
  const missing = visible.filter((r) => openItems(r).length > 0 && !r.decision);
  const showStatus = (chip: string) => navigate(`/coordinator/referrals?status=${chip}`);

  return (
    <section className="stack stack--28">
      <div>
        <div className="kicker kicker--wide">{user.detail} · Research site platform</div>
        <h1 className="page-title">{dashboard ? `${greeting()}, ${user.name.split(' ')[0]}` : 'Referral queue'}</h1>
      </div>

      {dashboard && (
        <div className="kpi-grid">
          <KpiCard
            label="New referrals"
            value={visible.filter((r) => r.status === 'submitted').length}
            sub="Awaiting initial review"
            accent="primary"
            large
            onClick={() => showStatus('submitted')}
          />
          <KpiCard
            label="Screening in progress"
            value={visible.filter((r) => r.status === 'screening').length}
            sub="Eligibility pending"
            accent="navy"
            large
            onClick={() => showStatus('screening')}
          />
          <KpiCard
            label="Missing information"
            value={missing.length}
            sub="Requested from patients"
            accent="orange"
            large
            onClick={() => showStatus('missing')}
          />
        </div>
      )}

      <div className="table-card">
        <div className="table-card__tools">
          <div className="queue__title">Referral queue</div>
          <StatusChips
            active={status}
            onChange={(chip) => setParams(chip === 'all' ? {} : { status: chip }, { replace: true })}
          />
        </div>
        <div className="table-scroll">
          <table className="table queue">
            <thead>
              <tr>
                <th className="queue__patient">Patient</th>
                <th>Trial</th>
                <th>Status</th>
                <th className="queue__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const trial = state.trials[r.trialId];
                const waitingOn = openItems(r)
                  .map((item) => item.label)
                  .join(', ');
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="table__name truncate">{r.patient}</div>
                      <div className="faint truncate">
                        {r.id} · from {ownerName(r, 'physician')}
                      </div>
                    </td>
                    <td>
                      <div className="truncate">{trial.shortTitle}</div>
                      <div className="faint">Submitted {longDate(r.submittedAt)}</div>
                    </td>
                    <td>
                      <StatusBadge referral={r} />
                      {waitingOn && !r.decision && (
                        <div className="missing-note" title={`Waiting on ${waitingOn}`}>
                          <WarningCircle />
                          <span className="truncate">Waiting on {waitingOn}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="queue__row-actions">
                        <ReferralActions referral={r} compact />
                        <Link className="btn btn--primary btn--small queue__open" to={`/coordinator/referrals/${r.id}`}>
                          Open
                          <ArrowRight />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="table-card__empty">Queue is empty for this filter.</div>}
      </div>
    </section>
  );
}
