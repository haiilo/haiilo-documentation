import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { gitConfig } from './shared';
import Image from 'next/image';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title:
        <>
          <Image src="/haiilo_logo.png" alt="Haiilo" className="h-6 w-auto" width={24} height={24} /> <span className="text-xl font-bold">Haiilo</span>
        </>,
      url: '/',
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
