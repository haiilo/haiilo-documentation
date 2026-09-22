import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';

interface ExampleCodeProps {
  code: string;
  lang?: string;
}

export async function ExampleCode({ code, lang = 'html' }: ExampleCodeProps) {
  return ServerCodeBlock({
    code,
    lang,
    codeblock: {
      className: 'my-0 rounded-none border-0 shadow-none',
    },
  });
}
