import {
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  XLogo,
  YoutubeLogo,
} from '@phosphor-icons/react';
import { FOOTER_COLUMNS, LEGAL_LINKS } from '../data/content';
import { PLACEHOLDER_LINK } from '../lib/links';

const SOCIAL_LINKS = [
  { label: 'X', Icon: XLogo },
  { label: 'Facebook', Icon: FacebookLogo },
  { label: 'LinkedIn', Icon: LinkedinLogo },
  { label: 'Instagram', Icon: InstagramLogo },
  { label: 'YouTube', Icon: YoutubeLogo },
];

export function Footer() {
  return (
    <footer>
      <div className="connect">
        <div className="connect__inner">
          <h2>Connect with us</h2>
          <div className="connect__links">
            {SOCIAL_LINKS.map(({ label, Icon }) => (
              <a key={label} href={PLACEHOLDER_LINK} aria-label={label}>
                <Icon aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer">
        <div className="footer__grid">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="footer__title">{column.title}</h2>
              <div className="footer__links">
                {column.links.map((link) => (
                  <div key={link.label}>
                    <a href={link.href}>{link.label}</a>
                    <p>{link.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="footer__legal">
          {LEGAL_LINKS.map((label) => (
            <a key={label} href={PLACEHOLDER_LINK}>
              {label}
            </a>
          ))}
          <span>
            © 2026 Find My Trial. Trial matches require eligibility review by the research team.
          </span>
        </div>
      </div>
    </footer>
  );
}
