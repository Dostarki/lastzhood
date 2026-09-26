import * as THREE from 'three';
import { makeChunk } from './environment';
import { createHuman, animateHuman, triggerHumanShot, disposeHuman } from './models';
import {MovementController} from './movement';
import {SceneEffects} from './effects';
import {WEAPON_MAP} from './config';
import {audio} from './audio';
import { createEnemy, animateEnemy } from './enemyModels';
import { SwarmEffects } from './swarmEffects';
import { RELOAD_DURATIONS } from './reloadAnimation';
import { BossScene } from './bossScene';

export class GameRenderer {
  constructor(container, world, onError) {
    this.container = container; this.world = world; this.mode = 'lobby'; this.entities = new Map(); this.chunks = new Map(); this.effects = []; this.corpses = []; this.state = null;
    this.keys = {}; this.pointer = new THREE.Vector2(0, 0); this.mouseDown = false; this.angle = 0; this.blocked = false;
    this.zoom = 24; this.targetZoom = 24; this.minZoom = 4; this.maxZoom = 40;
    this.movement=new MovementController();this.localPending=[];this.localAmmo=0;this.nextShot=0;this.localShots=0;this.localReloadUntil=0;
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this.aimPoint = new THREE.Vector3();
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#657367'); this.scene.fog = new THREE.Fog('#657367', 105, 220);
    this.fx=new SceneEffects(this.scene);
    this.swarmFx = new SwarmEffects(this.scene);
    this.bossScene = new BossScene(this.scene,this.fx);
    this.camera = new THREE.OrthographicCamera(-50, 50, 35, -35, .1, 350);
    this.focus = new THREE.Vector3(0, 0, 0); this.offset = new THREE.Vector3(58, 72, 58);
    try { this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { onError('Bu tarayıcıda 3D grafikler başlatılamadı. Donanım hızlandırmayı etkinleştir.'); throw e; }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25)); this.renderer.shadowMap.enabled = true;
    this.autoQuality = true; this.slowFrames = 0; this.pendingEvents = [];
    this.renderer.shadowMap.type = THREE.PCFShadowMap; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.16;
    this.renderer.domElement.setAttribute('data-testid', 'game-canvas'); this.renderer.domElement.setAttribute('aria-label', 'Westfall üç boyutlu oyun alanı'); container.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight('#e4ead6', '#4c5544', 2.05));
    this.sun = new THREE.DirectionalLight('#ffe4b5', 3.1); this.sun.position.set(-38, 70, 34); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); Object.assign(this.sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 180 });
    this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .1; this.sun.shadow.autoUpdate = false; this.shadowTime = 0; this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.player = createHuman(false, 0, 'ak47'); this.player.position.set(0, 0, 3); this.player.rotation.y = 1.6; this.scene.add(this.player);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.83, .9, 40), new THREE.MeshBasicMaterial({ color: '#cedaab', transparent: true, opacity: .75, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI/2; this.ring.position.y = .045; this.scene.add(this.ring);
    this.demoZombies = [];
    [[10, -4], [14, 2], [-8, -8], [0, 24], [6, 31], [-4, 39], [28, 3], [-14, 2], [37, 4]].forEach(([x, z], i) => {
      const g = createEnemy(['normal', 'normal', 'hellhound', 'hive', 'normal', 'armored', 'immolator', 'hellhound', 'normal'][i], i); g.position.set(x, 0, z); g.userData.base = new THREE.Vector3(x, 0, z); g.rotation.y = i*1.25; this.scene.add(g); this.demoZombies.push(g);
    });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(container); this.resize(); this.attachEvents(); this.updateChunks(0, 0);
    this.elapsed = 0; this.lastFrame = performance.now(); this.frame = requestAnimationFrame(() => this.animate());
  }
  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h); this.updateProjection();
  }
  updateProjection() {
    const w = this.container.clientWidth, h = this.container.clientHeight; if (!w || !h) return;
    const half = this.mode === 'lobby' ? 39 : this.zoom;
    this.camera.left = -half*w/h; this.camera.right = half*w/h; this.camera.top = half; this.camera.bottom = -half; this.camera.updateProjectionMatrix();
    this.renderer.domElement.dataset.cameraZoom = this.zoom.toFixed(2);
    this.renderer.domElement.dataset.zoomMin = this.minZoom;
    this.renderer.domElement.dataset.zoomMax = this.maxZoom;
  }
  attachEvents() {
    this.down = e => { if (this.mode !== 'playing' || this.blocked || /INPUT|TEXTAREA/.test(e.target.tagName)) return; if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); this.keys[e.code] = true; if(e.code==='KeyR')this.requestReload(); this.publishInput?.(); };
    this.up = e => { this.keys[e.code] = false; this.publishInput?.(); };
    this.mouse = e => { const r = this.container.getBoundingClientRect(); this.pointer.set((e.clientX-r.left)/r.width*2-1, -(e.clientY-r.top)/r.height*2+1); if (this.mode === 'playing' && !this.blocked) { this.ray.setFromCamera(this.pointer,this.camera); this.ray.ray.intersectPlane(this.plane,this.aimPoint); this.angle=Math.atan2(this.aimPoint.x-this.player.position.x,this.aimPoint.z-this.player.position.z); this.publishInput?.(); } };
    this.fire = e => { if (e.button === 0 && e.target === this.renderer.domElement) { this.mouseDown = true; this.publishInput?.(); this.tryLocalFire(performance.now()); } };
    this.release = () => { this.mouseDown = false; audio.stopAutomatic(); this.publishInput?.(); };
    this.blur = () => { this.keys = {}; this.mouseDown = false; this.touchMove = null; this.touchFire = false; audio.stopAutomatic(); this.publishInput?.(); };
    this.wheel = e => {
      if (this.mode !== 'playing' || this.blocked) return;
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 200 : 1);
      this.targetZoom = THREE.MathUtils.clamp(this.targetZoom * Math.exp(THREE.MathUtils.clamp(delta,-600,600)*.0015), this.minZoom, this.maxZoom);
      this.renderer.domElement.dataset.zoomTarget = this.targetZoom.toFixed(2);
    };
    window.addEventListener('keydown', this.down); window.addEventListener('keyup', this.up); window.addEventListener('pointermove', this.mouse);
    window.addEventListener('pointerdown', this.fire); window.addEventListener('pointerup', this.release); window.addEventListener('blur', this.blur);
    this.renderer.domElement.addEventListener('wheel', this.wheel, { passive: false });
  }
  setMode(mode, weapon, skin = this.skin || 'soldier') {
    this.mode = mode; this.keys = {}; this.mouseDown = false;
    this.movement.initialized=false;this.localPending=[];this.nextShot=0;this.localReloadUntil=0;audio.stopAutomatic();audio.stopEnemies();this.fx.clear();this.swarmFx.clear();this.bossScene.clear();
    this.demoZombies.forEach(z => { z.visible = mode === 'lobby'; });
    if (weapon !== this.weapon || skin !== this.skin) { disposeHuman(this.player); this.player = createHuman(false, 0, weapon, skin); this.scene.add(this.player); this.weapon = weapon; this.skin = skin; }
    this.scene.fog.color.set(mode === 'lobby' ? '#657367' : '#48564a'); this.scene.background.copy(this.scene.fog.color);
    this.resize();
    if (mode === 'lobby') { this.player.position.set(0, 0, 3); this.player.rotation.y = 1.6; this.entities.forEach(disposeHuman); this.entities.clear(); this.state = null; }
  }
  setBlocked(value) { this.blocked = value; if (value) this.blur(); }
  getInput(consume=true) {
    if (this.blocked || this.mode !== 'playing') return { type: 'input', x: 0, z: 0, angle: this.angle, fire: false };
    const k = this.keys;
    const horizontal = (k.KeyD || k.ArrowRight ? 1 : 0)-(k.KeyA || k.ArrowLeft ? 1 : 0);
    const vertical = (k.KeyS || k.ArrowDown ? 1 : 0)-(k.KeyW || k.ArrowUp ? 1 : 0);
    const touch = this.touchMove || { x: 0, y: 0 };
    const input = { type: 'input', x: (horizontal+vertical+touch.x+touch.y)*Math.SQRT1_2, z: (-horizontal+vertical-touch.x+touch.y)*Math.SQRT1_2, angle: this.angle, aim_distance:Math.hypot(this.aimPoint.x-this.player.position.x,this.aimPoint.z-this.player.position.z),fire: this.mouseDown || !!this.touchFire, sprint: !!(k.ShiftLeft||k.ShiftRight), reload: !!k.KeyR };
    if(consume)this.keys.KeyR = false; return input;
  }
  requestReload(){
    const me=this.state?.me,now=performance.now();
    if(!me||this.blocked||me.hp<=0||me.reloading||now<this.localReloadUntil||me.ammo>=WEAPON_MAP[this.weapon].mag||!me.reserve)return;
    this.localReloadUntil=now+RELOAD_DURATIONS[this.weapon]*1000;this.lastReloadSoundAt=now;audio.reload();audio.stopAutomatic();
  }
  tryLocalFire(now){
    if(this.mode!=='playing'||this.blocked||!this.state||this.state.me.hp<=0||this.state.me.reloading>0||now<this.localReloadUntil||now<this.nextShot||this.localAmmo<=0)return;
    const w=WEAPON_MAP[this.weapon];if(!w)return;this.nextShot=now+w.rate*1000;this.localPending.push(now);this.localAmmo--;this.localShots++;
    const x=this.player.position.x,z=this.player.position.z,dx=Math.sin(this.angle),dz=Math.cos(this.angle);
    let range=w.kind==='lava'?Math.min(w.range,Math.max(3,Math.hypot(this.aimPoint.x-x,this.aimPoint.z-z))):w.range;
    range=this.movement.rayDistance(x,z,dx,dz,range);
    for(const e of [...this.state.zombies,...this.state.players,...(this.state.bosses||[])]){const ex=e.x-x,ez=e.z-z,along=ex*dx+ez*dz;if(e.hp>0&&along>0&&along<range&&Math.abs(ex*dz-ez*dx)<(e.radius||.75))range=along;}
    this.fx.shot({kind:w.kind,x,z,tx:x+dx*range,tz:z+dz*range});triggerHumanShot(this.player);audio.shot(this.weapon);
    this.renderer.domElement.dataset.localShots=this.localShots;this.renderer.domElement.dataset.localAmmo=this.localAmmo;
  }
  receive(state) {
    this.pendingState = state;
    this.pendingEvents.push(...state.events); if (this.pendingEvents.length > 80) this.pendingEvents.splice(0, this.pendingEvents.length-80);
  }
  syncState(state) {
    const previous=this.state?.me;
    if(state.me.reloading>0&&!previous?.reloading&&performance.now()-(this.lastReloadSoundAt||0)>500){audio.reload();this.lastReloadSoundAt=performance.now();}
    if(previous?.reloading>0&&!state.me.reloading)this.localReloadUntil=0;
    if(!previous||previous.id!==state.me.id||state.me.ammo>previous.ammo)this.localPending=[];
    else if(state.me.ammo<previous.ammo)this.localPending.splice(0,previous.ammo-state.me.ammo);
    this.localPending=this.localPending.filter(t=>performance.now()-t<1500);
    this.localAmmo=Math.max(0,state.me.ammo-this.localPending.length);
    if(state.me.reloading>0||state.me.hp<=0||!state.me.ammo)audio.stopAutomatic();
    this.state = state;
    this.lastSnapshotAt=performance.now();this.fx.sync(state);this.swarmFx.sync(state);this.bossScene.sync(state);
    const wanted = new Set();
    [...state.zombies.map(e => ({ ...e, zombie: true })), ...state.players].forEach(e => {
      wanted.add(e.id); let g = this.entities.get(e.id);
      if (g && !e.zombie && (g.userData.skin !== (e.skin || 'soldier') || g.userData.weaponType !== e.weapon)) { disposeHuman(g); g = null; }
      if (!g) { g = e.zombie ? createEnemy(e.enemy_type, e.variant || 0) : createHuman(false, 0, e.weapon, e.skin); g.position.set(e.x, 0, e.z); this.scene.add(g); this.entities.set(e.id, g); }
      g.userData.target = e; g.visible = e.hp > 0;
    });
    this.entities.forEach((g, id) => { if (!wanted.has(id)) { disposeHuman(g); this.entities.delete(id); } });
    this.pendingEvents.forEach(event => { if (event.type === 'shot'&&event.owner!==state.me.id) { this.fx.shot(event); const actor = this.entities.get(event.owner); if (actor) triggerHumanShot(actor); } else if (event.type === 'kill') this.corpse(event); else if(event.type==='explosion')this.fx.explosion(event); else if(event.type==='enemy_attack' && this.entities.get(event.owner)?.visible) this.fx.shot(event); });
    this.pendingEvents.forEach(event=>this.bossScene.event(event));
    this.pendingEvents = [];
  }
  shot(e) {
    const points = [new THREE.Vector3(e.x, 1.35, e.z), new THREE.Vector3(e.tx, .9, e.tz)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#f2d591', transparent: true, opacity: .9 }));
    this.scene.add(line); this.effects.push({ obj: line, until: performance.now()+85 });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(.2, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffe8ae' }));
    flash.position.set(e.x+Math.sin(this.angle)*1.5, 1.4, e.z+Math.cos(this.angle)*1.5); this.scene.add(flash); this.effects.push({ obj: flash, until: performance.now()+60 });
    if (e.hit) {
      for (let i = 0; i < 3; i++) {
        const dot = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .12), new THREE.MeshBasicMaterial({ color: '#8c352e' }));
        dot.position.set(e.tx+(Math.random()-.5), .5+Math.random(), e.tz+(Math.random()-.5)); this.scene.add(dot); this.effects.push({ obj: dot, until: performance.now()+160 });
      }
    }
  }
  corpse(e) {
    if(e.boss_type)return;
    const g = e.zombie ? createEnemy(e.enemy_type, 1) : createHuman(false, 0, e.weapon, e.skin); g.position.set(e.x, .25, e.z); g.rotation.z = Math.PI/2; g.rotation.y = Math.random()*6;
    if (g.userData.flames) g.userData.flames.visible = false;
    this.scene.add(g); this.corpses.push(g); if (this.corpses.length > 20) disposeHuman(this.corpses.shift());
  }
  updateChunks(x, z) {
    const cx = Math.floor(x/80), cz = Math.floor(z/80), key = `${cx},${cz}`; if (key === this.chunkKey) return; this.chunkKey = key;
    const nearby = this.world.chunks.filter(c => Math.abs(c.x/80-cx) <= 1 && Math.abs(c.z/80-cz) <= 1);
    this.nearby=nearby;this.movement.load(nearby);
    const wanted = new Set(nearby.map(c => c.id));
    this.chunks.forEach((g, id) => { if (!wanted.has(id)) { this.scene.remove(g); g.traverse(o => o.geometry?.dispose()); this.chunks.delete(id); } });
    nearby.forEach(c => { if (!this.chunks.has(c.id)) { const group = makeChunk(c); this.chunks.set(c.id, group); this.scene.add(group); } });
  }
  animate() {
    if (this.disposed) return;
    const now = performance.now();
    if(this.mode!=='playing'&&now-this.lastFrame<160){this.frame=requestAnimationFrame(()=>this.animate());return;}
    const elapsed = now-this.lastFrame; const dt = Math.min(elapsed/1000, .1); this.lastFrame = now; this.elapsed += dt; const t = this.elapsed;
    if (this.pendingState) { this.syncState(this.pendingState); this.pendingState = null; }
    if (this.autoQuality && this.mode==='playing' && elapsed > 110) this.slowFrames++; else this.slowFrames = Math.max(0, this.slowFrames-1);
    if (this.autoQuality && this.slowFrames >= 3) {
      this.renderer.shadowMap.enabled = false; this.renderer.setPixelRatio(.65); this.resize(); this.autoQuality = false;
    }
    if (this.mode === 'playing' && Math.abs(this.zoom-this.targetZoom) > .005) {
      this.zoom = THREE.MathUtils.lerp(this.zoom, this.targetZoom, 1-Math.exp(-dt*12)); this.updateProjection();
    }
    if (this.mode === 'playing' && this.state) {
      const me = this.state.me,input=this.getInput(false);
      const predicted=this.movement.update(dt,input,me,(now-this.lastSnapshotAt)/1000);
      this.player.position.set(predicted.x,0,predicted.z);
      const moving=predicted.speed>.15;
      this.ray.setFromCamera(this.pointer, this.camera); this.ray.ray.intersectPlane(this.plane, this.aimPoint);
      const touchTargets=[...this.state.zombies,...(this.state.bosses||[]).filter(b=>b.alive&&Math.hypot(b.x-me.x,b.z-me.z)<70)];
      if (this.touchFire && touchTargets.length) {
        const target = touchTargets.reduce((a, b) => Math.hypot(a.x-me.x, a.z-me.z) < Math.hypot(b.x-me.x, b.z-me.z) ? a : b);
        this.angle = Math.atan2(target.x-me.x, target.z-me.z);
      } else this.angle = Math.atan2(this.aimPoint.x-this.player.position.x, this.aimPoint.z-this.player.position.z);
      if(input.fire)this.tryLocalFire(now);else audio.stopAutomatic();
      const firing = !this.blocked && me.hp > 0 && !me.reloading && now >= this.localReloadUntil && (now < this.nextShot || (input.fire && this.localAmmo > 0));
      if (!firing && (this.blocked || me.hp <= 0 || me.reloading)) { this.player.userData.shotHold = 0; this.player.userData.flashTime = 0; }
      const reloadRemaining=me.hp>0 ? (me.reloading || Math.max(0,(this.localReloadUntil-now)/1000)) : 0;
      this.player.rotation.y = this.angle; this.player.visible = me.hp > 0; animateHuman(this.player,t,moving,predicted.running,dt,Math.atan2(input.x,input.z)-this.angle,firing,reloadRemaining,me.reload_duration);
      this.focus.lerp(this.player.position.clone().add(new THREE.Vector3(0, .85, 0)), 1-Math.exp(-dt*24)); this.updateChunks(predicted.x,predicted.z);
      this.renderer.domElement.dataset.playerX = me.x; this.renderer.domElement.dataset.playerZ = me.z;
      this.renderer.domElement.dataset.playerWeapon = me.weapon;
      this.renderer.domElement.dataset.playerSkin = this.player.userData.skin;
      this.renderer.domElement.dataset.playerPose = this.player.userData.pose;
      this.renderer.domElement.dataset.gunPitch = this.player.userData.gun.rotation.x.toFixed(3);
      this.renderer.domElement.dataset.aimBlend = this.player.userData.aimBlend.toFixed(3);
      this.renderer.domElement.dataset.reloadProgress = (this.player.userData.reloadProgress || 0).toFixed(3);
      this.renderer.domElement.dataset.magazineOffset = this.player.userData.reloadPart?.position.length().toFixed(3) || '0';
      this.renderer.domElement.dataset.enemySounds = audio.creatures?.metrics.played || 0;
      this.renderer.domElement.dataset.lastEnemySound = audio.creatures?.metrics.last || '';
      this.renderer.domElement.dataset.swarmSound = audio.creatures?.metrics.swarm || false;
      this.renderer.domElement.dataset.enemyTypes = [...new Set(this.state.zombies.map(e => e.enemy_type))].join(',');
      this.renderer.domElement.dataset.swarmCount = this.state.swarms?.length || 0;
      this.renderer.domElement.dataset.bossCount = this.bossScene.models.size;
      this.renderer.domElement.dataset.bosses = JSON.stringify((this.state.bosses||[]).map(b=>({id:b.id,hp:b.hp,x:b.x,z:b.z,action:b.action})));
      this.renderer.domElement.dataset.remotePlayers = JSON.stringify([...this.entities.values()].filter(g => !g.userData.zombie).map(g => ({ id: g.userData.target.id, skin: g.userData.skin, pose: g.userData.pose })));
      this.renderer.domElement.dataset.predictedX=predicted.x.toFixed(2);this.renderer.domElement.dataset.predictedZ=predicted.z.toFixed(2);this.renderer.domElement.dataset.running=predicted.running;
      let inside='';this.chunks.forEach(chunk=>{(chunk.userData.buildings||[]).forEach(b=>{const h=b.userData.building,interior=Math.abs(predicted.x-h.x)<h.w/2-.25&&Math.abs(predicted.z-h.z)<h.d/2-.25;b.userData.cover.visible=!interior;if(interior)inside=h.name;});});this.renderer.domElement.dataset.interior=inside;
      this.entities.forEach(g => {
        const e = g.userData.target; if (!e) return; const next = new THREE.Vector3(e.x, 0, e.z); const move = g.position.distanceTo(next) > .02;
        g.position.lerp(next,1-Math.exp(-dt*14));const diff=Math.atan2(Math.sin(e.angle-g.rotation.y),Math.cos(e.angle-g.rotation.y));g.rotation.y+=diff*(1-Math.exp(-dt*18));
        if (g.userData.enemy) animateEnemy(g,t+e.x,move,dt,e); else animateHuman(g,t+e.x,move,e.running,dt,0,e.firing && e.hp > 0,e.reloading,e.reload_duration);
      });
    } else {
      // The lobby is a living, full-bleed view into the same procedural town.
      const desired = new THREE.Vector3(-17, 0, 19);
      this.focus.lerp(desired, Math.min(1, dt*3)); animateHuman(this.player,t,false,false,dt);
      this.demoZombies.forEach((g, i) => { const b = g.userData.base; g.position.set(b.x+Math.sin(t*.12+i)*1.6, 0, b.z+Math.cos(t*.12+i)*1.6); g.rotation.y = t*.12+i+Math.PI/2; animateEnemy(g, t+i, true, dt); });
      this.updateChunks(0, 0);
    }
    this.camera.position.copy(this.focus).add(this.offset); this.camera.lookAt(this.focus);
    this.sun.position.copy(this.focus).add(new THREE.Vector3(-38, 70, 34)); this.sun.target.position.copy(this.focus);
    if (now-this.shadowTime > 120) { this.sun.shadow.needsUpdate = true; this.shadowTime = now; }
    this.ring.position.x = this.player.position.x; this.ring.position.z = this.player.position.z; this.ring.visible = this.player.visible;
    this.fx.update(dt,t);
    this.swarmFx.update(dt,t);
    this.bossScene.update(dt,t);
    for (let i = this.effects.length-1; i >= 0; i--) if (performance.now() > this.effects[i].until) { const o = this.effects[i].obj; this.scene.remove(o); o.geometry.dispose(); o.material.dispose(); this.effects.splice(i, 1); }
    this.renderer.render(this.scene, this.camera);
    this.renderer.domElement.dataset.renderCalls = this.renderer.info.render.calls;
    this.renderer.domElement.dataset.renderTriangles = this.renderer.info.render.triangles;
    this.renderer.domElement.dataset.frameMs = Math.round(elapsed);
    this.frame = requestAnimationFrame(() => this.animate());
  }
  dispose() {
    audio.stopAutomatic();audio.stopEnemies();this.fx.clear();this.fx.streams.dispose();this.swarmFx.dispose();this.bossScene.dispose();
    this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect();
    window.removeEventListener('keydown', this.down); window.removeEventListener('keyup', this.up); window.removeEventListener('pointermove', this.mouse); window.removeEventListener('pointerdown', this.fire); window.removeEventListener('pointerup', this.release); window.removeEventListener('blur', this.blur);
    this.renderer.domElement.removeEventListener('wheel', this.wheel);
    disposeHuman(this.player); this.entities.forEach(disposeHuman); this.demoZombies.forEach(disposeHuman); this.corpses.forEach(disposeHuman);
    this.scene.traverse(o => o.geometry?.dispose()); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}