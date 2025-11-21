'use client';

import { useState } from 'react';

export default function TestV2Page() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = query 
        ? `/api/hadis/v2?q=${encodeURIComponent(query)}&page=1&limit=5`
        : `/api/hadis/v2?page=1&limit=5`;
      
      console.log('Test URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      setResults(data.data || []);
    } catch (err: any) {
      console.error('Test hatası:', err);
      setError(err.message || 'Bir hata oluştu');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const testHadisNo = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/hadis/v2?hadisNo=8&page=1&limit=5`;
      console.log('Test URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      setResults(data.data || []);
    } catch (err: any) {
      console.error('Test hatası:', err);
      setError(err.message || 'Bir hata oluştu');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#d1ad3c' }}>
          V2 API Test Sayfası
        </h1>

        <div className="space-y-4 mb-8">
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Arama terimi (örn: iman)"
              className="w-full p-3 bg-[#252628] border border-[#d1ad3c] rounded text-white"
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={testAPI}
              disabled={loading}
              className="px-6 py-3 bg-[#d1ad3c] text-black rounded hover:bg-[#b8942a] disabled:opacity-50"
            >
              {loading ? 'Yükleniyor...' : 'Arama Yap'}
            </button>
            
            <button
              onClick={testHadisNo}
              disabled={loading}
              className="px-6 py-3 bg-[#d1ad3c] text-black rounded hover:bg-[#b8942a] disabled:opacity-50"
            >
              {loading ? 'Yükleniyor...' : 'Hadis No: 8 Test'}
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
            
            {results.map((hadis, index) => (
              <div
                key={hadis.id || index}
                className="p-6 bg-[#252628] border border-[#d1ad3c] rounded"
              >
                <div className="mb-2">
                  <span className="text-[#d1ad3c] font-bold">Hadis No:</span> {hadis.hadisNo}
                </div>
                <div className="mb-2">
                  <span className="text-[#d1ad3c] font-bold">Kitap:</span> {hadis.kitapNo} - {hadis.kitapAdi}
                </div>
                <div className="mb-2">
                  <span className="text-[#d1ad3c] font-bold">Bölüm:</span> {hadis.bolumNo} - {hadis.bolumBaslikTurkce}
                </div>
                {hadis.hadisBaslik && (
                  <div className="mb-2">
                    <span className="text-[#d1ad3c] font-bold">Başlık:</span> {hadis.hadisBaslik}
                  </div>
                )}
                <div className="mb-2">
                  <span className="text-[#d1ad3c] font-bold">Türkçe:</span> {hadis.hadisMetniTurkce.substring(0, 200)}...
                </div>
                {hadis.hadisHukmu && (
                  <div className="mb-2">
                    <span className="text-[#d1ad3c] font-bold">Hüküm:</span> {hadis.hadisHukmu}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="text-gray-400">
            Sonuç bulunamadı. Yukarıdan bir arama yapın.
          </div>
        )}
      </div>
    </div>
  );
}

