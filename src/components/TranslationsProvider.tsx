'use client';

import { I18nextProvider } from 'react-i18next';
import { ReactNode, useEffect, useState } from 'react';
import initI18next from '@/lib/i18n';
import { createInstance, i18n as I18n } from 'i18next';

export default function TranslationsProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: string;
}) {
  const [i18n, setI18n] = useState<I18n | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const newInstance = await initI18next(locale);
      setI18n(newInstance);
    };

    if (!i18n) {
      initialize();
    }
  }, [locale, i18n]);

  if (!i18n) {
    // You can return a loading state here if you want
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}