'use client';

import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const changeLanguage = (lng: 'en' | 'sw') => {
    if (i18n.language === lng) return; // Don't do anything if language is already selected

    // Get the current path without the language prefix
    const currentPath = pathname.substring(3); // Removes /en or /sw
    
    // Redirect to the new language URL
    router.push(`/${lng}${currentPath}`);
  };

  return (
    <div className="flex items-center gap-1">
      <Button 
        variant={i18n.language === 'en' ? 'secondary' : 'ghost'} 
        size="sm" 
        onClick={() => changeLanguage('en')}
        className="px-2"
      >
        EN
      </Button>
      <Button 
        variant={i18n.language === 'sw' ? 'secondary' : 'ghost'} 
        size="sm" 
        onClick={() => changeLanguage('sw')}
        className="px-2"
      >
        SW
      </Button>
    </div>
  );
}