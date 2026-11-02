import { ArrowRight, MagnifyingGlass, UserPlus, WarningCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { greeting, KpiCard, matchesChip, StatusBadge, StatusChips } from '../../components/ui';
import { longDate, plural } from '../../domain/format';
import { doctorName, nextAction, openItems, ownerName, visibleReferrals } from '../../domain/referrals';
import { useAppState, useCurrentUser } from '../../store/store';
import { ReferDialog } from './ReferDialog';

export function ReferralsPage({ dashboard }: { dashboard?: boolean }) {
  const state = useAppState();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [referring, setReferring] = useState(false);
  if (!user) return null;

  const status = params.get('status') ?? 'all';
  const visible = visibleReferrals(state, user);
  const needle = query.trim().toLowerCase();
  const rows = visible.filter(
    (r) =>
      (!needle || `${r.patient} ${state.trials[r.trialId].title} ${r.id}`.toLowerCase().includes(needle)) &&
      matchesChip(r, status),
  );
  const missing = visible.filter((r) => openItems(r).length > 0 && !r.decision);
  const decided = visible.filter((r) => r.decision);
  const showStatus = (chip: string) => navigate(`/physician/referrals${chip === 'all' ? '' : `?status=${chip}`}`);

  return (
    <section className="stack stack--28">
      <div className="page-head">
        <div>
          <div className="kicker kicker--wide">{user.detail}</div>
          <h1 className="page-title">{dashboard ? `${greeting()}, ${doctorName(user.name)}` : 'Referrals'}</h1>
        </div>
        <button type="button" className="btn btn--primary btn--large" onClick={() => setReferring(true)}>
          <UserPlus size={18} />
          Refer patient
        </button>
      </div>

      {dashboard && (
        <>
          <div className="kpi-grid kpi-grid--four">
            <KpiCard
              label="Active referrals"
              value={visible.filter((r) => !r.decision).length}
              sub="Not yet decided"
              accent="primary"
              onClick={() => showStatus('all')}
            />
            <KpiCard
              label="Missing information"
              value={missing.length}
              sub="Documents still needed"
              accent="orange"
              onClick={() => showStatus('missing')}
            />
            <KpiCard
              label="In screening"
              value={visible.filter((r) => r.status === 'screening').length}
              sub="Visit scheduled or pending"
              accent="navy"
              onClick={() => showStatus('screening')}
            />
            <KpiCard
              label="Decisions"
              value={decided.length}
              sub={`${decided.filter((r) => r.decision === 'eligible').length} eligible`}
              accent="green"
              onClick={() => showStatus('decision')}
            />
          </div>
          {missing.length > 0 && (
            <div className="missing-panel">
              <div className="missing-panel__head">
                <WarningCircle size={20} />
                Missing information on {plural(missing.length, 'referral')}
              </div>
              {missing.map((r) => (
                <Link key={r.id} className="missing-panel__row" to={`/physician/referrals/${r.id}`}>
                  <span>
                    <strong>{r.patient}</strong> · {state.trials[r.trialId].shortTitle}, waiting on{' '}
                    {openItems(r)
                      .map((item) => item.label)
                      .join(', ')}
                  </span>
                  <span className="missing-panel__open">
                    Open <ArrowRight />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      <div className="table-card">
        <div className="table-card__tools">
          <div className="search-input search-input--grow">
            <MagnifyingGlass size={16} />
            <input
              className="input"
              aria-label="Search referrals"
              placeholder="Search patient or trial"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <StatusChips
            active={status}
            onChange={(chip) => setParams(chip === 'all' ? {} : { status: chip }, { replace: true })}
          />
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th className="table__patient">Patient</th>
                <th className="table__trial">Trial</th>
                <th className="table__status">Status</th>
                <th>Next action</th>
                <th className="table__date">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const trial = state.trials[r.trialId];
                const action = nextAction(r);
                const open = () => navigate(`/physician/referrals/${r.id}`);
                return (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        open();
                      }
                    }}
                  >
                    <td>
                      <div className="table__name">{r.patient}</div>
                      <div className="faint">{r.id}</div>
                    </td>
                    <td>
                      <div className="truncate">{trial.shortTitle}</div>
                      <div className="faint truncate">{trial.site}</div>
                    </td>
                    <td>
                      <StatusBadge referral={r} />
                      {openItems(r).length > 0 && !r.decision && (
                        <div className="missing-note">
                          <WarningCircle />
                          Missing info
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="truncate" title={action.text}>
                        {action.text}
                      </div>
                      <div className="faint">{ownerName(r, action.owner)}</div>
                    </td>
                    <td className="table__date-cell">{longDate(r.submittedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="table-card__empty">No referrals match.</div>}
      </div>

      <ReferDialog open={referring} onClose={() => setReferring(false)} />
    </section>
  );
}
