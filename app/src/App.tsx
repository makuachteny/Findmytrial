import { CheckCircle } from '@phosphor-icons/react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, type RouteObject } from 'react-router-dom';
import { ToastProvider } from './components/act';
import { FindTrials } from './components/FindTrials';
import { NotFound } from './components/NotFound';
import { Shell, type NavItem } from './components/Shell';
import { SignIn } from './components/SignIn';
import { TrialDetails } from './components/TrialDetails';
import type { Role } from './domain/types';
import { coordinatorNav, coordinatorRoutes } from './portals/coordinator/routes';
import { patientNav, patientRoutes } from './portals/patient/routes';
import { physicianNav, physicianRoutes } from './portals/physician/routes';
import { useCurrentUser } from './store/store';

function Portal({ role, nav }: { role: Role; nav: NavItem[] }) {
  const user = useCurrentUser();
  if (!user) return <Navigate to={`/signin?role=${role}`} replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return (
    <Shell user={user} nav={nav}>
      <Outlet />
    </Shell>
  );
}

function Home() {
  const user = useCurrentUser();
  return <Navigate to={user ? `/${user.role}` : '/signin'} replace />;
}

const trialRoutes: RouteObject[] = [
  { path: 'trials', handle: { title: 'Find trials' }, element: <FindTrials /> },
  { path: 'trials/:id', handle: { title: 'Trial details' }, element: <TrialDetails /> },
];

const portal = (role: Role, nav: NavItem[], routes: RouteObject[]): RouteObject => ({
  path: role,
  element: <Portal role={role} nav={nav} />,
  children: [...routes, ...trialRoutes],
});

const router = createBrowserRouter(
  [
    { path: '/', element: <Home /> },
    { path: '/signin', element: <SignIn /> },
    portal('patient', patientNav, patientRoutes),
    portal('physician', physicianNav, physicianRoutes),
    portal('coordinator', coordinatorNav, coordinatorRoutes),
    { path: '*', element: <NotFound /> },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
);

export function App() {
  return (
    <ToastProvider icon={<CheckCircle size={18} />}>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
