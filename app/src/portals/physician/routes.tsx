import { ClipboardText, House, MagnifyingGlass } from '@phosphor-icons/react';
import type { RouteObject } from 'react-router-dom';
import { ReferralRoute } from '../../components/ReferralRoute';
import type { NavItem, PageTitle } from '../../components/Shell';
import { ReferralsPage } from './ReferralsPage';

export const physicianNav: NavItem[] = [
  { to: '/physician', label: 'Dashboard', icon: House, end: true },
  { to: '/physician/referrals', label: 'Referrals', icon: ClipboardText },
  { to: '/physician/trials', label: 'Find trials', icon: MagnifyingGlass },
];

const referralTitle: PageTitle = ({ id }) => `Referral ${id}`;

export const physicianRoutes: RouteObject[] = [
  { index: true, handle: { title: 'Dashboard' }, element: <ReferralsPage dashboard /> },
  { path: 'referrals', handle: { title: 'Referrals' }, element: <ReferralsPage /> },
  { path: 'referrals/:id', handle: { title: referralTitle }, element: <ReferralRoute /> },
];
