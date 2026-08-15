/**
 * App — Top-level view router
 *
 * Two views: landing (editorial homepage) and studio (full NCA simulation).
 * Uses React state — no external router needed for a two-view app.
 */

import { useState, useCallback } from 'react';
import { LandingPage } from './components/LandingPage';
import { NCACanvas }   from './components/NCACanvas';
import './index.css';

type View = 'landing' | 'studio';

export default function App() {
  const [view, setView] = useState<View>('landing');

  const enterStudio  = useCallback(() => setView('studio'),  []);
  const returnToLanding = useCallback(() => setView('landing'), []);

  if (view === 'studio') {
    return <NCACanvas onBack={returnToLanding} />;
  }

  return <LandingPage onEnterStudio={enterStudio} />;
}
