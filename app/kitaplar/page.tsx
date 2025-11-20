'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Loader2, Search, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Kitap {
  no: string;
  name: string;
  bolumSayisi: number;
  hadisSayisi: number;
}

export default function KitaplarPage() {
  const [kitaplar, setKitaplar] = useState<Kitap[]>([]);
  const [filteredKitaplar, setFilteredKitaplar] = useState<Kitap[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchKitaplar();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = kitaplar.filter((kitap) =>
        kitap.name.toLowerCase().includes(query) ||
        kitap.no.includes(query)
      );
      setFilteredKitaplar(filtered);
    } else {
      setFilteredKitaplar(kitaplar);
    }
  }, [searchQuery, kitaplar]);

  const fetchKitaplar = async () => {
    try {
      const response = await fetch('/api/hadis?listKitaplar=true');
      const data = await response.json();
      setKitaplar(data.kitaplar || []);
      setFilteredKitaplar(data.kitaplar || []);
    } catch (error) {
      console.error('Kitaplar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Geri Dön Butonu */}
        <div className="mb-6">
          <Link href="/">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-[#252628]"
              style={{ color: '#d1ad3c' }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" style={{ color: '#d1ad3c' }} />
              Ana Sayfaya Dön
            </Button>
          </Link>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-10 w-10" style={{ color: '#d1ad3c' }} />
            <h1 className="text-4xl font-bold text-white">Kitaplar</h1>
          </div>
          <p className="text-lg text-white/80">
            Hadis kitaplarına göz atın ve bölümlerini keşfedin
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6" style={{ backgroundColor: '#252628' }}>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: '#d1ad3c' }} />
              <Input
                type="text"
                placeholder="Kitap ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#252628] text-white border-gray-700 focus:border-[#d1ad3c] placeholder:text-gray-400"
                style={{ backgroundColor: '#252628', color: 'white' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#d1ad3c' }} />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-white">
                <strong style={{ color: '#d1ad3c' }}>{filteredKitaplar.length}</strong> kitap bulundu
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKitaplar.map((kitap) => (
                <Card key={kitap.no} className="hover:shadow-lg transition-shadow" style={{ backgroundColor: '#252628' }}>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center justify-between text-white">
                      <span className="font-semibold">{kitap.name}</span>
                      <Badge variant="secondary" className="bg-[#d1ad3c] text-black">#{kitap.no}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/80">Bölüm Sayısı:</span>
                        <Badge variant="outline" className="border-[#d1ad3c] text-[#d1ad3c]">{kitap.bolumSayisi}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/80">Hadis Sayısı:</span>
                        <Badge variant="outline" className="border-[#d1ad3c] text-[#d1ad3c]">{kitap.hadisSayisi}</Badge>
                      </div>
                      <Link href={`/kitap/${kitap.no}`}>
                        <Button 
                          variant="default" 
                          className="w-full mt-4"
                          style={{ backgroundColor: '#d1ad3c', color: 'black' }}
                        >
                          Kitabı Aç
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredKitaplar.length === 0 && !loading && (
              <Card className="text-center py-12" style={{ backgroundColor: '#252628' }}>
                <CardContent>
                  <BookOpen className="h-16 w-16 mx-auto mb-4" style={{ color: '#d1ad3c' }} />
                  <p className="text-lg text-white">
                    {searchQuery
                      ? 'Aradığınız kriterlere uygun kitap bulunamadı.'
                      : 'Henüz kitap bulunmuyor.'}
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


