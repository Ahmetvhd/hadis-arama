'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HadisCard from '@/components/HadisCard';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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

interface SearchResponse {
  data: Hadis[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function RaviDetailPage() {
  const params = useParams();
  const raviName = decodeURIComponent(params.name as string);
  
  const [results, setResults] = useState<Hadis[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const performSearch = useCallback(async (ravi: string, pageNum: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/hadis?ravi=${encodeURIComponent(ravi)}&page=${pageNum}&limit=20`
      );
      const data: SearchResponse = await response.json();
      setResults(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Arama hatası:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (raviName) {
      performSearch(raviName, 1);
    }
  }, [raviName, performSearch]);

  const handlePageChange = (newPage: number) => {
    performSearch(raviName, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/raviler">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ravilere Dön
            </Button>
          </Link>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-foreground mb-2">{raviName}</h1>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {total} Hadis Rivayet Etti
                  </Badge>
                </div>
                <p className="text-lg text-muted-foreground mt-4">
                  Bu ravinin rivayet ettiği tüm hadisler aşağıda listelenmiştir
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{total}</strong> hadis bulundu
              </p>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
                  >
                    Önceki
                  </Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    Sayfa {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || loading}
                  >
                    Sonraki
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results List */}
        {loading && results.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((hadis) => (
              <HadisCard key={hadis.id} hadis={hadis} searchQuery="" />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-lg text-muted-foreground">
                Bu raviye ait hadis bulunamadı.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

