import { useState, useRef, useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { Biohazard, Settings2, Trophy, Volume2, VolumeX, Crosshair, ArrowUpRight, Radio, Maximize2, ShieldCheck } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { Lobby } from './components/Lobby';
import { HUD } from './components/HUD';
import { BossMap } from './components/BossMap';
import { BossHUD } from './components/BossHUD';
import { GamePanels } from './components/GamePanels';
import { StartScreen } from './components/StartScreen';
import AdminPage from './components/AdminPage';
import { Inventory } from './components/Inventory';
import { getSkin } from './game/skins';
import { GameRenderer } from './game/renderer';
import { audio } from './game/audio';
import { useSession, API } from './hooks/useSession';
import './App.css';

function GameApp() {
  const container = useRef(null), engine = useRef(null);
  const [ready, setReady] = useState(false), [worldError, setWorldError] = useState(''), [status, setStatus] = useState(null);
  const weapon = 'glock18';
  const [muted, setMuted] = useState(() => localStorage.getItem('deadzone-muted') === 'true');
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('deadzone-volume') || .35));
  const [quality, setQuality] = useState('auto');
  const [skin, setSkin] = useState(() => getSkin(localStorage.getItem('deadzone-skin')).id);
  const [bossMapOpen,setBossMapOpen]=useState(false),[trackedBoss,setTrackedBoss]=useState('boss-hansel');
  const location = useLocation(), navigate = useNavigate(), session = useSession(engine);
  const panel = location.pathname === '/leaderboard' ? 'leaderboard' : location.pathname === '/settings' ? 'settings' : null;
  const inGame = session.mode === 'playing';
  const returnPath = inGame ? '/play' : '/loadout';
  useEffect(() => {
    document.title = 'DEADZONE — Westfall'; document.documentElement.lang = 'tr';
    audio.preload().catch(()=>{});
    let active = true;
    fetch(API+'/world').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(world => {
      if (active && container.current) { engine.current = new GameRenderer(container.current, world, setWorldError); setReady(true); }
    }).catch(() => { if (active) setWorldError('Dünya yüklenemedi. Bağlantını kontrol edip tekrar dene.'); });
    const refresh = () => fetch(API+'/status').then(r => r.json()).then(s => { if (active) setStatus(s); }).catch(() => { if (active) setStatus(null); });
    refresh(); const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); engine.current?.dispose(); };
  }, []);
  useEffect(() => { audio.enabled = !muted; audio.volume = volume; audio.sync(); localStorage.setItem('deadzone-muted', muted); localStorage.setItem('deadzone-volume', volume); }, [muted, volume]);
  useEffect(() => { if (ready && !inGame) engine.current?.setMode('lobby', weapon, skin); }, [weapon, skin, ready, inGame]);
  useEffect(() => { localStorage.setItem('deadzone-skin', skin); }, [skin]);
  useEffect(() => { engine.current?.setBlocked(!!panel || bossMapOpen || inventoryOpen || session.state?.me.hp === 0); }, [panel, bossMapOpen, inventoryOpen, session.state?.me.hp]);
  useEffect(() => { if (!inGame || panel || session.state?.me.hp === 0) setInventoryOpen(false); }, [inGame, panel, session.state?.me.hp]);
  useEffect(()=>{if(!inGame||panel)setBossMapOpen(false);},[inGame,panel]);
  useEffect(() => {
    if (inGame && location.pathname === '/loadout') navigate('/play', { replace: true });
    if (!inGame && session.mode === 'lobby' && location.pathname === '/play') navigate('/loadout', { replace: true });
  }, [inGame, session.mode, location.pathname, navigate]);
  useEffect(() => {
    const handler = e => {
      if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === 'KeyI' && inGame && !panel && !bossMapOpen && session.state?.me.hp > 0 && !e.repeat) { e.preventDefault(); setInventoryOpen(open => !open); }
      if (e.code === 'Escape') {
        if (inventoryOpen || bossMapOpen) {
          e.preventDefault(); e.stopPropagation();
          if (inventoryOpen) setInventoryOpen(false); else setBossMapOpen(false);
          return;
        }
        if (!panel) { e.preventDefault(); navigate('/settings'); }
      }
      if (e.code === 'Tab' && inGame && !panel && !bossMapOpen && !inventoryOpen) { e.preventDefault(); navigate('/leaderboard'); }
    };
    window.addEventListener('keydown', handler, true); return () => window.removeEventListener('keydown', handler, true);
  }, [navigate, panel, inGame,bossMapOpen,inventoryOpen,session.state?.me.hp]);
  const setGraphics = value => {
    setQuality(value); if (engine.current) { engine.current.autoQuality = value === 'auto'; engine.current.qualityLevel = 0; engine.current.qualitySince = performance.now(); engine.current.frameAverage = 16; engine.current.renderer.setPixelRatio(value === 'high' ? Math.min(window.devicePixelRatio, 1.5) : value === 'auto' ? Math.min(window.devicePixelRatio, 1.25) : .65); engine.current.renderer.shadowMap.enabled = value !== 'low'; engine.current.resize(); }
  };
  const fullScreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setWorldError('Tam ekran bu tarayıcıda kullanılamıyor.'); } };
  return <main className={`deadzone-app ${inGame ? 'is-playing' : 'is-lobby'}`} data-testid="deadzone-app">
    <div ref={container} className="world-canvas" data-testid="world-container" />
    <div className="world-grade" /><div className="edge-vignette" />
    {!inGame && <>
      <div className="lobby-shade" />
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')} data-testid="brand-home" aria-label="Deadzone ana ekran"><span className="brand-icon"><Biohazard size={24} /></span><span>DEADZONE<span className="brand-period">®</span></span></button>
        <nav className="main-nav" aria-label="Ana menü">
          <button className={!panel ? 'active' : ''} onClick={() => navigate('/loadout')} data-testid="nav-play"><Crosshair size={14} /> KARAKTER</button>
          <button className={panel === 'leaderboard' ? 'active' : ''} onClick={() => navigate('/leaderboard')} data-testid="nav-leaderboard"><Trophy size={14} /> SIRALAMA</button>
          <button className={panel === 'settings' ? 'active' : ''} onClick={() => navigate('/settings')} data-testid="nav-settings"><Settings2 size={14} /> AYARLAR</button>
          <button onClick={() => navigate('/admin')} data-testid="nav-admin" title="Yönetim paneli" aria-label="Yönetim paneli"><ShieldCheck size={14} /> YÖNETİM</button>
        </nav>
        <div className="server-status" data-testid="server-status"><i className={status ? 'status-dot' : 'status-dot offline'} /><span>{status ? 'SUNUCU AKTİF' : 'BAĞLANIYOR'}<small>WESTFALL–01</small></span><Radio size={17} /></div>
      </header>
      <Lobby skin={skin} setSkin={setSkin} start={session.start} mode={session.mode} ready={ready} error={session.error || worldError} />
      <div className="world-bottom" data-testid="world-bottom"><span className="live-world-label"><i className="status-dot" /> WESTFALL–01</span><div className="population"><strong data-testid="online-count">{String(status?.online ?? 0).padStart(2, '0')}</strong><span>/ 200<small>HAYATTA KALAN</small></span></div><span className="online-separator" /><div className="world-detail"><Crosshair size={18} /><span>DOST ATEŞİ<small>AÇIK</small></span></div><ArrowUpRight className="world-arrow" size={26} /></div>
      <footer className="lobby-footer"><span data-testid="version-label">ERKEN ERİŞİM <b>ALPHA 0.1</b></span><span className="footer-message" data-testid="footer-message">HER HAYAT BİR HİKÂYE. HER MERMİ BİR KARAR.</span><div><button data-testid="sound-toggle" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'} title={muted ? 'Sesi aç' : 'Sesi kapat'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button><button data-testid="fullscreen-button" aria-label="Tam ekran" title="Tam ekran" onClick={fullScreen}><Maximize2 size={16} /></button></div></footer>
    </>}
    {inGame && <><HUD state={session.state} ping={session.ping} engine={engine} onInventory={()=>setInventoryOpen(true)} onBossMap={()=>setBossMapOpen(true)} onSettings={() => navigate('/settings')} onLeaderboard={() => navigate('/leaderboard')} onRespawn={session.respawn} onLeave={() => { session.leave(); navigate('/loadout'); }} muted={muted} toggleMuted={() => setMuted(!muted)} /><Inventory open={inventoryOpen} onOpenChange={setInventoryOpen} state={session.state} equip={session.equip}/><BossHUD state={session.state} selected={trackedBoss} openMap={()=>setBossMapOpen(true)}/><BossMap state={session.state} open={bossMapOpen} onOpenChange={setBossMapOpen} selected={trackedBoss} select={setTrackedBoss}/></>}
    {!ready && !worldError && <div className="world-loading" data-testid="world-loading"><span className="loading-ring" /><span>WESTFALL YÜKLENİYOR</span></div>}
    {worldError && !ready && <Button className="retry-world" data-testid="retry-world" onClick={() => window.location.reload()}>Tekrar dene</Button>}
    <GamePanels panel={panel} close={() => navigate(returnPath)} state={session.state} inGame={inGame} leave={() => { session.leave(); navigate('/loadout'); }} muted={muted} setMuted={setMuted} volume={volume} setVolume={setVolume} quality={quality} setQuality={setGraphics} />
    <Toaster theme="dark" position="top-center" richColors />
  </main>;
}
function AppRoutes() {
  const location = useLocation(), navigate = useNavigate();
  useEffect(() => { document.title = 'DEADZONE — Westfall'; document.documentElement.lang = 'tr'; }, []);
  if (location.pathname.startsWith('/admin')) return <AdminPage />;
  if (location.pathname === '/') return <StartScreen onStart={() => navigate('/loadout')} />;
  return <GameApp />;
}
export default function App() { return <BrowserRouter><AppRoutes /></BrowserRouter>; }