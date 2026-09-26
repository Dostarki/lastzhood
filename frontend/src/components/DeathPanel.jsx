import { Skull, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

export const DeathPanel = ({ me, onRespawn, onLeave }) => {
  if (me.hp > 0) return null;
  const remaining = Math.ceil(me.respawn_in || 0);
  return <div className="death-overlay" data-testid="death-overlay"><div className="death-content">
    <Skull size={44} strokeWidth={1} /><span className="eyebrow">SİNYAL KAYBOLDU</span><h1 data-testid="death-title">SON DURAK.</h1><p data-testid="death-killer">{me.killer} tarafından öldürüldün.</p>
    <div className="death-stats" data-testid="death-stats"><div><strong>{me.score}</strong><span>PUAN</span></div><div><strong>{me.kills}</strong><span>ENFEKTE</span></div><div><strong>{Math.floor(me.survived/60)}:{String(me.survived%60).padStart(2, '0')}</strong><span>HAYATTA KALMA</span></div></div>
    <Button className="start-button" data-testid="respawn-button" disabled={remaining > 0} onClick={onRespawn}><RotateCcw size={19} /><span data-testid="respawn-countdown">{remaining > 0 ? `YENİDEN DOĞ · ${remaining} sn` : 'YENİDEN DOĞ'}</span><ArrowRight size={19} /></Button>
    <button className="death-leave" data-testid="death-leave-button" onClick={onLeave}>LOBİYE DÖN</button>
  </div></div>;
};