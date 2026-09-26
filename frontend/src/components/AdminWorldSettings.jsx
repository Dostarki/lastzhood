import { Power, Sun, Moon, Bug } from 'lucide-react';
import { BOSS_ICONS } from './BossMap';

const BOSSES = [
  { id: 'hansel', name: 'HANSEL', detail: 'Mekanik Yıkım', color: '#f3ae52' },
  { id: 'symbiote', name: 'KIZIL VENOM', detail: 'Simbiyot Dev', color: '#eb6c80' },
  { id: 'xenomorph', name: 'XENOMORPH', detail: 'Kovanın Hükümdarı', color: '#94d6bf' },
  { id: 'ash_titan', name: 'KÜL TİTANI', detail: 'Yeraltı Öfkesi', color: '#f88b5c' },
];

export const AdminWorldSettings = ({ settings, save, busy }) => <>
  <section className="admin-section" data-testid="admin-boss-section">
    <div className="admin-section-heading"><span>01 / TEHDİTLER</span><h2 data-testid="admin-boss-heading">BOSS KONTROLÜ</h2></div>
    <div className="admin-boss-grid">{BOSSES.map(b => {
      const Icon = BOSS_ICONS[b.id], enabled = settings.bosses[b.id];
      return <article className="admin-boss" key={b.id} style={{ '--boss-accent': b.color }} data-testid={`admin-boss-${b.id}`}>
        <Icon size={30} strokeWidth={1.3} /><h3 data-testid={`admin-boss-name-${b.id}`}>{b.name}</h3><p data-testid={`admin-boss-detail-${b.id}`}>{b.detail}</p>
        <button type="button" className={enabled ? 'boss-power enabled' : 'boss-power'} disabled={busy} aria-pressed={enabled} aria-label={`${b.name} ${enabled ? 'pasifleştir' : 'aktifleştir'}`} data-testid={`admin-boss-toggle-${b.id}`} onClick={() => save({ ...settings, bosses: { ...settings.bosses, [b.id]: !enabled } })}><Power size={15} /><span>{enabled ? 'AKTİF' : 'PASİF'}</span></button>
      </article>;
    })}</div>
  </section>
  <section className="admin-section" data-testid="admin-world-section">
    <div className="admin-section-heading"><span>02 / DÜNYA</span><h2 data-testid="admin-world-heading">ORTAM AYARLARI</h2></div>
    <div className="admin-world-row"><div><span className="admin-field-label" data-testid="admin-time-label">GÜNÜN SAATİ</span><div className="admin-time-options" role="group" aria-label="Günün saati">{[['day', 'Gündüz', Sun], ['night', 'Gece', Moon]].map(([value, label, Icon]) => <button key={value} type="button" data-testid={`admin-time-${value}`} aria-pressed={settings.time_of_day === value} disabled={busy} onClick={() => save({ ...settings, time_of_day: value })}><Icon size={18} />{label}</button>)}</div></div>
      <label className="admin-density"><span className="admin-field-label" data-testid="admin-density-label"><Bug size={14} /> ZOMBİ YOĞUNLUĞU</span><select value={settings.zombie_density} disabled={busy} data-testid="admin-zombie-density" onChange={e => save({ ...settings, zombie_density: e.target.value })}><option value="off">Kapalı</option><option value="low">Az</option><option value="normal">Normal</option><option value="high">Yoğun</option></select></label>
    </div>
  </section>
</>;