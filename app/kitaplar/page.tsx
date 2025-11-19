'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Loader2, Search } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Kitaplar</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Hadis kitaplarına göz atın ve bölümlerini keşfedin
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Kitap ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{filteredKitaplar.length}</strong> kitap bulundu
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKitaplar.map((kitap) => (
                <Card key={kitap.no} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center justify-between">
                      <span className="font-semibold">{kitap.name}</span>
                      <Badge variant="secondary">#{kitap.no}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Bölüm Sayısı:</span>
                        <Badge variant="outline">{kitap.bolumSayisi}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Hadis Sayısı:</span>
                        <Badge variant="outline">{kitap.hadisSayisi}</Badge>
                      </div>
                      <Link href={`/kitap/${kitap.no}`}>
                        <Button variant="default" className="w-full mt-4">
                          Kitabı Aç
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredKitaplar.length === 0 && !loading && (
              <Card className="text-center py-12">
                <CardContent>
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
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

