import fs from 'fs';

const orchestratorId = '4b356532-f255-411d-b331-42b292feb64d';
const sentinelId = '6a10bf21-c580-475d-bf5d-97e8e6113b05';

function inspect() {
  console.log('=== INSPECCIÓN DE SUBAGENTES TEAMWORK PREVIEW ===\n');

  // 1. Check Sentinel
  const sentinelPath = `C:/Users/everd/.gemini/antigravity/brain/${sentinelId}/.system_generated/logs/transcript.jsonl`;
  if (fs.existsSync(sentinelPath)) {
    const lines = fs.readFileSync(sentinelPath, 'utf8').trim().split('\n');
    const last = JSON.parse(lines[lines.length - 1]);
    console.log(`[Sentinel: ${sentinelId}]`);
    console.log(`Total pasos: ${lines.length} | Último paso: ${last.type} (${last.status || 'N/A'})`);
    console.log(`Timestamp: ${last.created_at}`);
    if (last.content) console.log(`Mensaje: ${last.content.slice(0, 150)}...\n`);
  }

  // 2. Check Orchestrator
  const orchPath = `C:/Users/everd/.gemini/antigravity/brain/${orchestratorId}/.system_generated/logs/transcript.jsonl`;
  if (fs.existsSync(orchPath)) {
    const lines = fs.readFileSync(orchPath, 'utf8').trim().split('\n');
    const last = JSON.parse(lines[lines.length - 1]);
    console.log(`[Orchestrator: ${orchestratorId}]`);
    console.log(`Total pasos: ${lines.length} | Último paso: ${last.type} (${last.status || 'N/A'})`);
    console.log(`Timestamp: ${last.created_at}`);
    if (last.content) console.log(`Reporte final emitido: ${last.content.slice(0, 200)}...\n`);

    // Extract all child subagent IDs
    const text = fs.readFileSync(orchPath, 'utf8');
    const idRegex = /"conversationId":\s*"([a-f0-9-]+)"/g;
    const ids = new Set();
    let m;
    while ((m = idRegex.exec(text)) !== null) {
      ids.add(m[1]);
    }
    console.log(`Subagentes delegados por el orquestador (${ids.size}):`);
    for (const cid of ids) {
      const tp = `C:/Users/everd/.gemini/antigravity/brain/${cid}/.system_generated/logs/transcript.jsonl`;
      if (fs.existsSync(tp)) {
        const clines = fs.readFileSync(tp, 'utf8').trim().split('\n');
        const clast = JSON.parse(clines[clines.length - 1]);
        console.log(`  - Subagente [${cid}] | Pasos: ${clines.length} | Estado: ${clast.type} | Hora: ${clast.created_at}`);
      }
    }
  }
}

inspect();
