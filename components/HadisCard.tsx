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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span
                dangerouslySetInnerHTML={{
                  __html: highlightText(cleanedBolumBaslik, searchQuery),
                }}
              />
            </CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              {hadis.kitapNo && (
                <Badge variant="secondary">Kitap: {hadis.kitapNo}</Badge>
              )}
              {hadis.bolumNo && (
                <Badge variant="secondary">Bölüm: {hadis.bolumNo}</Badge>
              )}
              {hadis.hadisNo && (
                <Badge variant="outline">Hadis No: {hadis.hadisNo}</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Türkçe Metin */}
        {cleanedTurkce && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Türkçe Metin
            </h4>
            <div className="text-foreground leading-relaxed">
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
                  className="mt-2 text-primary hover:text-primary/80"
                >
                  {expandedTurkce ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Daha Az Göster
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
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
            <h4 className="font-semibold mb-2">Arapça Metin</h4>
            <div className="text-right text-lg leading-relaxed font-arabic" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
              <p>{expandedArapca ? cleanedArapca : arapcaPreview}</p>
              {cleanedArapca.length > MAX_PREVIEW_LENGTH && (
                <div className="text-left mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedArapca(!expandedArapca)}
                    className="text-primary hover:text-primary/80"
                  >
                    {expandedArapca ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Daha Az Göster
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
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
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Açıklama</h4>
            <div className="text-muted-foreground leading-relaxed text-sm">
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
                  className="mt-2 text-primary hover:text-primary/80"
                >
                  {expandedAciklama ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Daha Az Göster
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
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

