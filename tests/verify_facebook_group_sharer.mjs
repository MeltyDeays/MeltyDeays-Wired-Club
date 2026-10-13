import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Iniciando verificación del motor de auto-compartir en grupos de Facebook...');

const root = process.cwd();

// 1. Verificar content-script.js
const csPath = path.join(root, 'extensions', 'marketplace-sync', 'content-script.js');
const csCode = fs.readFileSync(csPath, 'utf8');
assert(csCode.includes('autoSelectAndShareGroups'), 'content-script.js debe incluir autoSelectAndShareGroups');
assert(csCode.includes('attachGroupSharerToDialog'), 'content-script.js debe incluir attachGroupSharerToDialog');
assert(csCode.includes('setupGroupSharingObserver'), 'content-script.js debe incluir setupGroupSharingObserver');
assert(csCode.includes('AUTO_SHARE_GROUPS'), 'content-script.js debe escuchar accion AUTO_SHARE_GROUPS');
assert(csCode.includes('haibane-btn-share-groups-wgt'), 'Widget flotante debe tener boton de compartir en grupos');
console.log('✅ 1. extensions/marketplace-sync/content-script.js verificado.');

// 2. Verificar popup.html
const popupHtmlPath = path.join(root, 'extensions', 'marketplace-sync', 'popup.html');
const popupHtml = fs.readFileSync(popupHtmlPath, 'utf8');
assert(popupHtml.includes('chk-group-auto'), 'popup.html debe tener checkbox chk-group-auto');
assert(popupHtml.includes('num-group-count'), 'popup.html debe tener input num-group-count');
assert(popupHtml.includes('txt-group-keywords'), 'popup.html debe tener input txt-group-keywords');
assert(popupHtml.includes('btn-save-group-settings'), 'popup.html debe tener boton btn-save-group-settings');
assert(popupHtml.includes('btn-share-groups-now'), 'popup.html debe tener boton btn-share-groups-now');
console.log('✅ 2. extensions/marketplace-sync/popup.html verificado.');

// 3. Verificar popup.js
const popupJsPath = path.join(root, 'extensions', 'marketplace-sync', 'popup.js');
const popupJs = fs.readFileSync(popupJsPath, 'utf8');
assert(popupJs.includes('groupShareCount'), 'popup.js debe gestionar groupShareCount');
assert(popupJs.includes('groupShareAuto'), 'popup.js debe gestionar groupShareAuto');
assert(popupJs.includes('btn-save-group-settings'), 'popup.js debe manejar guardado de preferencias');
assert(popupJs.includes('AUTO_SHARE_GROUPS'), 'popup.js debe despachar mensaje AUTO_SHARE_GROUPS');
console.log('✅ 3. extensions/marketplace-sync/popup.js verificado.');

// 4. Verificar cache busters en admin.html e index.html
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(adminHtml.includes('v=2.9.41'), 'admin.html debe tener cache buster v=2.9.41');
assert(indexHtml.includes('v=2.9.41'), 'index.html debe tener cache buster v=2.9.41');
console.log('✅ 4. Cache-busters v=2.9.41 verificados.');

console.log('\n🎉 TODAS LAS VERIFICACIONES DEL MOTOR DE AUTO-COMPARTIR EN GRUPOS PASARON (4/4).');
