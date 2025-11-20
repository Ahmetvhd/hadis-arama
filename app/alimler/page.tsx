'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Alim {
  id: string;
  name: string;
  hadisSayisi: number;
}

const ALIMLER = [
  { id: 'buhari', name: 'Sahih-i Buhari' },
  { id: 'muslim', name: 'Sahih-i Müslim' },
  { id: 'tirmizi', name: 'Sünen Tirmizi' },
  { id: 'ebu-davud', name: 'Sünen Ebu Davud' },
  { id: 'ibn-mace', name: 'Sünen İbn-i Mace' },
  { id: 'malik', name: 'Muvatta Malik' },
  { id: 'ahmed', name: 'Müsned Ahmed' },
];

export default function AlimlerPage() {
  const [alimler, setAlimler] = useState<Alim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlimler();
  }, []);

  const fetchAlimler = async () => {
    try {
      const response = await fetch('/api/hadis?listAlimler=true');
      const data = await response.json();
      setAlimler(data.alimler || []);
    } catch (error) {
      console.error('Alimler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GraduationCap className="h-10 w-10" style={{ color: '#d1ad3c' }} />
            <h1 className="text-4xl font-bold text-white">Hadis Alimleri</h1>
          </div>
          <p className="text-lg text-white/80">
            Büyük hadis alimlerinin eserlerine göz atın
          </p>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#d1ad3c' }} />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-white">
                <strong style={{ color: '#d1ad3c' }}>{alimler.length}</strong> alim bulundu
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alimler.map((alim) => (
                <Card key={alim.id} className="hover:shadow-lg transition-shadow" style={{ backgroundColor: '#252628' }}>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center justify-between text-white">
                      <span className="font-semibold">{alim.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/80">Hadis Sayısı:</span>
                        <Badge variant="secondary" className="bg-[#d1ad3c] text-black">{alim.hadisSayisi}</Badge>
                      </div>
                      <Link href={`/alim/${alim.id}`}>
                        <Button 
                          variant="default" 
                          className="w-full mt-4"
                          style={{ backgroundColor: '#d1ad3c', color: 'black' }}
                        >
                          Hadisleri Görüntüle
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {alimler.length === 0 && !loading && (
              <Card className="text-center py-12" style={{ backgroundColor: '#252628' }}>
                <CardContent>
                  <GraduationCap className="h-16 w-16 mx-auto mb-4" style={{ color: '#d1ad3c' }} />
                  <p className="text-lg text-white">
                    Henüz alim bulunmuyor.
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


