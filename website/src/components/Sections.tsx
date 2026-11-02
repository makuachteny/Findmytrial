import { CaretDown, CaretUp, Stethoscope, UserCircle, UsersThree } from '@phosphor-icons/react';
import { useId, useState } from 'react';
import carePhoto from '../assets/images/collage-care-team.jpg';
import coordinatorPhoto from '../assets/images/collage-coordinator-patient.jpg';
import commitmentPhotoLarge from '../assets/images/commitment-care-team-large.jpg';
import commitmentPhoto from '../assets/images/commitment-care-team.jpg';
import chartPhoto from '../assets/images/final-reviewing-chart.jpg';
import heroPhoto from '../assets/images/hero-patient-consultation.jpg';
import tabletPhoto from '../assets/images/reasons-physician-patient-tablet.jpg';
import { REASONS, STAGES, WAITING_POINTS } from '../data/content';
import { signInAs } from '../lib/links';

const FIND_A_TRIAL = signInAs('patient');

const ROLES = [
  {
    Icon: UserCircle,
    text: 'Patients search by condition, request screening and always see their next step',
  },
  {
    Icon: Stethoscope,
    text: "Physicians refer in a minute and watch every referral's status without a phone call",
  },
  {
    Icon: UsersThree,
    text: 'Research coordinators triage a queue, request documents and record decisions',
  },
];

function DashList({ items }: { items: string[] }) {
  return (
    <ul className="dash-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function Hero() {
  return (
    <section id="top" className="hero">
      <div className="hero__photo">
        <img
          src={heroPhoto}
          alt="A smiling patient in a peach sweater talks with a physician taking notes in a bright clinic."
          width="2000"
          height="1386"
          fetchPriority="high"
        />
      </div>
      <div className="hero__text">
        <p className="hero__trail">
          <span>Home</span>
          <span aria-hidden="true">›</span>
          <span>For patients</span>
          <span aria-hidden="true">›</span>
          <span className="hero__trail-current">Find My Trial</span>
        </p>
        <h1>
          Find a trial.
          <br />
          Track your referral.
          <br />
          Know your next step.
        </h1>
        <p className="hero__lead">
          Find My Trial helps patients discover clinical trials near them and gives patients,
          physicians and research coordinators one shared place to track a referral from first
          request to eligibility decision.
        </p>
      </div>
    </section>
  );
}

export function WhatIs() {
  return (
    <section id="what" className="what">
      <span className="what__ring what__ring--dashed" />
      <span className="what__ring what__ring--solid" />
      <svg className="what__steps" viewBox="0 0 32 12" fill="none" aria-hidden="true">
        <circle cx="3" cy="9" r="2.4" fill="#f6b98a" opacity=".5" />
        <circle cx="13" cy="7.5" r="3" fill="#f6b98a" opacity=".75" />
        <circle cx="25" cy="4.5" r="3.6" fill="#f6b98a" />
      </svg>
      <div className="what__inner">
        <h2>What is Find My Trial?</h2>
        <p>
          A referral to a clinical trial passes through many hands. Find My Trial keeps the
          patient, the referring physician and the research team looking at the same record, so
          nobody has to ask "where are we?"
        </p>
        <a className="button button--white" href={FIND_A_TRIAL}>
          Find a trial
        </a>
      </div>
    </section>
  );
}

export function Roles() {
  return (
    <section id="roles" className="wrap wrap--first roles">
      <h2>What Find My Trial does and why it matters</h2>
      <p className="roles__lead">
        Most trial searches end at a phone number. Find My Trial continues past that moment: a
        screening request becomes a shared referral with a visible status, a named next action and
        a single conversation thread.
      </p>
      <h3>Built for the three people in every referral:</h3>
      <div className="roles__grid">
        {ROLES.map(({ Icon, text }) => (
          <div key={text} className="roles__item">
            <Icon size={72} aria-hidden="true" />
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Reasons() {
  return (
    <section className="wrap">
      <h2 className="heading-gap">Reasons to track a referral in one shared workspace</h2>
      <div className="split">
        <img
          className="split__photo split__photo--short"
          src={tabletPhoto}
          alt="A smiling physician shows a patient something on a tablet across a desk."
          width="1600"
          height="1067"
          loading="lazy"
        />
        <div>
          <p className="split__intro">Everyone on the referral can:</p>
          <DashList items={REASONS} />
        </div>
      </div>
    </section>
  );
}

export function Collage() {
  return (
    <section className="wrap">
      <h2 className="heading-gap">Learn more about how a referral moves</h2>
      <div className="collage">
        <div className="collage__block">
          <h3>There is always a next step</h3>
          <p>
            A referral never sits in silence. Each stage names who acts next, and when a coordinator
            requests a document the patient sees it on their dashboard the same moment.
          </p>
          <a href={FIND_A_TRIAL}>Find a trial</a>
        </div>
        <img
          className="collage__photo collage__photo--tall"
          src={coordinatorPhoto}
          alt="A healthcare worker in scrubs shows a smiling woman something on a tablet."
          width="1600"
          height="2400"
          loading="lazy"
        />
        <img
          className="collage__photo collage__photo--wide"
          src={carePhoto}
          alt="A nurse and a physician talk in a hospital hallway while colleagues work behind them."
          width="1600"
          height="1067"
          loading="lazy"
        />
        <div className="collage__text">
          <h3>Screening is not a decision</h3>
          <p>
            Patients often hear "you've been scheduled" and assume they are in. Find My Trial labels
            screening as pending until the research team records an eligibility decision, and
            explains what each status means in plain language.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Stages() {
  const [open, setOpen] = useState(0);
  const baseId = useId();

  return (
    <section id="stages" className="wrap">
      <h2>The four stages of a referral</h2>
      <p className="stages__lead">
        Every referral in Find My Trial moves through the same four stages. The same tracker is
        shown to the patient, the physician and the coordinator.
      </p>
      <div className="stages">
        {STAGES.map((stage, index) => {
          const isOpen = open === index;
          const panelId = `${baseId}-${index}`;
          const Caret = isOpen ? CaretUp : CaretDown;
          return (
            <div key={stage.title} className="stage">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? -1 : index)}
                >
                  {stage.title}
                  <Caret size={22} aria-hidden="true" />
                </button>
              </h3>
              <div id={panelId} className="stage__panel" hidden={!isOpen}>
                <p>{stage.body}</p>
                <div className="stage__owner">
                  <strong>Who acts</strong>
                  {stage.owner}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Commitment({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  return (
    <section className="commitment">
      <img
        src={commitmentPhoto}
        srcSet={`${commitmentPhoto} 1600w, ${commitmentPhotoLarge} 2600w`}
        sizes="100vw"
        alt="A physician in a white coat talks with a nurse in blue scrubs."
        width="1600"
        height="1067"
        loading="lazy"
      />
      <div className="commitment__panel">
        <h2>We're committed to clarity at every step</h2>
        <p>
          Find My Trial shows what has happened, what is pending and who is responsible, so patients
          can make decisions with their care team, not in the dark.
        </p>
        <button className="button button--white" type="button" onClick={onSignIn}>
          {signedIn ? 'Go to your portal' : 'Sign in to your portal'}
        </button>
      </div>
    </section>
  );
}

export function Waiting() {
  return (
    <section className="wrap wrap--last">
      <div className="split">
        <img
          className="split__photo"
          src={chartPhoto}
          alt="A clinician and a patient go over a form on a clipboard, seen from the hands only."
          width="1600"
          height="900"
          loading="lazy"
        />
        <div>
          <h2 className="waiting__heading">
            Referrals take time. Waiting should not take guesswork.
          </h2>
          <DashList items={WAITING_POINTS} />
        </div>
      </div>
    </section>
  );
}
