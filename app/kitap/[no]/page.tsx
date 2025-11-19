'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, BookOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Bolum {
  no: string;
  name: string;
  hadisSayisi: number;
}

export default function KitapDetailPage() {
  const params = useParams();
  const kitapNo = params.no as string;
  
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (kitapNo) {
      fetchBolumler();
    }
  }, [kitapNo]);

  const fetchBolumler = async () => {
    try {
      const response = await fetch(`/api/hadis?listBolumler=true&kitap=${kitapNo}`);
      const data = await response.json();
      setBolumler(data.bolumler || []);
    } catch (error) {
      console.error('Bölümler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const toplamHadis = bolumler.reduce((sum, bolum) => sum + bolum.hadisSayisi, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/kitaplar">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kitaplara Dön
            </Button>
          </Link>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <h1 className="text-4xl font-bold text-foreground">Kitap {kitapNo}</h1>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {bolumler.length} Bölüm
                  </Badge>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {toplamHadis} Hadis
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bölümler Listesi */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-foreground mb-2">Bölümler</h2>
              <p className="text-muted-foreground">
                Bu kitaptaki tüm bölümler aşağıda listelenmiştir
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bolumler.map((bolum) => (
                <Card key={bolum.no} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{bolum.name}</span>
                      </div>
                      <Badge variant="secondary">#{bolum.no}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Hadis Sayısı:</span>
                        <Badge variant="outline">{bolum.hadisSayisi}</Badge>
                      </div>
                      <Link href={`/kitap/${kitapNo}/bolum/${bolum.no}`}>
                        <Button variant="default" className="w-full">
                          Bölümü Aç
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {bolumler.length === 0 && !loading && (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    Bu kitapta henüz bölüm bulunmuyor.
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

