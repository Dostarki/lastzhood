import * as THREE from 'three';

export function nameLabel(group, name, id) {
  if (group.userData.labelName === name) return;
  const previous = group.userData.nameLabel;
  if (previous) { previous.material.map.dispose(); previous.material.dispose(); previous.removeFromParent(); }
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.font = '600 34px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const width = Math.min(490, ctx.measureText(name).width+40);
  ctx.fillStyle = 'rgba(10,18,13,.8)'; ctx.fillRect((512-width)/2, 15, width, 65);
  ctx.fillStyle = '#eef4dc'; ctx.fillText(name, 256, 48, 464);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false }));
  sprite.position.y = 3; sprite.scale.set(5, .94, 1); sprite.userData.nameLabel = true;
  sprite.userData.testId = `player-name-label-${id}`;
  group.add(sprite); group.userData.nameLabel = sprite; group.userData.labelName = name;
}