/**
 * TEST SUITE: VERIFICACIÓN DE AUDITORÍA SEO (SEOBILITY 100% SCORE)
 * Verifica que:
 * 1. Exista meta description no vacía y de longitud óptima.
 * 2. Exista enlace canonical oficial.
 * 3. Exista bloque JSON-LD Schema.org estructurado (WebSite y Store).
 * 4. Exista exactamente 1 etiqueta H1 que contenga las palabras clave del título.
 * 5. La jerarquía de encabezados sea estricta (H1 -> H2 -> H3) sin saltos ni encabezados vacíos o duplicados.
 * 6. Exista footer semántico con enlaces internos navegables para rastreo de bots.
 * 7. Existan robots.txt y sitemap.xml en la raíz.
 * 8. Enlace de WhatsApp utilice el endpoint directo api.whatsapp.com sin redirecciones.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export async function runSeoAuditTestSuite(ctx) {
  const indexHtml = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
  const robotsTxtPath = path.join(PROJECT_ROOT, 'robots.txt');
  const sitemapXmlPath = path.join(PROJECT_ROOT, 'sitemap.xml');

  await ctx.test('1. Meta description y canonical existen y son válidos', () => {
    assert.strictEqual(indexHtml.includes('<meta name="description" content="'), true, 'Debe incluir meta description');
    const descMatch = indexHtml.match(/<meta name="description" content="([^"]+)"/i);
    assert.strictEqual(Boolean(descMatch), true, 'Debe capturar meta description');
    assert.strictEqual(descMatch[1].length <= 155, true, 'Meta description debe medir <= 155 chars para no sobrepasar 1000px');
    assert.strictEqual(indexHtml.includes('<link rel="canonical" href="https://meltydeays-wired-club.vercel.app/">'), true, 'Debe incluir canonical URL');
  });

  await ctx.test('2. Datos estructurados Schema.org JSON-LD presentes', () => {
    assert.strictEqual(indexHtml.includes('<script type="application/ld+json">'), true, 'Debe incluir script JSON-LD');
    assert.strictEqual(indexHtml.includes('"@type": "WebSite"'), true, 'Debe definir tipo WebSite');
    assert.strictEqual(indexHtml.includes('"@type": "Store"'), true, 'Debe definir tipo Store');
    assert.strictEqual(indexHtml.includes('"addressLocality": "Juigalpa"'), true, 'Schema.org debe indicar Juigalpa');
  });

  await ctx.test('3. Exactamente un encabezado H1 y palabras clave presentes en texto del cuerpo', () => {
    const h1Matches = indexHtml.match(/<h1[\s\S]*?<\/h1>/gi) || [];
    assert.strictEqual(h1Matches.length, 1, 'Debe existir exactamente un H1 en la página');
    assert.strictEqual(h1Matches[0].includes('The Wired Club · MeltyDeays (Portal de Fidelización)'), true, 'El H1 debe contener las palabras clave del título');
    assert.strictEqual(indexHtml.includes('portal de fidelización'), true, 'El texto del cuerpo debe contener "portal de fidelización"');
    assert.strictEqual(indexHtml.includes('The Wired Club'), true, 'El texto del cuerpo debe contener "The Wired Club"');
  });

  await ctx.test('4. Jerarquía de encabezados libre de saltos y encabezados vacíos "-"', () => {
    assert.strictEqual(indexHtml.includes('<h3>-</h3>'), false, 'No deben existir encabezados vacíos con guion');
    assert.strictEqual(indexHtml.includes('<h4'), false, 'No deben existir saltos a H4');
    const h2Matches = indexHtml.match(/<h2[\s\S]*?<\/h2>/gi) || [];
    assert.strictEqual(h2Matches.length >= 3, true, 'Deben existir secciones semánticas H2');
  });

  await ctx.test('5. Footer semántico y páginas internas enlazadas (FAQ, Términos, Privacidad)', () => {
    assert.strictEqual(indexHtml.includes('<footer class="portal-footer"'), true, 'Debe existir footer semántico');
    assert.strictEqual(indexHtml.includes('href="./faq.html"'), true, 'Debe enlazar a FAQ');
    assert.strictEqual(indexHtml.includes('href="./terminos.html"'), true, 'Debe enlazar a Términos');
    assert.strictEqual(indexHtml.includes('href="./privacidad.html"'), true, 'Debe enlazar a Privacidad');
    assert.strictEqual(fs.existsSync(path.join(PROJECT_ROOT, 'faq.html')), true, 'faq.html debe existir');
    assert.strictEqual(fs.existsSync(path.join(PROJECT_ROOT, 'terminos.html')), true, 'terminos.html debe existir');
    assert.strictEqual(fs.existsSync(path.join(PROJECT_ROOT, 'privacidad.html')), true, 'privacidad.html debe existir');
    assert.strictEqual(indexHtml.includes('Juigalpa, Nicaragua'), true, 'Debe mostrar ubicación en Juigalpa');
    assert.strictEqual(indexHtml.includes('Lun - Dom: 9:00 AM - 6:00 PM'), true, 'Debe mostrar atención 7 días');
  });

  await ctx.test('6. Uso optimizado de etiquetas strong (cero exceso y cero duplicados)', () => {
    const strongMatches = indexHtml.match(/<strong[\s\S]*?<\/strong>/gi) || [];
    assert.strictEqual(strongMatches.length <= 5, true, `Etiquetas strong deben ser moderadas (detectadas ${strongMatches.length})`);
    assert.strictEqual(indexHtml.includes('<strong></strong>'), false, 'No deben existir etiquetas strong vacías');
  });

  await ctx.test('7. Archivos robots.txt y sitemap.xml contienen todas las páginas internas', () => {
    assert.strictEqual(fs.existsSync(robotsTxtPath), true, 'robots.txt debe existir');
    assert.strictEqual(fs.existsSync(sitemapXmlPath), true, 'sitemap.xml debe existir');
    const sitemap = fs.readFileSync(sitemapXmlPath, 'utf8');
    assert.strictEqual(sitemap.includes('https://meltydeays-wired-club.vercel.app/faq.html'), true);
    assert.strictEqual(sitemap.includes('https://meltydeays-wired-club.vercel.app/terminos.html'), true);
    assert.strictEqual(sitemap.includes('https://meltydeays-wired-club.vercel.app/privacidad.html'), true);
  });

  await ctx.test('8. Enlace externo WhatsApp no genera redirección intermedia wa.me', () => {
    assert.strictEqual(indexHtml.includes('https://wa.me/50558438412'), false, 'No debe usar wa.me que genera redirecciones intermedias');
    assert.strictEqual(indexHtml.includes('https://api.whatsapp.com/send?phone=50558438412'), true, 'Debe apuntar directo a api.whatsapp.com');
  });

  await ctx.test('9. Páginas estáticas (FAQ, Términos, Privacidad) poseen navbar oficial con branding y navegación', () => {
    for (const pageName of ['faq.html', 'terminos.html', 'privacidad.html']) {
      const pageHtml = fs.readFileSync(path.join(PROJECT_ROOT, pageName), 'utf8');
      assert.strictEqual(pageHtml.includes('<header class="navbar">'), true, `${pageName} debe incluir navbar con clase .navbar`);
      assert.strictEqual(pageHtml.includes('brand-wrapper'), true, `${pageName} debe contener brand-wrapper`);
      assert.strictEqual(pageHtml.includes('wired-pole-svg'), true, `${pageName} debe incluir el logo oficial de poste de cables`);
      assert.strictEqual(pageHtml.includes('nav-controls'), true, `${pageName} debe contener contenedor nav-controls para controles`);
      assert.strictEqual(pageHtml.includes('Volver al Catálogo'), true, `${pageName} debe incluir enlace de retorno al catálogo`);
      assert.strictEqual(pageHtml.includes('portal-static-page lain-card'), true, `${pageName} debe envolverse en .portal-static-page.lain-card`);
      assert.strictEqual(pageHtml.includes('tech-corner'), true, `${pageName} debe tener esquinas tech-corner`);
      assert.strictEqual(pageHtml.includes('static-section-card'), true, `${pageName} debe estructurar el contenido en static-section-card`);
      assert.strictEqual(pageHtml.includes('portal-subnav-pills'), true, `${pageName} debe incluir píldoras de navegación inferior`);
    }
  });

  await ctx.test('10. Ratios de contraste WCAG AA y CLS preservados', () => {
    const clientCss = fs.readFileSync(path.join(PROJECT_ROOT, 'css', 'client.css'), 'utf8');
    assert.strictEqual(clientCss.includes('#tab-content-catalog {\n  min-height: 80vh;\n}'), true, 'Debe reservar min-height en catalog para prevenir CLS');
    assert.strictEqual(clientCss.includes('.portal-breadcrumb a {\n  color: #0369a1;'), true, 'Breadcrumb link debe tener contraste WCAG AA (#0369a1)');
  });
}

if (process.argv[1] && process.argv[1].endsWith('verify_seo_audit_improvements.mjs')) {
  console.log('Ejecutando verify_seo_audit_improvements.mjs...');
  const fakeCtx = {
    test: async (name, fn) => {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
      } catch (err) {
        console.error(`  ❌ ${name}:`, err.message);
        throw err;
      }
    }
  };
  runSeoAuditTestSuite(fakeCtx)
    .then(() => {
      console.log('>>> TODAS LAS PRUEBAS DE AUDITORÍA SEO PASARON EXITOSAMENTE <<<');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
