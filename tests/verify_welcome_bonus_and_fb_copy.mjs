import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Iniciando verificación de Bono de Bienvenida ($5 en Puntos), Anti-Fraude de Dispositivo y Copy con Iconos...');

const root = process.cwd();

// 1. Verificar DeviceFingerprint.js
const dfPath = path.join(root, 'js', 'utils', 'DeviceFingerprint.js');
assert(fs.existsSync(dfPath), 'DeviceFingerprint.js debe existir');
const dfCode = fs.readFileSync(dfPath, 'utf8');
assert(dfCode.includes('class DeviceFingerprint'), 'DeviceFingerprint debe exportar la clase');
assert(dfCode.includes('getDeviceFingerprint'), 'Debe incluir getDeviceFingerprint');
assert(dfCode.includes('checkDeviceClaim'), 'Debe incluir checkDeviceClaim');
assert(dfCode.includes('recordDeviceClaim'), 'Debe incluir recordDeviceClaim');
assert(dfCode.includes('bonusPoints: 250'), 'Debe registrar 250 puntos de bono ($5 USD)');
console.log('✅ 1. js/utils/DeviceFingerprint.js verificado.');

// 2. Verificar CustomerViewModel.js
const vmPath = path.join(root, 'js', 'viewmodels', 'CustomerViewModel.js');
const vmCode = fs.readFileSync(vmPath, 'utf8');
assert(vmCode.includes('DeviceFingerprint'), 'CustomerViewModel debe importar DeviceFingerprint');
assert(vmCode.includes('awardWelcomeBonus ? 250 : 0'), 'CustomerViewModel debe asignar 250 puntos solo si no ha sido reclamado en el dispositivo');
assert(vmCode.includes('TX-WELCOME-'), 'Debe generar ledger entry para TX-WELCOME-');
assert(vmCode.includes('recordDeviceClaim'), 'Debe persistir la reclamación del dispositivo');
console.log('✅ 2. CustomerViewModel.js verificado (Bono de 250 WP y bloqueo multi-cuenta).');

// 3. Verificar CustomerAuthView.js
const authViewPath = path.join(root, 'js', 'views', 'customer', 'CustomerAuthView.js');
const authViewCode = fs.readFileSync(authViewPath, 'utf8');
assert(authViewCode.includes('_welcomeBonusAwarded'), 'CustomerAuthView debe verificar _welcomeBonusAwarded');
assert(authViewCode.includes('+250 WP ($5 USD en puntos)'), 'CustomerAuthView debe notificar sobre los +250 WP');
assert(authViewCode.includes('ya canjeado previamente en este dispositivo'), 'CustomerAuthView debe avisar si ya fue canjeado en el dispositivo');
console.log('✅ 3. CustomerAuthView.js verificado.');

// 4. Verificar index.html (Banner de bono en registro)
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(indexHtml.includes('¡Bono de Bienvenida: $5 USD en Puntos!'), 'index.html debe tener el banner del bono de bienvenida');
assert(indexHtml.includes('+250 WP'), 'index.html debe mencionar +250 WP');
assert(indexHtml.includes('v=2.9.41'), 'index.html debe estar en v=2.9.41');
console.log('✅ 4. index.html verificado.');

// 5. Verificar api/groq-copy.js
const groqCopyPath = path.join(root, 'api', 'groq-copy.js');
const groqCopyCode = fs.readFileSync(groqCopyPath, 'utf8');
assert(groqCopyCode.includes('5843-8412'), 'api/groq-copy.js debe incluir el teléfono 5843-8412');
assert(groqCopyCode.includes('GARANTÍA & RESPALDO'), 'api/groq-copy.js debe incluir Garantía y Respaldo');
assert(groqCopyCode.includes('THE WIRED CLUB'), 'api/groq-copy.js debe incluir The Wired Club');
assert(groqCopyCode.includes('$5 USD en puntos (250 WP)'), 'api/groq-copy.js debe explicar el bono de $5 en puntos');
assert(groqCopyCode.includes('PROHIBIDO TERMINANTEMENTE mencionar precios'), 'api/groq-copy.js debe prohibir precios en la descripción');
console.log('✅ 5. api/groq-copy.js verificado (Ficha con iconos, garantía, bono y teléfono sin precio repetido).');

// 6. Verificar js/services/GroqAiService.js
const groqSvcPath = path.join(root, 'js', 'services', 'GroqAiService.js');
const groqSvcCode = fs.readFileSync(groqSvcPath, 'utf8');
assert(groqSvcCode.includes('5843-8412'), 'GroqAiService.js debe incluir 5843-8412');
assert(groqSvcCode.includes('$5 USD en puntos (250 WP)'), 'GroqAiService.js debe incluir $5 en puntos (250 WP)');
assert(!groqSvcCode.includes('💵 Precio: $'), 'GroqAiService.js no debe incluir precios en la descripción');
console.log('✅ 6. js/services/GroqAiService.js verificado.');

// 7. Verificar extensions/marketplace-sync/content-script.js
const csPath = path.join(root, 'extensions', 'marketplace-sync', 'content-script.js');
const csCode = fs.readFileSync(csPath, 'utf8');
assert(csCode.includes('formatAiMarketplaceCopy'), 'content-script.js debe definir formatAiMarketplaceCopy');
assert(csCode.includes('5843-8412'), 'content-script.js debe incluir el teléfono 5843-8412');
assert(csCode.includes('$5 USD en puntos (250 WP)'), 'content-script.js debe incluir el bono en la descripción inyectada');
assert(csCode.includes('GARANTÍA & RESPALDO'), 'content-script.js debe incluir la garantía MeltyDeays');
assert(csCode.includes('formattedDesc'), 'content-script.js debe inyectar la descripción formateada');
console.log('✅ 7. extensions/marketplace-sync/content-script.js verificado.');

// 8. Verificar admin.html cache buster
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
assert(adminHtml.includes('v=2.9.41'), 'admin.html debe estar en v=2.9.41');
console.log('✅ 8. admin.html v=2.9.41 verificado.');

console.log('\n🎉 TODAS LAS VERIFICACIONES DEL BONO DE BIENVENIDA Y COPY CON IA PASARON (8/8).');
