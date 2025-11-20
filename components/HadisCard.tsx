'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface Hadis {
  id: string;
  kitapNo: string;
  bolumNo: string;
  bolumBaslik: string;
  hadisNo: string;
  arapca: string;
  turkce: string;
  aciklama: string;
  hadisHukmu?: string | null;
}

interface HadisCardProps {
  hadis: Hadis;
  searchQuery: string;
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  
  // HTML içeriğini korumak için önce HTML taglerini geçici olarak değiştir
  const htmlTagRegex = /<[^>]+>/g;
  const placeholders: string[] = [];
  let placeholderIndex = 0;
  
  let textWithPlaceholders = text.replace(htmlTagRegex, (match) => {
    const placeholder = `__HTML_PLACEHOLDER_${placeholderIndex}__`;
    placeholders[placeholderIndex] = match;
    placeholderIndex++;
    return placeholder;
  });
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = textWithPlaceholders.split(regex);
  
  let highlighted = parts.map((part, index) => {
    // Placeholder'ları geri yükle
    if (part.startsWith('__HTML_PLACEHOLDER_')) {
      const idx = parseInt(part.replace('__HTML_PLACEHOLDER_', '').replace('__', ''));
      return placeholders[idx];
    }
    
    if (part.toLowerCase() === query.toLowerCase()) {
      return `<mark class="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">${part}</mark>`;
    }
    return part;
  }).join('');
  
  return highlighted;
}

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\r\\n/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\t/g, ' ')
    .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
    .trim();
}

// ":" karakterinden önceki kısmı kalın ve koyu renk yap
function formatHadisText(text: string): string {
  if (!text) return '';
  
  // ":" karakterini bul (ilk geçtiği yerde)
  const colonIndex = text.indexOf(':');
  
  if (colonIndex > 0 && colonIndex < 100) { // Sadece başta (ilk 100 karakter içinde) ise
    const beforeColon = text.substring(0, colonIndex).trim();
    const afterColon = text.substring(colonIndex + 1).trim();
    
    // Önceki kısmı kalın ve koyu renk yap (daha belirgin)
    return `<span class="font-bold text-gray-900 dark:text-gray-100" style="font-weight: 700; font-size: 1.05em;">${beforeColon}:</span> ${afterColon}`;
  }
  
  return text;
}

function cleanArabicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\r\\n/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\t/g, ' ')
    .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
    .trim();
}

const MAX_PREVIEW_LENGTH = 800; // Daha uzun önizleme için artırıldı

export default function HadisCard({ hadis, searchQuery }: HadisCardProps) {
  const [expandedTurkce, setExpandedTurkce] = useState(false);
  const [expandedArapca, setExpandedArapca] = useState(false);
  const [expandedAciklama, setExpandedAciklama] = useState(false);

  const cleanedTurkce = cleanText(hadis.turkce);
  const cleanedArapca = cleanArabicText(hadis.arapca);
  const cleanedAciklama = cleanText(hadis.aciklama);
  const cleanedBolumBaslik = cleanText(hadis.bolumBaslik);

  const turkcePreview = cleanedTurkce.length > MAX_PREVIEW_LENGTH 
    ? cleanedTurkce.substring(0, MAX_PREVIEW_LENGTH) 
    : cleanedTurkce;
  const arapcaPreview = cleanedArapca.length > MAX_PREVIEW_LENGTH 
    ? cleanedArapca.substring(0, MAX_PREVIEW_LENGTH) 
    : cleanedArapca;
  const aciklamaPreview = cleanedAciklama.length > MAX_PREVIEW_LENGTH 
    ? cleanedAciklama.substring(0, MAX_PREVIEW_LENGTH) 
    : cleanedAciklama;

  // Hüküm rengi belirleme
  const getHukmuColor = (hukmu: string | null | undefined): string => {
    if (!hukmu) return '';
    switch (hukmu.toLowerCase()) {
      case 'sahih':
        return '#10b981'; // Yeşil
      case 'hasen':
        return '#3b82f6'; // Mavi
      case 'zayıf':
        return '#f59e0b'; // Turuncu
      case 'mevzû':
      case 'mevzu':
        return '#ef4444'; // Kırmızı
      default:
        return '#d1ad3c'; // Altın (varsayılan)
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow relative" style={{ backgroundColor: '#252628' }}>
      {/* Hadis Hükmü Badge - Sol Üst Köşe */}
      {hadis.hadisHukmu && (
        <div 
          className="absolute top-2 left-2 z-10"
          style={{ 
            backgroundColor: getHukmuColor(hadis.hadisHukmu),
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'white',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          {hadis.hadisHukmu}
        </div>
      )}
      <CardHeader className={hadis.hadisHukmu ? "pt-10" : ""}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2 flex items-center gap-2 text-white">
              <BookOpen className="h-5 w-5" style={{ color: '#d1ad3c' }} />
              <span
                className="text-white"
                dangerouslySetInnerHTML={{
                  __html: highlightText(cleanedBolumBaslik, searchQuery),
                }}
              />
            </CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {hadis.kitapNo && (
                <Badge variant="secondary" className="bg-[#d1ad3c] text-black">Kitap: {hadis.kitapNo}</Badge>
              )}
              {hadis.bolumNo && (
                <Badge variant="secondary" className="bg-[#d1ad3c] text-black">Bölüm: {hadis.bolumNo}</Badge>
              )}
              {hadis.hadisNo && (
                <Badge variant="outline" className="border-[#d1ad3c] text-[#d1ad3c]">Hadis No: {hadis.hadisNo}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Türkçe Metin */}
        {cleanedTurkce && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
              <FileText className="h-4 w-4" style={{ color: '#d1ad3c' }} />
              Türkçe Metin
            </h4>
            <div className="text-white leading-relaxed">
              <p
                dangerouslySetInnerHTML={{
                  __html: highlightText(
                    formatHadisText(expandedTurkce ? cleanedTurkce : turkcePreview),
                    searchQuery
                  ),
                }}
              />
              {cleanedTurkce.length > MAX_PREVIEW_LENGTH && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedTurkce(!expandedTurkce)}
                  className="mt-2 hover:bg-[#d1ad3c]/20"
                  style={{ color: '#d1ad3c' }}
                >
                  {expandedTurkce ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" style={{ color: '#d1ad3c' }} />
                      Daha Az Göster
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" style={{ color: '#d1ad3c' }} />
                      Devamını Oku
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Arapça Metin */}
        {cleanedArapca && (
          <div>
            <h4 className="font-semibold mb-2 text-white">Arapça Metin</h4>
            <div className="text-right text-lg leading-relaxed font-arabic text-white" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
              <p>{expandedArapca ? cleanedArapca : arapcaPreview}</p>
              {cleanedArapca.length > MAX_PREVIEW_LENGTH && (
                <div className="text-left mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedArapca(!expandedArapca)}
                    className="hover:bg-[#d1ad3c]/20"
                    style={{ color: '#d1ad3c' }}
                  >
                    {expandedArapca ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" style={{ color: '#d1ad3c' }} />
                        Daha Az Göster
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" style={{ color: '#d1ad3c' }} />
                        Devamını Oku
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Açıklama */}
        {cleanedAciklama && (
          <div className="pt-4 border-t" style={{ borderColor: '#3a3b3d' }}>
            <h4 className="font-semibold mb-2 text-white">Açıklama</h4>
            <div className="text-white leading-relaxed text-sm">
              <p
                dangerouslySetInnerHTML={{
                  __html: highlightText(
                    expandedAciklama ? cleanedAciklama : aciklamaPreview,
                    searchQuery
                  ),
                }}
              />
              {cleanedAciklama.length > MAX_PREVIEW_LENGTH && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedAciklama(!expandedAciklama)}
                  className="mt-2 hover:bg-[#d1ad3c]/20"
                  style={{ color: '#d1ad3c' }}
                >
                  {expandedAciklama ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" style={{ color: '#d1ad3c' }} />
                      Daha Az Göster
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" style={{ color: '#d1ad3c' }} />
                      Devamını Oku
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

