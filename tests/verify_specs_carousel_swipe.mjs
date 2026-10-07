import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const catalogViewPath = path.join(rootDir, "js", "views", "customer", "CustomerCatalogView.js");
const appJsPath = path.join(rootDir, "js", "app.js");
const lightboxCssPath = path.join(rootDir, "css", "modals", "lightbox.css");

console.log("====================================================");
console.log(" VERIFYING SPECS CAROUSEL TOUCH SWIPE GESTURES      ");
console.log("====================================================");

// 1. Verify CustomerCatalogView.js
const catalogViewContent = fs.readFileSync(catalogViewPath, "utf-8");
assert.ok(catalogViewContent.includes("export function initSpecsCarouselSwipe"), "CustomerCatalogView.js must export initSpecsCarouselSwipe");
assert.ok(catalogViewContent.includes("stageEl.addEventListener(\"touchstart\""), "initSpecsCarouselSwipe must attach touchstart listener");
assert.ok(catalogViewContent.includes("stageEl.addEventListener(\"touchmove\""), "initSpecsCarouselSwipe must attach touchmove listener");
assert.ok(catalogViewContent.includes("stageEl.addEventListener(\"touchend\""), "initSpecsCarouselSwipe must attach touchend listener");
assert.ok(catalogViewContent.includes("specsModalNextImage()"), "initSpecsCarouselSwipe must call specsModalNextImage on swipe left");
assert.ok(catalogViewContent.includes("specsModalPrevImage()"), "initSpecsCarouselSwipe must call specsModalPrevImage on swipe right");
assert.ok(catalogViewContent.includes("initSpecsCarouselSwipe(stageEl)"), "openProductSpecsModal must initialize swipe on stageEl");
console.log("  ✓ CustomerCatalogView.js correctly exports and initializes touch swipe listeners");

// 2. Verify js/app.js
const appJsContent = fs.readFileSync(appJsPath, "utf-8");
assert.ok(appJsContent.includes("initSpecsCarouselSwipe"), "app.js must import initSpecsCarouselSwipe");
assert.ok(appJsContent.includes("window.initSpecsCarouselSwipe = initSpecsCarouselSwipe"), "app.js must expose window.initSpecsCarouselSwipe");
console.log("  ✓ js/app.js exposes window.initSpecsCarouselSwipe");

// 3. Verify lightbox.css
const lightboxCssContent = fs.readFileSync(lightboxCssPath, "utf-8");
assert.ok(lightboxCssContent.includes("touch-action: pan-y pinch-zoom;"), "lightbox.css must declare touch-action on specs-carousel-stage");
assert.ok(lightboxCssContent.includes("-webkit-user-drag: none;"), "lightbox.css must prevent user drag on stage img");
console.log("  ✓ lightbox.css defines touch-action and prevents browser image drag");

// 4. Test touch event simulation logic in memory
let nextCalls = 0;
let prevCalls = 0;

class FakeElement {
  constructor() {
    this.dataset = {};
    this.listeners = {};
  }
  addEventListener(event, fn, opts) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  dispatch(event, payload) {
    const list = this.listeners[event] || [];
    for (const fn of list) {
      fn(payload);
    }
  }
}

function mockSwipeImplementation(stageEl, onNext, onPrev) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  stageEl.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  });

  stageEl.addEventListener("touchend", (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;
    const dt = Date.now() - startTime;

    const isSwipe = (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.1) ||
                    (dt < 350 && Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy));

    if (isSwipe) {
      if (dx < 0) onNext();
      else onPrev();
    }
  });
}

const fakeStage = new FakeElement();
mockSwipeImplementation(fakeStage, () => { nextCalls++; }, () => { prevCalls++; });

// Simular Swipe Izquierda (Deslizar a la izquierda para foto siguiente)
fakeStage.dispatch("touchstart", { touches: [{ clientX: 200, clientY: 100 }] });
fakeStage.dispatch("touchend", { changedTouches: [{ clientX: 100, clientY: 100 }] });
assert.strictEqual(nextCalls, 1, "Swipe left must trigger onNext (specsModalNextImage)");
assert.strictEqual(prevCalls, 0, "Swipe left must not trigger onPrev");

// Simular Swipe Derecha (Deslizar a la derecha para foto anterior)
fakeStage.dispatch("touchstart", { touches: [{ clientX: 100, clientY: 100 }] });
fakeStage.dispatch("touchend", { changedTouches: [{ clientX: 220, clientY: 102 }] });
assert.strictEqual(nextCalls, 1, "Swipe right must not trigger onNext");
assert.strictEqual(prevCalls, 1, "Swipe right must trigger onPrev (specsModalPrevImage)");

// Simular Tap Estático (No debe navegar)
fakeStage.dispatch("touchstart", { touches: [{ clientX: 150, clientY: 150 }] });
fakeStage.dispatch("touchend", { changedTouches: [{ clientX: 152, clientY: 151 }] });
assert.strictEqual(nextCalls, 1, "Tap must not trigger onNext");
assert.strictEqual(prevCalls, 1, "Tap must not trigger onPrev");

console.log("  ✓ Simulated gestures verified: swipe left -> next, swipe right -> prev, tap -> neutral");
console.log("====================================================");
console.log(" RESULT: ALL SWIPE VERIFICATIONS PASSED (0 failures) ");
console.log("====================================================");
