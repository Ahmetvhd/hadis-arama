'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, FileText, Loader2, GraduationCap, Map } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HadisCard from '@/components/HadisCard';
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
}

interface SearchResponse {
  data: Hadis[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Hadis[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const performSearch = useCallback(async (searchTerm: string, pageNum: number = 1) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/hadis?q=${encodeURIComponent(searchTerm)}&page=${pageNum}&limit=20`
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
    const timer = setTimeout(() => {
      if (query !== searchQuery) {
        setSearchQuery(query);
        performSearch(query, 1);
      }
    }, 500); // Debounce: 500ms bekle

    return () => clearTimeout(timer);
  }, [query, searchQuery, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, 1);
  };

  const handlePageChange = (newPage: number) => {
    performSearch(searchQuery, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold text-foreground">Hadis Arama</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Güçlü arama özellikleri ile hadisleri kolayca bulun
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/kitaplar">
              <Button variant="outline" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Kitapları Görüntüle
              </Button>
            </Link>
            <Link href="/alimler">
              <Button variant="outline" className="gap-2">
                <GraduationCap className="h-4 w-4" />
                Hadis Alimleri
              </Button>
            </Link>
            <Link href="/yol-haritasi">
              <Button variant="outline" className="gap-2">
                <Map className="h-4 w-4" />
                Yol Haritası
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Hadis metninde, açıklamada veya bölüm başlığında ara..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button type="submit" size="lg" className="px-8" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aranıyor...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Ara
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {searchQuery && (
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
              <HadisCard key={hadis.id} hadis={hadis} searchQuery={searchQuery} />
            ))}
          </div>
        ) : searchQuery ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                Aradığınız kriterlere uygun hadis bulunamadı.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                Arama yapmak için yukarıdaki kutuya bir kelime veya cümle yazın.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

