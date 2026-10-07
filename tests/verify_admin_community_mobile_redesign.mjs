import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("====================================================");
console.log(" VERIFICATION: ADMIN COMMUNITY Q&A MOBILE REDESIGN  ");
console.log("====================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

const adminHtml = fs.readFileSync(path.join(rootDir, "admin.html"), "utf8");
const adminJs = fs.readFileSync(path.join(rootDir, "js/admin-app.js"), "utf8");
const firestoreJs = fs.readFileSync(path.join(rootDir, "js/services/FirestoreService.js"), "utf8");
const responsiveCss = fs.readFileSync(path.join(rootDir, "css/responsive.css"), "utf8");

console.log("\n--- 1. Checking admin.html structure ---");
assert(adminHtml.includes('id="sec-community"'), "admin.html contains #sec-community");
assert(adminHtml.includes("SOPORTE") && adminHtml.includes("Q&amp;A"), "Header contains SOPORTE & Q&A");
assert(adminHtml.includes('id="admin-comments-total-badge"'), "Contains #admin-comments-total-badge");
assert(adminHtml.includes('id="stat-pending-comments"'), "Contains #stat-pending-comments");
assert(adminHtml.includes('id="stat-answered-comments"'), "Contains #stat-answered-comments");
assert(adminHtml.includes('id="stat-total-comments"'), "Contains #stat-total-comments");
assert(adminHtml.includes('class="community-stats-grid"'), "Contains .community-stats-grid");
assert(adminHtml.includes('class="community-filter-bar"'), "Contains .community-filter-bar");
assert(adminHtml.includes('id="btn-qna-filter-all"'), "Contains #btn-qna-filter-all");
assert(adminHtml.includes('id="btn-qna-filter-pending"'), "Contains #btn-qna-filter-pending");
assert(adminHtml.includes('id="btn-qna-filter-answered"'), "Contains #btn-qna-filter-answered");
assert(adminHtml.includes('id="qna-count-all"'), "Contains #qna-count-all");
assert(adminHtml.includes('id="qna-count-pending"'), "Contains #qna-count-pending");
assert(adminHtml.includes('id="qna-count-answered"'), "Contains #qna-count-answered");

console.log("\n--- 2. Checking js/admin-app.js logic & exports ---");
assert(adminJs.includes("export function filterAdminComments"), "Exports filterAdminComments");
assert(adminJs.includes("window.filterAdminComments = filterAdminComments;"), "Binds filterAdminComments to window");
assert(adminJs.includes("export function openAdminCommentForm"), "Exports openAdminCommentForm");
assert(adminJs.includes("window.openAdminCommentForm = openAdminCommentForm;"), "Binds openAdminCommentForm to window");
assert(adminJs.includes("export function closeAdminCommentForm"), "Exports closeAdminCommentForm");
assert(adminJs.includes("window.closeAdminCommentForm = closeAdminCommentForm;"), "Binds closeAdminCommentForm to window");
assert(adminJs.includes('data-status="${hasOfficialReply ? \'ANSWERED\' : \'PENDING\'}"'), "Injects data-status attribute in comment card");
assert(adminJs.includes("countAllEl.textContent = comments.length;"), "Updates qna-count-all counter");
assert(adminJs.includes("countPendingEl.textContent = pendingList.length;"), "Updates qna-count-pending counter");
assert(adminJs.includes("countAnsweredEl.textContent = answeredList.length;"), "Updates qna-count-answered counter");
assert(adminJs.includes("filterAdminComments(currentQnaFilter);"), "Applies active filter after comments render");

console.log("\n--- 3. Checking Thread & Collapsible Form Features ---");
assert(adminJs.includes("Modificar respuesta"), "Contains 'Modificar respuesta' action button");
assert(adminJs.includes("Responder como hilo nuevo"), "Contains 'Responder como hilo nuevo' action button");
assert(adminJs.includes("display: ${hasOfficialReply ? 'none' : 'block'}"), "Collapses reply form by default when already answered");
assert(firestoreJs.includes("asNewThreadMessage = false"), "FirestoreService supports asNewThreadMessage parameter");
assert(firestoreJs.includes("comment.replies.push(officialNode);"), "FirestoreService appends new official reply in thread");

console.log("\n--- 4. Checking css/responsive.css mobile rules ---");
assert(responsiveCss.includes("#sec-community"), "responsive.css targets #sec-community");
assert(responsiveCss.includes("padding-bottom: 85px") || responsiveCss.includes("padding-bottom: 80px"), "Protects bottom dock with safe bottom padding");
assert(responsiveCss.includes(".community-stats-grid"), "responsive.css targets .community-stats-grid");
assert(responsiveCss.includes(".community-filter-bar"), "responsive.css targets .community-filter-bar");
assert(responsiveCss.includes(".admin-comment-card"), "responsive.css targets .admin-comment-card");

console.log("\n====================================================");
console.log(` RESULT: ${passed}/${passed + failed} checks passed (${failed} failures)`);
console.log("====================================================");

if (failed > 0) process.exit(1);
