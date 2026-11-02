import { Link, useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../components/ui';
import { longDate } from '../../domain/format';
import { nextAction, ownerName } from '../../domain/referrals';
import { usePatientReferrals } from './usePatientReferrals';

export function MyReferrals() {
  const { referrals, trials } = usePatientReferrals();
  const navigate = useNavigate();
  return (
    <section className="stack stack--20">
      <h1 className="page-title">My referrals</h1>
      <div className="table-card">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th className="table__trial">Trial</th>
                <th className="table__patient">Research site</th>
                <th className="table__status">Status</th>
                <th>Next action</th>
                <th className="table__date">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => {
                const trial = trials[r.trialId];
                const action = nextAction(r);
                const open = () => navigate(r.id);
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
                      <div className="table__name truncate" title={trial.title}>
                        {trial.shortTitle}
                      </div>
                      <div className="faint">{r.id}</div>
                    </td>
                    <td>
                      <div>{trial.site}</div>
                      <div className="faint">{trial.city}</div>
                    </td>
                    <td>
                      <StatusBadge referral={r} />
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
        {referrals.length === 0 && (
          <div className="table-card__empty">
            No referrals yet. <Link to="../trials">Find a trial</Link> to get started.
          </div>
        )}
      </div>
    </section>
  );
}
