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
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header - Kitap Sembolü Ortada */}
        <div className="text-center mb-12">
          <div className="flex flex-col items-center justify-center mb-8">
            <BookOpen className="h-16 w-16 mb-4" style={{ color: '#d1ad3c' }} />
            <h2 
              className="text-3xl font-bold"
              style={{ 
                color: '#d1ad3c',
                textShadow: '0 0 20px rgba(209, 173, 60, 0.5), 0 0 40px rgba(209, 173, 60, 0.3)',
              }}
            >
              Peygamberimiz'in <span className="text-xs" style={{ fontSize: '0.4em', verticalAlign: 'middle', opacity: 0.9 }}>(s.a.v.)</span> Mirası
            </h2>
          </div>
          
          {/* Butonlar Üstte */}
          <div className="flex gap-3 justify-center flex-wrap mb-8">
            <Link href="/alimler">
              <Button 
                variant="outline" 
                className="gap-2 border-[#d1ad3c] text-[#d1ad3c] hover:bg-[#d1ad3c] hover:text-black transition-colors"
                style={{ borderColor: '#d1ad3c', color: '#d1ad3c' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#000000';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) icon.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1ad3c';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) icon.style.color = '#d1ad3c';
                }}
              >
                <GraduationCap className="h-4 w-4" style={{ color: '#d1ad3c' }} />
                Hadis Alimleri
              </Button>
            </Link>
            <Link href="/yol-haritasi">
              <Button 
                variant="outline" 
                className="gap-2 border-[#d1ad3c] text-[#d1ad3c] hover:bg-[#d1ad3c] hover:text-black transition-colors"
                style={{ borderColor: '#d1ad3c', color: '#d1ad3c' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#000000';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) icon.style.color = '#000000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#d1ad3c';
                  const icon = e.currentTarget.querySelector('svg');
                  if (icon) icon.style.color = '#d1ad3c';
                }}
              >
                <Map className="h-4 w-4" style={{ color: '#d1ad3c' }} />
                Yol Haritası
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="mb-8 shadow-lg" style={{ backgroundColor: '#252628' }}>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: '#d1ad3c' }} />
                <Input
                  type="text"
                  placeholder="…Resûl size neyi vermişse onu alın, neyi de yasaklamışsa onu bırakın… Haşr,7"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-12 text-lg bg-[#252628] text-white border-gray-700 focus:border-[#d1ad3c] placeholder:text-gray-400"
                  style={{ backgroundColor: '#252628', color: 'white' }}
                />
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="px-8" 
                disabled={loading}
                style={{ backgroundColor: '#d1ad3c', color: 'black' }}
              >
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
              <p className="text-white">
                <strong style={{ color: '#d1ad3c' }}>{total}</strong> hadis bulundu
              </p>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
                    className="border-[#d1ad3c] text-[#d1ad3c] hover:bg-[#d1ad3c] hover:text-black"
                    style={{ borderColor: '#d1ad3c', color: '#d1ad3c' }}
                  >
                    Önceki
                  </Button>
                  <span className="flex items-center px-4 text-sm text-white">
                    Sayfa {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || loading}
                    className="border-[#d1ad3c] text-[#d1ad3c] hover:bg-[#d1ad3c] hover:text-black"
                    style={{ borderColor: '#d1ad3c', color: '#d1ad3c' }}
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
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#d1ad3c' }} />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((hadis) => (
              <HadisCard key={hadis.id} hadis={hadis} searchQuery={searchQuery} />
            ))}
          </div>
        ) : searchQuery ? (
          <Card className="text-center py-12" style={{ backgroundColor: '#252628' }}>
            <CardContent>
              <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: '#d1ad3c' }} />
              <p className="text-lg text-white">
                Aradığınız kriterlere uygun hadis bulunamadı.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center py-12" style={{ backgroundColor: '#252628' }}>
            <CardContent>
              <Search className="h-16 w-16 mx-auto mb-4" style={{ color: '#d1ad3c' }} />
              <p className="text-lg text-white">
                Arama yapmak için yukarıdaki kutuya bir kelime veya cümle yazın.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

