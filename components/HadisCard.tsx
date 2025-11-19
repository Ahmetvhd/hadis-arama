'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, FileText } from 'lucide-react';
import Link from 'next/link';

interface Hadis {
  id: string;
  kitapNo: string;
  bolumNo: string;
  bolumBaslik: string;
  hadisNo: string;
  arapca: string;
  turkce: string;
  aciklama: string;
  ravi?: string;
}

interface HadisCardProps {
  hadis: Hadis;
  searchQuery: string;
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return `<mark class="bg-yellow-200 dark:bg-yellow-900 px-1 rounded">${part}</mark>`;
    }
    return part;
  }).join('');
}

function cleanText(text: string): string {
  return text
    .replace(/\\r\\n/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
    .trim();
}

function cleanArabicText(text: string): string {
  return text
    .replace(/\\r\\n/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
    .trim();
}

export default function HadisCard({ hadis, searchQuery }: HadisCardProps) {
  const cleanedTurkce = cleanText(hadis.turkce);
  const cleanedArapca = cleanArabicText(hadis.arapca);
  const cleanedAciklama = cleanText(hadis.aciklama);
  const cleanedBolumBaslik = cleanText(hadis.bolumBaslik);

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
              {hadis.ravi && (
                <Link href={`/ravi/${encodeURIComponent(hadis.ravi)}`}>
                  <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">
                    Ravi: {hadis.ravi}
                  </Badge>
                </Link>
              )}
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
            <p
              className="text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: highlightText(cleanedTurkce, searchQuery),
              }}
            />
          </div>
        )}

        {/* Arapça Metin */}
        {cleanedArapca && (
          <div>
            <h4 className="font-semibold mb-2">Arapça Metin</h4>
            <p
              className="text-right text-lg leading-relaxed font-arabic"
              dir="rtl"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {cleanedArapca}
            </p>
          </div>
        )}

        {/* Açıklama */}
        {cleanedAciklama && (
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Açıklama</h4>
            <p
              className="text-muted-foreground leading-relaxed text-sm"
              dangerouslySetInnerHTML={{
                __html: highlightText(cleanedAciklama.substring(0, 500), searchQuery),
              }}
            />
            {cleanedAciklama.length > 500 && (
              <p className="text-xs text-muted-foreground mt-2">
                ... (Açıklama kısaltıldı)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

