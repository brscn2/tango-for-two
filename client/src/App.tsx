import { useEffect } from 'react';
import { useStore } from './lib/store';
import { Landing } from './pages/Landing';
import { Game } from './pages/Game';

export default function App() {
  const { connect, code } = useStore();
  useEffect(() => { connect(); }, [connect]);
  return code ? <Game /> : <Landing />;
}
