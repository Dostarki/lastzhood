import { useState } from 'react';
import { ArrowRight, ChevronRight, Crosshair, ShieldAlert, UserRound, LoaderCircle } from 'lucide-react';
import { Button } from './ui/button';
import { SkinSelector } from './SkinSelector';
import { CharacterShowcase } from './CharacterShowcase';
export { WEAPONS } from '../game/config';

export const Lobby = ({ skin, setSkin, start, mode, ready, error }) => {
  const [name, setName] = useState(() => localStorage.getItem('deadzone-name') || 'Gezgin');
  const submit = e => { e.preventDefault(); localStorage.setItem('deadzone-name', name); start(name, 'glock18', skin); };
  return <section className="lobby" data-testid="lobby-panel">
    <div className="lobby-heading"><div className="eyebrow" data-testid="game-eyebrow"><span className="red-tick" /> WESTFALL <span className="eyebrow-slash">/</span> HAZIRLIK</div><h1 className="loadout-title" data-testid="game-title">KARAKTERİNİ HAZIRLA</h1></div>
    <form onSubmit={submit} className="loadout-form">
      <label className="section-label" htmlFor="nickname" data-testid="nickname-label"><span>01</span> ÇAĞRI ADIN</label>
      <div className="nickname-field"><UserRound size={16} /><input id="nickname" data-testid="nickname-input" autoComplete="nickname" minLength={2} maxLength={18} required value={name} onChange={e => setName(e.target.value)} placeholder="Çağrı adını gir" /><span className="field-status">HAZIR <i className="status-dot" /></span></div>
      <SkinSelector skin={skin} setSkin={setSkin} />
      <CharacterShowcase skin={skin} weapon="glock18" />
      <div className="friendly-warning" data-testid="friendly-fire-warning"><ShieldAlert size={15} /><span>Dost ateşi açık.</span><span>Kime güvendiğine dikkat et.</span></div>
      {error && <p className="form-error" role="alert" data-testid="connection-error">{error}</p>}
      <Button className="start-button" type="submit" data-testid="join-game-button" disabled={!ready || mode === 'connecting'}><span className="start-icon">{mode === 'connecting' ? <LoaderCircle className="spin" /> : <Crosshair />}</span><span className="start-copy">{mode === 'connecting' ? 'BAĞLANILIYOR' : 'OYUNA KATIL'}<small>WESTFALL–01</small></span><ArrowRight size={22} /></Button>
      <div className="lobby-under-button" data-testid="lobby-mode"><span className="status-dot" /> HERKES TEK <span>•</span> AÇIK DÜNYA <ChevronRight size={12} /></div>
    </form>
  </section>;
};