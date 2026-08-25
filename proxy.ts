import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { docsContentRoute, docsRoute } from '@/lib/shared';

const docsPath = docsRoute === '/' ? '{/*path}' : `${docsRoute}{/*path}`;

const { rewrite: rewriteDocs } = rewritePath(
  docsPath,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsPath}.md`,
  `${docsContentRoute}{/*path}/content.md`,
);

const skipPrefixes = [
  '/_next',
  '/api',
  '/favicon.ico',
  '/og',
  '/llms.mdx',
  '/llms.txt',
  '/llms-full.txt',
];

function shouldApplyDocsRewrite(pathname: string) {
  return !skipPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!shouldApplyDocsRewrite(pathname)) {
    return NextResponse.next();
  }

  const result = rewriteSuffix(pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const rewritten = rewriteDocs(pathname);

    if (rewritten) {
      return NextResponse.rewrite(new URL(rewritten, request.nextUrl), {
        // this URL has two representations, selected by `Accept`
        headers: { Vary: 'Accept' },
      });
    }
  }

  return NextResponse.next();
}
