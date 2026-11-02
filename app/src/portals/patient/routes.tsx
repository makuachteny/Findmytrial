import { ChatCircle, ClipboardText, House, MagnifyingGlass } from '@phosphor-icons/react';
import type { RouteObject } from 'react-router-dom';
import { ReferralRoute } from '../../components/ReferralRoute';
import type { NavItem, PageTitle } from '../../components/Shell';
import { Dashboard } from './Dashboard';
import { Conversation, Messages } from './Messages';
import { MyReferrals } from './MyReferrals';

export const patientNav: NavItem[] = [
  { to: '/patient', label: 'Dashboard', icon: House, end: true },
  { to: '/patient/trials', label: 'Find trials', icon: MagnifyingGlass },
  { to: '/patient/referrals', label: 'My referrals', icon: ClipboardText },
  { to: '/patient/messages', label: 'Messages', icon: ChatCircle },
];

const referralTitle: PageTitle = ({ id }) => `Referral ${id}`;

export const patientRoutes: RouteObject[] = [
  { index: true, handle: { title: 'Dashboard' }, element: <Dashboard /> },
  { path: 'referrals', handle: { title: 'My referrals' }, element: <MyReferrals /> },
  { path: 'referrals/:id', handle: { title: referralTitle }, element: <ReferralRoute /> },
  { path: 'messages', handle: { title: 'Messages' }, element: <Messages /> },
  { path: 'messages/:id', handle: { title: 'Messages' }, element: <Conversation /> },
];
