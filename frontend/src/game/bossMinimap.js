export function drawBossMarkers(ctx,state){
  (state.bosses||[]).forEach((b,i)=>{
    if(!b.alive)return;
    const dx=b.x-state.me.x,dz=b.z-state.me.z;
    let x=(dx+dz)*Math.SQRT1_2*1.5,z=(-dx+dz)*Math.SQRT1_2*1.5;
    const shrink=Math.max(1,Math.abs(x)/66,Math.abs(z)/66);x=80+x/shrink;z=80+z/shrink;
    ctx.fillStyle=b.color;ctx.strokeStyle='#101912';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(x,z-7);ctx.lineTo(x+7,z);ctx.lineTo(x,z+7);ctx.lineTo(x-7,z);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#121a13';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),x,z+.5);
  });
}