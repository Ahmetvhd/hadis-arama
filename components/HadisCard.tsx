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

function highlightText(text: string, query: string, hadisHukmu?: string | null): string {
  // Null/undefined kontrolü
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Önce hüküm terimlerini renklendir (hadisHukmu olsun ya da olmasın, metin içinde geçen tüm hüküm terimlerini renklendir)
  let highlighted = text;
  
  // Tüm hüküm terimlerini ve renklerini tanımla
  const hukmuPatterns = [
    {
      patterns: [
        /\b(sahih)\b/gi,
        /\b(sahihdir)\b/gi,
        /\b(sahihtir)\b/gi,
        /\b(sahih hadis)\b/gi,
        /\b(sahih olan)\b/gi,
      ],
      color: '#10b981', // Yeşil
    },
    {
      patterns: [
        /\b(hasen)\b/gi,
        /\b(hasendir)\b/gi,
        /\b(hasentir)\b/gi,
        /\b(hasen hadis)\b/gi,
        /\b(hasen olan)\b/gi,
      ],
      color: '#3b82f6', // Mavi
    },
    {
      patterns: [
        /\b(zayıf)\b/gi,
        /\b(zayiftir)\b/gi,
        /\b(zayifdir)\b/gi,
        /\b(zayıf hadis)\b/gi,
        /\b(zayif hadis)\b/gi,
        /\b(zayıf olan)\b/gi,
        /\b(zayif olan)\b/gi,
        /\b(daif)\b/gi,
        /\b(daiftir)\b/gi,
        /\b(daif hadis)\b/gi,
      ],
      color: '#f59e0b', // Turuncu
    },
    {
      patterns: [
        /\b(mevzû)\b/gi,
        /\b(mevzu)\b/gi,
        /\b(mevzudur)\b/gi,
        /\b(mevzutur)\b/gi,
        /\b(mevzû hadis)\b/gi,
        /\b(mevzu hadis)\b/gi,
        /\b(mevzû olan)\b/gi,
        /\b(mevzu olan)\b/gi,
        /\b(uydurma)\b/gi,
        /\b(uydurma hadis)\b/gi,
      ],
      color: '#ef4444', // Kırmızı
    },
  ];
  
  // Öncelik sırası: Zayıf > Mevzû > Hasen > Sahih (daha spesifik olanlar önce)
  // Ters sırada işle ki daha spesifik olanlar önce eşleşsin
  try {
    for (let i = hukmuPatterns.length - 1; i >= 0; i--) {
      const hukmu = hukmuPatterns[i];
      for (const pattern of hukmu.patterns) {
        highlighted = highlighted.replace(pattern, (match, ...args) => {
          try {
            // offset ve string parametrelerini güvenli şekilde al
            const offset = typeof args[0] === 'number' ? args[0] : 0;
            const string = typeof args[1] === 'string' ? args[1] : highlighted;
            
            // Eğer zaten HTML tag içindeyse değiştirme
            const beforeMatch = string.substring(Math.max(0, offset - 50), offset);
            const afterMatch = string.substring(offset + match.length, Math.min(string.length, offset + match.length + 50));
            if (beforeMatch.includes('<span') || afterMatch.includes('</span>')) {
              return match;
            }
            // Eğer zaten renklendirilmişse değiştirme
            if (beforeMatch.includes('style="color:') || beforeMatch.includes("style='color:")) {
              return match;
            }
            return `<span style="color: ${hukmu.color}; font-weight: 600;">${match}</span>`;
          } catch (e) {
            // Hata durumunda orijinal match'i döndür
            return match;
          }
        });
      }
    }
  } catch (e) {
    // Hata durumunda orijinal metni döndür
    console.error('Hüküm terimi renklendirme hatası:', e);
  }
  
  if (!query.trim()) {
    // Query yoksa, HTML içindeki diğer renkleri beyaz yap (hüküm renkleri hariç)
    highlighted = highlighted.replace(/style="[^"]*color:\s*[^;"]+[^"]*"/gi, (match) => {
      // Hüküm renklerini koru
      if (match.includes('#10b981') || match.includes('#3b82f6') || match.includes('#f59e0b') || match.includes('#ef4444')) {
        return match;
      }
      // Diğer renkleri white ile değiştir
      if (match.includes('color: white') || match.includes('color:white')) {
        return match;
      }
      return match.replace(/color:\s*[^;"]+/gi, 'color: white');
    });
    return highlighted;
  }
  
  // HTML içeriğini korumak için önce HTML taglerini geçici olarak değiştir
  const htmlTagRegex = /<[^>]+>/g;
  const placeholders: string[] = [];
  let placeholderIndex = 0;
  
  let textWithPlaceholders = highlighted.replace(htmlTagRegex, (match) => {
    const placeholder = `__HTML_PLACEHOLDER_${placeholderIndex}__`;
    placeholders[placeholderIndex] = match;
    placeholderIndex++;
    return placeholder;
  });
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = textWithPlaceholders.split(regex);
  
  highlighted = parts.map((part, index) => {
    try {
      // Placeholder'ları geri yükle
      if (part.startsWith('__HTML_PLACEHOLDER_')) {
        const idxStr = part.replace('__HTML_PLACEHOLDER_', '').replace('__', '');
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx) && idx >= 0 && idx < placeholders.length) {
          return placeholders[idx];
        }
        return part;
      }
      
      if (part.toLowerCase() === query.toLowerCase()) {
        return `<mark class="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">${part}</mark>`;
      }
      return part;
    } catch (e) {
      return part;
    }
  }).join('');
  
  // HTML içindeki renkleri beyaz yap (hüküm renkleri ve arama vurgusu hariç)
  highlighted = highlighted.replace(/style="[^"]*color:\s*[^;"]+[^"]*"/gi, (match) => {
    // Hüküm renklerini ve arama vurgusunu koru
    if (match.includes('#10b981') || match.includes('#3b82f6') || match.includes('#f59e0b') || match.includes('#ef4444')) {
      return match;
    }
    if (match.includes('color: white') || match.includes('color:white')) {
      return match;
    }
    // Diğer renkleri white ile değiştir
    return match.replace(/color:\s*[^;"]+/gi, 'color: white');
  });
  
  // Class'lardaki renk tanımlarını da temizle (text-blue, text-slate gibi)
  highlighted = highlighted.replace(/\b(text-(blue|indigo|slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|violet|purple|fuchsia|pink|rose)-\d+|text-(blue|indigo|slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|violet|purple|fuchsia|pink|rose))\b/gi, 'text-white');
  
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
  const [showAciklama, setShowAciklama] = useState(false);

  const cleanedTurkce = cleanText(hadis.turkce || '');
  const cleanedArapca = cleanArabicText(hadis.arapca || '');
  const cleanedAciklama = cleanText(hadis.aciklama || '');
  const cleanedBolumBaslik = cleanText(hadis.bolumBaslik || '');

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
  
  // Hüküm badge rengi (arka plan için yarı şeffaf)
  const getHukmuBgColor = (hukmu: string | null | undefined): string => {
    if (!hukmu) return '';
    switch (hukmu.toLowerCase()) {
      case 'sahih':
        return 'rgba(16, 185, 129, 0.2)'; // Yeşil yarı şeffaf
      case 'hasen':
        return 'rgba(59, 130, 246, 0.2)'; // Mavi yarı şeffaf
      case 'zayıf':
        return 'rgba(245, 158, 11, 0.2)'; // Turuncu yarı şeffaf
      case 'mevzû':
      case 'mevzu':
        return 'rgba(239, 68, 68, 0.2)'; // Kırmızı yarı şeffaf
      default:
        return 'rgba(209, 173, 60, 0.2)'; // Altın yarı şeffaf
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 relative" 
      style={{ 
        backgroundColor: '#252628',
        border: '1px solid rgba(209, 173, 60, 0.2)',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 20px rgba(209, 173, 60, 0.4), 0 0 40px rgba(209, 173, 60, 0.2)';
        e.currentTarget.style.borderColor = 'rgba(209, 173, 60, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = 'rgba(209, 173, 60, 0.2)';
      }}
    >
      {/* Hadis Hükmü Badge - Sol Üst Köşe */}
      {hadis.hadisHukmu && (
        <div 
          className="absolute top-2 left-2 z-10"
          style={{ 
            backgroundColor: getHukmuBgColor(hadis.hadisHukmu),
            border: `1px solid ${getHukmuColor(hadis.hadisHukmu)}`,
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: '600',
            color: getHukmuColor(hadis.hadisHukmu),
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
                  __html: highlightText(cleanedBolumBaslik, searchQuery || '', hadis.hadisHukmu || null),
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
        {/* Türkçe ve Arapça Metinler - Yan Yana */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Türkçe Metin - Sol */}
          {cleanedTurkce && (
            <div className="text-left">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-white">
                <FileText className="h-4 w-4" style={{ color: '#d1ad3c' }} />
                Türkçe Metin
              </h4>
              <div className="text-white leading-relaxed">
                <p
                  style={{ color: 'white' }}
                  className="text-white"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(
                      expandedTurkce ? cleanedTurkce : turkcePreview,
                      searchQuery || '',
                      hadis.hadisHukmu || null
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

          {/* Arapça Metin - Sağ */}
          {cleanedArapca && (
            <div className="text-right">
              <h4 className="font-semibold mb-2 text-white">Arapça Metin</h4>
              <div className="text-right text-lg leading-relaxed font-arabic text-white" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
                <p
                  dangerouslySetInnerHTML={{
                    __html: highlightText(
                      (expandedArapca ? cleanedArapca : arapcaPreview) || '',
                      searchQuery || '',
                      hadis.hadisHukmu || null
                    ),
                  }}
                />
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
        </div>

        {/* Açıklama - Alt Kısım */}
        {cleanedAciklama && (
          <div className="pt-4 border-t" style={{ borderColor: '#3a3b3d' }}>
            {!showAciklama ? (
              <Button
                variant="outline"
                onClick={() => setShowAciklama(true)}
                className="border-[#d1ad3c] text-[#d1ad3c] hover:bg-[#d1ad3c] hover:text-black"
                style={{ borderColor: '#d1ad3c', color: '#d1ad3c' }}
              >
                Açıklamayı Oku
              </Button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white">Açıklama</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAciklama(false)}
                    className="hover:bg-[#d1ad3c]/20"
                    style={{ color: '#d1ad3c' }}
                  >
                    <ChevronUp className="h-4 w-4" style={{ color: '#d1ad3c' }} />
                  </Button>
                </div>
                <div className="text-white leading-relaxed text-sm">
                  <p
                    dangerouslySetInnerHTML={{
                  __html: highlightText(
                    expandedAciklama ? cleanedAciklama : aciklamaPreview,
                    searchQuery || '',
                    hadis.hadisHukmu || null
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

