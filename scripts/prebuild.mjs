#!/usr/bin/env node
import { syncCatalystDocs, verifyCatalystDocs } from '../src/lib/catalyst/generate-docs.ts';

if (process.env.SKIP_CATALYST_DOCS_SYNC === '1') {
  console.log('SKIP_CATALYST_DOCS_SYNC=1 — using committed Catalyst docs without GitHub sync.');
  await verifyCatalystDocs();
  process.exit(0);
}

await syncCatalystDocs();
await verifyCatalystDocs();
