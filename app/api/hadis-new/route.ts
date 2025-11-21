import { NextRequest, NextResponse } from 'next/server';

/**
 * YENİ TEMİZ HADİS API
 * Site referansı: https://www.islamiokul.com/kitap/files/buh/had/002/0008.htm
 */

interface HadisData {
  id: string;
  kitapNo: string;
  kitapAdi: string;
  bolumNo: string;
  bolumBaslikArapca: string;
  bolumBaslikTurkce: string;
  hadisNo: string;
  hadisBaslik: string;
  altBaslik?: string;
  raviZinciri: string;
  hadisMetniArapca: string;
  hadisMetniTurkce: string;
  tekrarNo?: string;
  digerTahric?: string;
  aciklama?: string;
  uyarilar?: string;
  hadisHukmu?: 'Sahih' | 'Hasen' | 'Zayıf' | 'Mevzû' | null;
}

// Cache
let hadisCache: HadisData[] | null = null;
let rawDataCache: any[][] | null = null;
let isLoading = false;

/**
 * GitHub Release'den veri indir
 */
async function fetchRawData(): Promise<any[][]> {
  if (rawDataCache) return rawDataCache;
  if (isLoading) {
    while (isLoading) await new Promise(r => setTimeout(r, 100));
    if (rawDataCache) return rawDataCache;
  }

  isLoading = true;
  try {
    const url = 'https://github.com/Ahmetvhd/hadis-arama/releases/download/v1.0/hadisler.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    rawDataCache = data;
    return data;
  } finally {
    isLoading = false;
  }
}

/**
 * Veri yapısını parse et
 * Format: [id, arapca(1), turkce(2), boş(3), aciklama(4), boş(5), kitapNo(6), bolumNo(7), hadisNo(8), ...]
 */
function parseData(rawData: any[][]): HadisData[] {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  // Bölüm başlıklarını parse et
  const bolumBasliklari = new Map<string, { arapca: string; turkce: string }>();
  
  if (rawData[0]?.length > 100) {
    const basliklar = rawData[0];
    for (let i = 0; i < basliklar.length - 3; i += 4) {
      const kitapNo = String(basliklar[i + 1] || '');
      const bolumNo = String(basliklar[i + 2] || '');
      const baslik = String(basliklar[i + 3] || '');
      bolumBasliklari.set(`${kitapNo}-${bolumNo}`, {
        arapca: baslik,
        turkce: baslik
      });
    }
  }

  const allData = rawData[0]?.length > 100 ? rawData.slice(1) : rawData;
  const hadisler: HadisData[] = [];

  for (let i = 0; i < allData.length; i++) {
    const item = allData[i];
    if (!Array.isArray(item) || item.length < 9) continue;

    const id = String(item[0] || i);
    const arapca = String(item[1] || '').trim();
    const turkce = String(item[2] || '').trim();
    const aciklama = String(item[4] || item[3] || '').trim();
    const kitapNo = String(item[6] || '').trim();
    const bolumNo = String(item[7] || '').trim();
    const hadisNo = String(item[8] || '').trim();

    if (!turkce && !arapca && !aciklama) continue;

    const bolumKey = `${kitapNo}-${bolumNo}`;
    const bolumBaslik = bolumBasliklari.get(bolumKey) || { arapca: '', turkce: '' };

    // Hadis başlığını çıkar
    let hadisBaslik = '';
    const turkceLines = turkce.split(/\r?\n/).filter(l => l.trim());
    if (turkceLines.length > 0) {
      const firstLine = turkceLines[0].trim();
      if (/^\d+\.\s+/.test(firstLine)) {
        hadisBaslik = firstLine;
      }
    }

    // Ravi zincirini çıkar
    let raviZinciri = '';
    const raviMatch = arapca.match(/(حدثنا|أخبرنا|عن)[\s\S]*?(قال|أن|أنبأ)/);
    if (raviMatch) raviZinciri = raviMatch[0].trim();

    // Tekrar ve tahric bilgilerini çıkar
    const tekrarMatch = aciklama.match(/Tekrarı:\s*(\d+)/i);
    const tahricMatch = aciklama.match(/Diğer\s+Tahric[^:]*:\s*([^)]+)/i);
    
    // Hüküm tespit
    const text = (turkce + ' ' + aciklama).toLowerCase();
    let hadisHukmu: 'Sahih' | 'Hasen' | 'Zayıf' | 'Mevzû' | null = null;
    if (/\b(zayıf|zayif|daif)\b/.test(text)) hadisHukmu = 'Zayıf';
    else if (/\b(mevzû|mevzu|uydurma)\b/.test(text)) hadisHukmu = 'Mevzû';
    else if (/\b(hasen)\b/.test(text)) hadisHukmu = 'Hasen';
    else if (/\b(sahih)\b/.test(text)) hadisHukmu = 'Sahih';

    hadisler.push({
      id,
      kitapNo,
      kitapAdi: `Kitap ${kitapNo}`,
      bolumNo,
      bolumBaslikArapca: bolumBaslik.arapca,
      bolumBaslikTurkce: bolumBaslik.turkce,
      hadisNo,
      hadisBaslik: hadisBaslik || `Hadis ${hadisNo}`,
      raviZinciri,
      hadisMetniArapca: arapca.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n'),
      hadisMetniTurkce: turkce.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n'),
      tekrarNo: tekrarMatch ? tekrarMatch[1] : undefined,
      digerTahric: tahricMatch ? tahricMatch[1].trim() : undefined,
      aciklama: aciklama || undefined,
      hadisHukmu
    });
  }

  return hadisler;
}

/**
 * Hadis verilerini yükle
 */
async function loadHadisData(): Promise<HadisData[]> {
  if (hadisCache) return hadisCache;
  
  try {
    const rawData = await fetchRawData();
    hadisCache = parseData(rawData);
    return hadisCache;
  } catch (error) {
    console.error('Veri yükleme hatası:', error);
    return [];
  }
}

/**
 * API Route
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get('q') || '';
    const kitapNo = params.get('kitap') || '';
    const bolumNo = params.get('bolum') || '';
    const hadisNo = params.get('hadisNo') || '';
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '20');

    const allHadis = await loadHadisData();
    let filtered = [...allHadis];

    // Hadis numarası filtresi
    if (hadisNo) {
      const searchNo = parseInt(hadisNo, 10);
      if (!isNaN(searchNo)) {
        filtered = filtered.filter(h => {
          const hNo = parseInt(h.hadisNo, 10);
          return !isNaN(hNo) && hNo === searchNo;
        });
      }
    }

    // Kitap filtresi
    if (kitapNo) {
      filtered = filtered.filter(h => h.kitapNo === kitapNo);
    }

    // Bölüm filtresi
    if (bolumNo) {
      filtered = filtered.filter(h => h.bolumNo === bolumNo);
    }

    // Metin araması
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(h => {
        return (
          h.hadisMetniTurkce.toLowerCase().includes(q) ||
          h.hadisMetniArapca.toLowerCase().includes(q) ||
          h.hadisBaslik.toLowerCase().includes(q) ||
          h.bolumBaslikTurkce.toLowerCase().includes(q) ||
          (h.aciklama && h.aciklama.toLowerCase().includes(q))
        );
      });
    }

    // Sıralama - Hadis numarasına göre
    filtered.sort((a, b) => {
      const aNo = parseInt(a.hadisNo || '0', 10);
      const bNo = parseInt(b.hadisNo || '0', 10);
      return aNo - bNo;
    });

    // Sayfalama
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return NextResponse.json({
      data: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit)
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}

