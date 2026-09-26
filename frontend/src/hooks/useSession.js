import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { audio } from '../game/audio';

export const API = process.env.REACT_APP_BACKEND_URL + '/api';
export function useSession(engineRef) {
  const [mode, setMode] = useState('lobby'), [state, setState] = useState(null), [ping, setPing] = useState(null), [error, setError] = useState('');
  const workerRef = useRef(null), interval = useRef(null), connecting = useRef(false);
  const teardown = useCallback(() => {
    audio.stopAutomatic();
    audio.stopEnemies();
    clearInterval(interval.current); connecting.current = false;
    if (engineRef.current) engineRef.current.publishInput = null;
    if (workerRef.current) { const old = workerRef.current; old.onmessage = null; old.postMessage({ type: 'disconnect' }); setTimeout(() => old.terminate(), 300); workerRef.current = null; }
  }, [engineRef]);
  const leave = useCallback(() => {
    teardown(); setMode('lobby'); setState(null); engineRef.current?.setMode('lobby', 'ak47');
  }, [teardown, engineRef]);
  useEffect(() => teardown, [teardown]);
  const start = async (name, weapon, skin = 'soldier') => {
    if (workerRef.current || connecting.current || !engineRef.current) return;
    connecting.current = true; setError(''); setPing(null); setMode('connecting');
    try {
      await audio.init(weapon);
      const response = await fetch(API+'/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, weapon, skin }) });
      const data = await response.json(); if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Çağrı adını kontrol et. 2–18 harf, rakam, boşluk, nokta veya tire kullan.');
      const url = new URL(process.env.REACT_APP_BACKEND_URL); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; url.pathname = '/api/ws/'+data.token;
      const worker = new Worker(new URL('../game/network.worker.js', import.meta.url)); workerRef.current = worker;
      let inputSeq = 0, lastUI = 0, uiEvents = [];
      const timeout = setTimeout(() => { if (connecting.current) { teardown(); setError('Sunucuya bağlantı zaman aşımına uğradı.'); setMode('lobby'); } }, 15000);
      worker.onmessage = ({ data: message }) => {
        if (message.type === 'open') {
          clearTimeout(timeout); connecting.current = false; engineRef.current?.setMode('playing', weapon, skin); setMode('playing');
          const send = () => {
            if (workerRef.current !== worker) return;
            const input = engineRef.current?.getInput() || { type: 'input', x: 0, z: 0, fire: false };
            input.seq = ++inputSeq;
            engineRef.current?.movement.noteInput(input, performance.now());
            worker.postMessage(input);
          };
          engineRef.current.publishInput = send; send(); interval.current = setInterval(send, 50);
        } else if (message.type === 'ping') setPing(message.value);
        else if (message.type === 'state') {
          engineRef.current?.receive(message);
          // HUD work stays at 10Hz; the renderer gets every available 20Hz state.
          uiEvents.push(...message.events); if (uiEvents.length > 256) uiEvents = uiEvents.slice(-256);
          if (performance.now() - lastUI >= 95) {
            setState({ ...message, events: uiEvents }); uiEvents = []; lastUI = performance.now();
          }
          audio.enemies(message);
          message.events.filter(e=>e.type==='boss_impact'||e.type==='boss_beam').slice(0,2).forEach(e=>audio.explosion(Math.hypot(e.x-message.me.x,e.z-message.me.z),e.x-message.me.x));
          message.events.forEach(e => {
            if (e.type === 'shot' && e.owner !== message.me.id) { const d=Math.hypot(e.x-message.me.x,e.z-message.me.z);audio.shot(e.weapon||'ak47',true,d,(e.x-message.me.x)/25); }
            if (e.type === 'explosion') audio.explosion(Math.hypot(e.x-message.me.x,e.z-message.me.z));
            if (e.type === 'supply' && e.owner === message.me.id) { audio.supply(); toast.success('İkmal alındı · Can ve mühimmat yenilendi', { id: 'supply' }); }
          });
          worker.postMessage({ type: 'state-consumed' });
        } else if (message.type === 'close' || message.type === 'error') {
          clearTimeout(timeout); teardown(); setError('Sunucu bağlantısı kesildi. Tekrar katılabilirsin.'); setMode('lobby'); setState(null); engineRef.current?.setMode('lobby', weapon, skin);
        }
      };
      worker.onerror = () => { clearTimeout(timeout); teardown(); setError('Online bağlantı başlatılamadı. Lütfen tekrar dene.'); setMode('lobby'); };
      worker.postMessage({ type: 'connect', url: url.toString() });
    } catch (e) { teardown(); setError(e.message); setMode('lobby'); }
  };
  const respawn = () => workerRef.current?.postMessage({ type: 'respawn' });
  return { mode, state, ping, error, start, leave, respawn };
}