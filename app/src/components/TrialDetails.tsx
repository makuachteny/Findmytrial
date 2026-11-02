import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  Clock,
  Heart,
  Info,
  MapPin,
  Phone,
  User as UserIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatMiles, longDate, plural } from '../domain/format';
import { existingReferral, toggleSavedTrial } from '../domain/referrals';
import { isRegistryId } from '../domain/registry';
import type { Trial } from '../domain/types';
import { useAppState, useCurrentUser } from '../store/store';
import { ReferDialog } from '../portals/physician/ReferDialog';
import { ScreeningDialog } from '../portals/patient/ScreeningDialog';
import { useAct } from './act';
import { NotFound } from './NotFound';
import { Alert, TrialStatusBadge } from './ui';
import { useDataDate } from './useDataDate';
import { useTrial } from './useTrial';

function StudyContacts({ trial }: { trial: Trial }) {
  const contacts = trial.contacts ?? [];
  return (
    <>
      <div className="small-heading small-heading--flush">Contact the study team</div>
      {contacts.map((contact) => (
        <div key={`${contact.name}${contact.phone}${contact.email}`} className="study-contact">
          <div className="study-contact__name">{contact.name}</div>
          {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
        </div>
      ))}
      {contacts.length === 0 && <p className="meta-note">No contact is listed here. Check the full record.</p>}
      <a className="btn btn--primary btn--block btn--tall" href={trial.registryUrl ?? undefined} target="_blank" rel="noreferrer">
        View on ClinicalTrials.gov
        <ArrowSquareOut />
      </a>
    </>
  );
}

export function TrialDetails() {
  const { id } = useParams();
  const state = useAppState();
  const user = useCurrentUser();
  const lookup = useTrial(id);
  const dataDate = useDataDate(!!id && isRegistryId(id));
  const act = useAct();
  const navigate = useNavigate();
  const [modal, setModal] = useState<'screening' | 'refer' | null>(null);

  if (!lookup.trial) {
    if (lookup.status === 'loading') return <p className="muted">Loading this study from ClinicalTrials.gov…</p>;
    return (
      <NotFound
        back="../trials"
        title={
          lookup.status === 'failed'
            ? 'ClinicalTrials.gov could not be reached. Try again, or search the sample trials.'
            : 'This trial could not be found. Search the available trials instead.'
        }
      />
    );
  }

  const { trial } = lookup;
  const saved = !!user && (state.saved[user.id] ?? []).includes(trial.id);
  const existing = user?.role === 'patient' ? existingReferral(state, user.name, trial.id) : undefined;
  const portal = `/${user?.role}`;

  return (
    <section className="stack stack--24">
      <Link className="back-link" to={`${portal}/trials`}>
        <ArrowLeft />
        Back to results
      </Link>
      <div className="two-col two-col--trial">
        <div className="stack stack--24">
          <div>
            <div className="trial-head">
              <TrialStatusBadge status={trial.status} />
              <span className="eyebrow">
                {trial.condition} · {trial.phase} · {trial.id}
              </span>
            </div>
            <h1 className="page-title page-title--tight">{trial.title}</h1>
            <p className="lead">{trial.overview}</p>
          </div>
          {trial.registryUrl && (
            <Alert>
              {lookup.stale
                ? 'ClinicalTrials.gov could not be reached, so this saved copy may be out of date. '
                : trial.status === 'Recruiting'
                  ? ''
                  : `This study is listed as ${trial.status.toLowerCase()}, so it may not be accepting participants. `}
              This is a real study. Find My Trial can't send requests to its study team yet, so contact them directly.
            </Alert>
          )}
          <div className="card card--pad">
            <h2 className="section-title section-title--gap">Key screening criteria</h2>
            <ul className="criteria">
              {trial.criteria.map((criterion) => (
                <li key={criterion}>
                  <span />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
            {!!trial.exclusion?.length && (
              <>
                <h3 className="subsection-title">You may not be able to join if</h3>
                <ul className="criteria">
                  {trial.exclusion.map((criterion) => (
                    <li key={criterion}>
                      <span />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="meta-note meta-note--gap">
              {trial.registryUrl
                ? "From the study's record, reformatted into lists. The study team confirms eligibility with you."
                : 'This is a summary. The full list is reviewed with you by the research team.'}
            </p>
          </div>
          <div className="card card--pad">
            <h2 className="section-title section-title--gap">What to expect</h2>
            <div className="facts">
              {(
                trial.facts ?? [
                  { label: 'Duration', value: trial.duration },
                  { label: 'Visits', value: trial.visits },
                  { label: 'Screening visit', value: trial.screening },
                ]
              ).map((fact) => (
                <div key={fact.label}>
                  <div className="eyebrow">{fact.label}</div>
                  <div className="facts__value">{fact.value}</div>
                </div>
              ))}
            </div>
            <p className="body-note">{trial.expect}</p>
          </div>
        </div>
        <aside className="stack stack--16 sticky">
          <div className="card card--pad-sm stack stack--10">
            {trial.registryUrl && <StudyContacts trial={trial} />}
            {!trial.registryUrl && user?.role === 'patient' && (
              <button
                type="button"
                className="btn btn--primary btn--block btn--tall"
                onClick={() => (existing ? navigate(`${portal}/referrals/${existing.id}`) : setModal('screening'))}
              >
                {existing ? 'View your screening request' : 'Request screening'}
                <ArrowRight />
              </button>
            )}
            {!trial.registryUrl && user?.role === 'physician' && (
              <button type="button" className="btn btn--primary btn--block btn--tall" onClick={() => setModal('refer')}>
                Refer a patient
                <ArrowRight />
              </button>
            )}
            <button
              type="button"
              className="btn btn--outline btn--block btn--tall"
              aria-pressed={saved}
              onClick={() =>
                user && act((s) => toggleSavedTrial(s, user, trial), saved ? 'Trial removed from saved' : 'Trial saved')
              }
            >
              <Heart size={18} weight={saved ? 'fill' : 'regular'} />
              {saved ? 'Saved to your list' : 'Save trial'}
            </button>
            <div className="note">
              <Info size={18} />
              <span>
                {trial.registryUrl
                  ? 'The U.S. government does not review the safety or science of every listed study. Discuss the risks and benefits with your health care professional before joining.'
                  : 'Potential matches require eligibility review by the research team.'}
              </span>
            </div>
          </div>
          <div className="card card--pad-sm">
            <div className="small-heading">Research site</div>
            <div className="site-name">{trial.site}</div>
            <div className="site-address">{trial.address}</div>
            <div className="icon-list">
              {trial.distance !== null && (
                <div>
                  <MapPin />
                  {formatMiles(trial.distance, trial.distance === 1 ? 'mile' : 'miles')} from Boston
                </div>
              )}
              {trial.registryUrl ? (
                <>
                  {!!trial.moreSites && (
                    <div>
                      <MapPin />
                      {plural(trial.moreSites, 'more site')} on the full record
                    </div>
                  )}
                  {trial.sponsor && (
                    <div>
                      <UserIcon />
                      Sponsor: {trial.sponsor}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <UserIcon />
                    Coordinator: {trial.coordinator}
                  </div>
                  <div>
                    <Phone />
                    {trial.phone}
                  </div>
                  <div>
                    <Clock />
                    Mon–Fri, 8:00 AM–5:00 PM
                  </div>
                </>
              )}
            </div>
          </div>
          {trial.registryUrl && (
            <p className="meta-note meta-note--inset">
              Source: ClinicalTrials.gov{dataDate && `, data processed ${longDate(dataDate)}`}
              {trial.lastUpdated && `. Record last updated ${longDate(`${trial.lastUpdated}T12:00:00`)}`}. Find My Trial shows
              the site nearest Boston and reformats the criteria into lists.
            </p>
          )}
        </aside>
      </div>
      <ScreeningDialog open={modal === 'screening'} trial={trial} onClose={() => setModal(null)} />
      <ReferDialog open={modal === 'refer'} trialId={trial.id} onClose={() => setModal(null)} />
    </section>
  );
}
