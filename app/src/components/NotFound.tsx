import { Binoculars } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export function NotFound({ title = 'This page does not exist', back = '/' }: { title?: string; back?: string }) {
  return (
    <div className="empty empty--large">
      <Binoculars size={40} />
      <div className="empty__title">{title}</div>
      <Link className="btn btn--outline" to={back}>
        Go back
      </Link>
    </div>
  );
}
