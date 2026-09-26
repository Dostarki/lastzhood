import { useEffect, useMemo, useState } from 'react';
import { Check, Crosshair, LoaderCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { WEAPONS } from '../game/config';
import { getWeaponPreviews } from '../game/weaponPreviews';
import './Inventory.css';

export const Inventory = ({ open, onOpenChange, state, equip }) => {
  const previews = useMemo(() => open ? getWeaponPreviews() : null, [open]);
  const [pending, setPending] = useState(null);
  const weapon = state?.me.weapon;
  useEffect(() => { setPending(null); }, [weapon, open]);
  useEffect(() => { if (!pending) return; const timer = setTimeout(() => setPending(null), 2500); return () => clearTimeout(timer); }, [pending]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="inventory-dialog" data-testid="inventory-dialog">
    <header className="inventory-heading"><span data-testid="inventory-eyebrow">WESTFALL / EKİPMAN</span><DialogTitle data-testid="inventory-title">ENVANTER</DialogTitle><DialogDescription className="sr-only">Silahlar ve kalan cephane</DialogDescription><span data-testid="inventory-weapon-total">{WEAPONS.length} SİLAH</span></header>
    <div className="inventory-grid">{WEAPONS.map(w => {
      const active = weapon === w.id, ammo = state?.me.inventory?.[w.id];
      return <button type="button" key={w.id} className={`inventory-weapon ${active ? 'equipped' : ''}`} data-testid={`inventory-equip-${w.id}`} aria-pressed={active} disabled={!!pending || active || state?.me.hp <= 0} onClick={() => { setPending(w.id); equip(w.id); }}>
        <span className="inventory-weapon-top"><strong data-testid={`inventory-name-${w.id}`}>{w.name}</strong>{active ? <Check size={16} /> : pending === w.id ? <LoaderCircle size={16} className="spin" /> : <Crosshair size={14} />}</span>
        <img src={previews?.[w.id]} alt={`${w.name} modeli`} data-testid={`inventory-image-${w.id}`} />
        <span className="inventory-weapon-type" data-testid={`inventory-type-${w.id}`}>{w.type}</span>
        <span className="inventory-ammo" data-testid={`inventory-ammo-${w.id}`}>{ammo?.ammo ?? '—'} <small>/ {ammo?.reserve ?? '—'}</small></span>
        <span className="inventory-weapon-meta" data-testid={`inventory-stats-${w.id}`}>{w.damage} HASAR · {w.range} m</span>
        <span className="inventory-equipped-label" data-testid={`inventory-status-${w.id}`}>{active ? 'ELİNDE' : pending === w.id ? 'KUŞANILIYOR' : 'KUŞAN'}</span>
      </button>;
    })}</div>
  </DialogContent></Dialog>;
};