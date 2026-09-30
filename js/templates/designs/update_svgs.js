const fs = require('fs');
const file = 'c:\\\\Users\\\\everd\\\\Documents\\\\Antigravity\\\\Proyecto Ventas\\\\js\\\\templates\\\\designs\\\\series3Designs.js';
let content = fs.readFileSync(file, 'utf8');

const inserts = [
  // 1. COCOON
  `      <!-- Divine light rays -->\\n      <polygon points=\\"120,0 160,0 180,115 100,115\\" fill=\\"#fef3c7\\" opacity=\\"0.15\\"/>\\n      <line x1=\\"140\\" y1=\\"0\\" x2=\\"140\\" y2=\\"115\\" stroke=\\"#fef3c7\\" stroke-width=\\"2\\" opacity=\\"0.3\\"/>\\n      <!-- More falling feathers -->\\n      <path d=\\"M60,20 Q70,13 65,27 Q58,30 60,20 Z\\" fill=\\"#cbd5e1\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.6\\"/>\\n      <path d=\\"M220,25 Q230,18 225,32 Q218,35 220,25 Z\\" fill=\\"#cbd5e1\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.6\\"/>\\n      <path d=\\"M90,60 Q100,53 95,67 Q88,70 90,60 Z\\" fill=\\"#94a3b8\\" stroke=\\"#64748b\\" stroke-width=\\"0.6\\"/>\\n      <path d=\\"M170,75 Q180,68 175,82 Q168,85 170,75 Z\\" fill=\\"#cbd5e1\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.6\\"/>\\n      <path d=\\"M110,85 Q120,78 115,92 Q108,95 110,85 Z\\" fill=\\"#94a3b8\\" stroke=\\"#64748b\\" stroke-width=\\"0.6\\"/>\\n`,
  // 2. ASH WINGS
  `      <!-- Extra veins and blood drops -->\\n      <path d=\\"M85,45 C95,42 105,48 115,48\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.5\\" fill=\\"none\\"/>\\n      <path d=\\"M195,45 C185,42 175,48 165,48\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.5\\" fill=\\"none\\"/>\\n      <path d=\\"M100,65 C110,68 120,62 125,62\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.5\\" fill=\\"none\\"/>\\n      <path d=\\"M180,65 C170,68 160,62 155,62\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.5\\" fill=\\"none\\"/>\\n      <circle cx=\\"128\\" cy=\\"78\\" r=\\"1.2\\" fill=\\"#dc2626\\"/>\\n      <circle cx=\\"152\\" cy=\\"78\\" r=\\"1.2\\" fill=\\"#dc2626\\"/>\\n      <circle cx=\\"136\\" cy=\\"85\\" r=\\"1.5\\" fill=\\"#dc2626\\"/>\\n`,
  // 3. BRASS HALO
  `      <!-- Extra heat and vapor -->\\n      <path d=\\"M130,35 Q135,25 140,30 T145,20\\" fill=\\"none\\" stroke=\\"#fde68a\\" stroke-width=\\"1.2\\" opacity=\\"0.6\\"/>\\n      <path d=\\"M150,38 Q155,28 145,25\\" fill=\\"none\\" stroke=\\"#fde68a\\" stroke-width=\\"1\\" opacity=\\"0.5\\"/>\\n      <circle cx=\\"125\\" cy=\\"32\\" r=\\"1.2\\" fill=\\"#f59e0b\\"/>\\n      <circle cx=\\"155\\" cy=\\"35\\" r=\\"1.8\\" fill=\\"#f59e0b\\"/>\\n      <circle cx=\\"145\\" cy=\\"28\\" r=\\"1.5\\" fill=\\"#d97706\\"/>\\n`,
  // 4. OLD HOME
  `      <!-- Extra ivy and dust motes -->\\n      <path d=\\"M140,26 C145,35 138,45 142,55\\" fill=\\"none\\" stroke=\\"#047857\\" stroke-width=\\"1\\" opacity=\\"0.8\\"/>\\n      <circle cx=\\"141\\" cy=\\"30\\" r=\\"1.5\\" fill=\\"#059669\\"/>\\n      <circle cx=\\"139\\" cy=\\"40\\" r=\\"1.5\\" fill=\\"#047857\\"/>\\n      <circle cx=\\"143\\" cy=\\"50\\" r=\\"1.2\\" fill=\\"#059669\\"/>\\n      <circle cx=\\"105\\" cy=\\"50\\" r=\\"1.5\\" fill=\\"#f59e0b\\" opacity=\\"0.8\\"/>\\n      <circle cx=\\"165\\" cy=\\"35\\" r=\\"1.2\\" fill=\\"#fbbf24\\" opacity=\\"0.9\\"/>\\n      <circle cx=\\"120\\" cy=\\"80\\" r=\\"1.8\\" fill=\\"#d97706\\" opacity=\\"0.7\\"/>\\n`,
  // 5. WINDMILL
  `      <!-- Clouds and moving grass -->\\n      <path d=\\"M30,15 Q40,10 50,15 Q60,10 65,20 Q45,25 30,15 Z\\" fill=\\"#f8fafc\\" opacity=\\"0.7\\"/>\\n      <path d=\\"M220,18 Q230,12 245,18 Q255,15 260,25 Q235,30 220,18 Z\\" fill=\\"#f8fafc\\" opacity=\\"0.6\\"/>\\n      <path d=\\"M40,105 Q45,95 50,105\\" fill=\\"none\\" stroke=\\"#047857\\" stroke-width=\\"1\\"/>\\n      <path d=\\"M80,102 Q85,92 90,102\\" fill=\\"none\\" stroke=\\"#047857\\" stroke-width=\\"1\\"/>\\n      <path d=\\"M200,104 Q205,94 210,104\\" fill=\\"none\\" stroke=\\"#047857\\" stroke-width=\\"1\\"/>\\n      <path d=\\"M240,101 Q245,91 250,101\\" fill=\\"none\\" stroke=\\"#047857\\" stroke-width=\\"1\\"/>\\n`,
  // 6. WALL
  `      <!-- Wall cracks and lichen -->\\n      <path d=\\"M140,43 L135,55 L142,65 L138,75\\" fill=\\"none\\" stroke=\\"#475569\\" stroke-width=\\"1\\"/>\\n      <path d=\\"M220,50 L215,60 L218,65\\" fill=\\"none\\" stroke=\\"#475569\\" stroke-width=\\"0.8\\"/>\\n      <circle cx=\\"100\\" cy=\\"55\\" r=\\"2\\" fill=\\"#65a30d\\" opacity=\\"0.6\\"/>\\n      <circle cx=\\"180\\" cy=\\"58\\" r=\\"2.5\\" fill=\\"#65a30d\\" opacity=\\"0.5\\"/>\\n      <circle cx=\\"230\\" cy=\\"62\\" r=\\"1.8\\" fill=\\"#65a30d\\" opacity=\\"0.6\\"/>\\n`,
  // 7. COMMUNICATOR
  `      <!-- Sound waves emanating from hands -->\\n      <path d=\\"M90,40 A30,30 0 0,1 110,25\\" fill=\\"none\\" stroke=\\"#fcd34d\\" stroke-width=\\"1\\" opacity=\\"0.6\\"/>\\n      <path d=\\"M190,40 A30,30 0 0,0 170,25\\" fill=\\"none\\" stroke=\\"#fcd34d\\" stroke-width=\\"1\\" opacity=\\"0.6\\"/>\\n      <path d=\\"M75,35 A45,45 0 0,1 100,15\\" fill=\\"none\\" stroke=\\"#fde68a\\" stroke-width=\\"0.8\\" opacity=\\"0.4\\"/>\\n      <path d=\\"M205,35 A45,45 0 0,0 180,15\\" fill=\\"none\\" stroke=\\"#fde68a\\" stroke-width=\\"0.8\\" opacity=\\"0.4\\"/>\\n`,
  // 8. RAKKA
  `      <!-- More reaching arms and floating feathers -->\\n      <path d=\\"M100,105 C110,95 125,90 130,95\\" fill=\\"none\\" stroke=\\"#94a3b8\\" stroke-width=\\"1.5\\" stroke-linecap=\\"round\\"/>\\n      <path d=\\"M180,105 C170,95 155,90 150,95\\" fill=\\"none\\" stroke=\\"#94a3b8\\" stroke-width=\\"1.5\\" stroke-linecap=\\"round\\"/>\\n      <ellipse cx=\\"100\\" cy=\\"35\\" rx=\\"8\\" ry=\\"2\\" transform=\\"rotate(-20 100 35)\\" fill=\\"#cbd5e1\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.6\\"/>\\n      <ellipse cx=\\"180\\" cy=\\"45\\" rx=\\"8\\" ry=\\"2\\" transform=\\"rotate(40 180 45)\\" fill=\\"#cbd5e1\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.6\\"/>\\n`,
  // 9. REKI STONE FLUTE
  `      <!-- More pebbles and melodic smoke -->\\n      <path d=\\"M215,35 C210,25 220,15 215,5\\" fill=\\"none\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.8\\" opacity=\\"0.7\\"/>\\n      <path d=\\"M235,40 C245,30 235,20 245,10\\" fill=\\"none\\" stroke=\\"#94a3b8\\" stroke-width=\\"0.8\\" opacity=\\"0.5\\"/>\\n      <circle cx=\\"105\\" cy=\\"82\\" r=\\"2\\" fill=\\"#cbd5e1\\"/>\\n      <circle cx=\\"165\\" cy=\\"88\\" r=\\"2.5\\" fill=\\"#94a3b8\\"/>\\n      <circle cx=\\"185\\" cy=\\"84\\" r=\\"1.5\\" fill=\\"#64748b\\"/>\\n`,
  // 10. KUU CAFÉ
  `      <!-- Extra steam, cup detail, and petals -->\\n      <path d=\\"M115,45 Q110,35 118,25 T115,10\\" fill=\\"none\\" stroke=\\"#cbd5e1\\" stroke-width=\\"0.8\\" opacity=\\"0.6\\"/>\\n      <path d=\\"M165,48 Q170,38 162,28 T165,15\\" fill=\\"none\\" stroke=\\"#cbd5e1\\" stroke-width=\\"0.8\\" opacity=\\"0.6\\"/>\\n      <path d=\\"M125,60 C135,65 145,65 155,60\\" fill=\\"none\\" stroke=\\"#d97706\\" stroke-width=\\"1\\" opacity=\\"0.5\\"/>\\n      <path d=\\"M100,50 Q105,45 102,40 Q97,45 100,50 Z\\" fill=\\"#fef3c7\\" stroke=\\"#d97706\\" stroke-width=\\"0.5\\"/>\\n      <path d=\\"M180,65 Q185,60 182,55 Q177,60 180,65 Z\\" fill=\\"#fef3c7\\" stroke=\\"#d97706\\" stroke-width=\\"0.5\\"/>\\n`
];

let target = /      <text x=\\"140\\" y=\\"108\\" font-family=\\"'JetBrains Mono', monospace\\"/g;

let count = 0;
content = content.replace(target, (match) => {
  if (count < 10) {
    let result = inserts[count] + match;
    count++;
    return result;
  }
  return match;
});

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced', count, 'instances');
