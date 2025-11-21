'use client';

import { useState } from 'react';

export default function TestNewPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = query 
        ? `/api/hadis-new?q=${encodeURIComponent(query)}&page=1&limit=5`
        : `/api/hadis-new?page=1&limit=5`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setResults(data.data || []);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const testHadisNo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/hadis-new?hadisNo=8&page=1&limit=5');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setResults(data.data || []);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#d1ad3c' }}>
          Yeni API Test Sayfası
        </h1>

        <div className="space-y-4 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Arama terimi"
            className="w-full p-3 bg-[#252628] border border-[#d1ad3c] rounded text-white"
          />
          
          <div className="flex gap-4">
            <button
              onClick={testSearch}
              disabled={loading}
              className="px-6 py-3 bg-[#d1ad3c] text-black rounded hover:bg-[#b8942a] disabled:opacity-50"
            >
              {loading ? 'Yükleniyor...' : 'Ara'}
            </button>
            
            <button
              onClick={testHadisNo}
              disabled={loading}
              className="px-6 py-3 bg-[#d1ad3c] text-black rounded hover:bg-[#b8942a] disabled:opacity-50"
            >
              Hadis No: 8
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
            <strong>Hata:</strong> {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#d1ad3c' }}>
              Sonuçlar ({results.length})
            </h2>
            
            {results.map((h, i) => (
              <div key={h.id || i} className="p-6 bg-[#252628] border border-[#d1ad3c] rounded">
                <div className="mb-2">
                  <span className="text-[#d1ad3c] font-bold">Hadis No:</span> {h.hadisNo}
                </div>
                <div className="mb-2">
                  <span className="text-[#d1ad3c] font-bold">Kitap:</span> {h.kitapNo} - {h.kitapAdi}
                </div>
                <div className="mb-2">
                  <span className="text-[#d1ad3c] font-bold">Bölüm:</span> {h.bolumNo}
                </div>
                {h.hadisBaslik && (
                  <div className="mb-2">
                    <span className="text-[#d1ad3c] font-bold">Başlık:</span> {h.hadisBaslik}
                  </div>
                )}
                <div className="mb-2">
                  <span className="text-[#d1ad3c] font-bold">Türkçe:</span> {h.hadisMetniTurkce.substring(0, 150)}...
                </div>
                {h.hadisHukmu && (
                  <div className="mb-2">
                    <span className="text-[#d1ad3c] font-bold">Hüküm:</span> {h.hadisHukmu}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="text-gray-400">Sonuç bulunamadı.</div>
        )}
      </div>
    </div>
  );
}

