import { CatalystPreview } from '@/components/catalyst-preview';
import { ExampleCode } from '@/components/example-code';
import { Suspense } from 'react';

interface ComponentExampleProps {
  code: string;
  lang?: string;
}

export function ComponentExample({ code, lang = 'html' }: ComponentExampleProps) {
  const trimmed = code.trim();

  return (
    <div className="not-prose my-6 overflow-visible rounded-xl border bg-fd-card shadow-sm">
      <div className="flex min-h-[7.5rem] items-center justify-center border-b p-8">
        <CatalystPreview html={trimmed} />
      </div>
      <div className="[&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0 [&_figure]:shadow-none">
        <Suspense
          fallback={
            <pre className="overflow-auto p-4 text-sm">
              <code>{trimmed}</code>
            </pre>
          }
        >
          <ExampleCode code={trimmed} lang={lang} />
        </Suspense>
      </div>
    </div>
  );
}
