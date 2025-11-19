'use client';

import { useState, useEffect } from 'react';
import { Map, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Kategori {
  id: string;
  name: string;
  hadisSayisi: number;
}

const KATEGORILER = [
  { id: 'ilim', name: 'İlim' },
  { id: 'dua', name: 'Dua' },
  { id: 'iman', name: 'İman' },
  { id: 'ibadet', name: 'İbadet' },
  { id: 'selam', name: 'Selam' },
  { id: 'zikir', name: 'Zikir' },
  { id: 'tevekkul', name: 'Tevekkül' },
  { id: 'fitrat', name: 'Fıtrat' },
  { id: 'tevbe', name: 'Tevbe' },
  { id: 'sirk', name: 'Şirk' },
  { id: 'tevhid', name: 'Tevhid' },
];

export default function YolHaritasiPage() {
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKategoriler();
  }, []);

  const fetchKategoriler = async () => {
    try {
      const response = await fetch('/api/hadis?listKategoriler=true');
      const data = await response.json();
      setKategoriler(data.kategoriler || []);
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Map className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Yol Haritası</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Hadisleri konularına göre keşfedin
          </p>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{kategoriler.length}</strong> kategori bulundu
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kategoriler.map((kategori) => (
                <Card key={kategori.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center justify-between">
                      <span className="font-semibold">{kategori.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Hadis Sayısı:</span>
                        <Badge variant="secondary">{kategori.hadisSayisi}</Badge>
                      </div>
                      <Link href={`/yol-haritasi/${kategori.id}`}>
                        <Button variant="default" className="w-full mt-4">
                          Hadisleri Görüntüle
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {kategoriler.length === 0 && !loading && (
              <Card className="text-center py-12">
                <CardContent>
                  <Map className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    Henüz kategori bulunmuyor.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

