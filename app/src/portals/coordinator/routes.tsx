import { House, MagnifyingGlass, Tray } from '@phosphor-icons/react';
import type { RouteObject } from 'react-router-dom';
import { ReferralRoute } from '../../components/ReferralRoute';
import type { NavItem, PageTitle } from '../../components/Shell';
import { QueuePage } from './QueuePage';
import { ReferralActions } from './ReferralActions';
import './coordinator.css';

export const coordinatorNav: NavItem[] = [
  { to: '/coordinator', label: 'Dashboard', icon: House, end: true },
  { to: '/coordinator/referrals', label: 'Referral queue', icon: Tray },
  { to: '/coordinator/trials', label: 'Find trials', icon: MagnifyingGlass },
];

const referralTitle: PageTitle = ({ id }) => `Referral ${id}`;

export const coordinatorRoutes: RouteObject[] = [
  { index: true, handle: { title: 'Dashboard' }, element: <QueuePage dashboard /> },
  { path: 'referrals', handle: { title: 'Referral queue' }, element: <QueuePage /> },
  {
    path: 'referrals/:id',
    handle: { title: referralTitle },
    element: <ReferralRoute actions={(referral) => <ReferralActions referral={referral} />} />,
  },
];
