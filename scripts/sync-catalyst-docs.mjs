#!/usr/bin/env node
import { syncCatalystDocs } from '../src/lib/catalyst/generate-docs.ts';

await syncCatalystDocs();
