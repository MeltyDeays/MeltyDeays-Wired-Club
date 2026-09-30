import { runTier1Tests } from './tier1_feature.test.mjs';
import { runTier2Tests } from './tier2_boundary.test.mjs';
import { runTier3Tests } from './tier3_combination.test.mjs';
import { runTier4Tests } from './tier4_realworld.test.mjs';

async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find(a => a.startsWith('--tier='));
  const selectedTier = tierArg ? parseInt(tierArg.split('=')[1], 10) : null;

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   WIRED CLUB - AUTOMATED E2E TEST RUNNER             ║');
  console.log('║   Opaque-Box Requirement Verification Track          ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const startAll = performance.now();
  const summaries = [];

  try {
    if (!selectedTier || selectedTier === 1) {
      summaries.push(await runTier1Tests());
    }
    if (!selectedTier || selectedTier === 2) {
      summaries.push(await runTier2Tests());
    }
    if (!selectedTier || selectedTier === 3) {
      summaries.push(await runTier3Tests());
    }
    if (!selectedTier || selectedTier === 4) {
      summaries.push(await runTier4Tests());
    }
  } catch (fatalErr) {
    console.error('\n[FATAL RUNNER EXCEPTION]:', fatalErr);
    process.exit(1);
  }

  const totalDuration = Math.round(performance.now() - startAll);

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  console.log('\n======================================================');
  console.log('                 FINAL TEST SUMMARY                   ');
  console.log('======================================================');

  for (const s of summaries) {
    totalTests += s.total;
    totalPassed += s.passed;
    totalFailed += s.failed;
    const statusMark = s.failed === 0 ? '✓ PASS' : '✕ FAIL';
    console.log(`[${statusMark}] ${s.name}: ${s.passed}/${s.total} passed (${s.failed} failed)`);
    if (s.errors.length > 0) {
      for (const err of s.errors) {
        console.log(`       - ${err.description}: ${err.error.message}`);
      }
    }
  }

  console.log('------------------------------------------------------');
  console.log(`TOTAL: ${totalTests} tests | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
  console.log(`Total Execution Time: ${totalDuration}ms`);
  console.log('======================================================\n');

  if (totalFailed > 0) {
    console.error(`E2E Suite completed with ${totalFailed} failure(s).\n`);
    process.exit(1);
  } else {
    console.log('All E2E test suites PASSED cleanly.\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unhandled runner error:', err);
  process.exit(1);
});
