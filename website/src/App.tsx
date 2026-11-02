import { useState } from 'react';
import { useSession } from './lib/session';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MenuOverlay } from './components/MenuOverlay';
import { PortalsOverlay } from './components/PortalsOverlay';
import { SearchOverlay } from './components/SearchOverlay';
import {
  Collage,
  Commitment,
  Hero,
  Reasons,
  Roles,
  Stages,
  WhatIs,
  Waiting,
} from './components/Sections';

type OverlayName = 'search' | 'portals' | 'menu' | null;

export function App() {
  const [overlay, setOverlay] = useState<OverlayName>(null);
  const session = useSession();
  const close = () => setOverlay(null);
  const openPortals = () => {
    if (session) window.location.assign(`/app/${session.role}`);
    else setOverlay('portals');
  };

  return (
    <>
      <Header
        signedIn={session !== null}
        onSearch={() => setOverlay('search')}
        onSignIn={openPortals}
        onMenu={() => setOverlay('menu')}
      />
      <main>
        <Hero />
        <WhatIs />
        <Roles />
        <Reasons />
        <Collage />
        <Stages />
        <Commitment signedIn={session !== null} onSignIn={openPortals} />
        <Waiting />
      </main>
      <Footer />
      {overlay === 'search' && <SearchOverlay onClose={close} />}
      {overlay === 'portals' && <PortalsOverlay onClose={close} />}
      {overlay === 'menu' && (
        <MenuOverlay signedIn={session !== null} onClose={close} onSignIn={openPortals} />
      )}
    </>
  );
}
