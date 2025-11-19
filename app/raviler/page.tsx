'use client';

import { useState, useEffect } from 'react';
import { Users, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Ravi {
  name: string;
  count: number;
}

export default function RavilerPage() {
  const [raviler, setRaviler] = useState<Ravi[]>([]);
  const [filteredRaviler, setFilteredRaviler] = useState<Ravi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRaviler();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = raviler.filter((ravi) =>
        ravi.name.toLowerCase().includes(query)
      );
      setFilteredRaviler(filtered);
    } else {
      setFilteredRaviler(raviler);
    }
  }, [searchQuery, raviler]);

  const fetchRaviler = async () => {
    try {
      const response = await fetch('/api/hadis?listRaviler=true');
      const data = await response.json();
      setRaviler(data.raviler || []);
      setFilteredRaviler(data.raviler || []);
    } catch (error) {
      console.error('Raviler yüklenirken hata:', error);
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
            <Users className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Raviler</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Hadis rivayet eden sahabiler ve alimler
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ravi ara..."
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
                <strong className="text-foreground">{filteredRaviler.length}</strong> ravi bulundu
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRaviler.map((ravi) => (
                <Card key={ravi.name} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{ravi.name}</span>
                      <Badge variant="secondary">{ravi.count} hadis</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/ravi/${encodeURIComponent(ravi.name)}`}>
                      <Button variant="outline" className="w-full">
                        Hadisleri Görüntüle
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredRaviler.length === 0 && !loading && (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">
                    {searchQuery
                      ? 'Aradığınız kriterlere uygun ravi bulunamadı.'
                      : 'Henüz ravi bulunmuyor.'}
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

