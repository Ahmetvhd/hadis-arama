import { NextRequest, NextResponse } from 'next/server';

/**
 * YENİ TEMİZ HADİS API - Site yapısına göre düzenlenmiş
 * Referans: https://www.islamiokul.com/kitap/files/buh/had/002/0008.htm
 */

interface Hadis {
  id: string;
  kitapNo: string;
  kitapAdi: string; // "KİTABU'L İMAN"
  bolumNo: string;
  bolumBaslikArapca: string; // "باب الإيمان..."
  bolumBaslikTurkce: string;
  hadisNo: string; // "8"
  hadisBaslik: string; // "1. NEBİ S.A.V.'İN: ''İSLAM BEŞ TEMEL...''"
  altBaslik?: string; // "2. Duanız İmânınızdır"
  raviZinciri: string; // Arapça ravi zinciri
  hadisMetniArapca: string;
  hadisMetniTurkce: string;
  tekrarNo?: string; // "4515"
  digerTahric?: string; // "Müslim, İman; Tirmizî, İman"
  aciklama?: string;
  uyarilar?: string;
  hadisHukmu?: 'Sahih' | 'Hasen' | 'Zayıf' | 'Mevzû' | null;
}

// Cache
let hadisDataCache: Hadis[] | null = null;
let rawDataCache: any[][] | null = null;
let isDownloading = false;

/**
 * GitHub Release'den hadis verilerini indir
 */
async function downloadHadisData(): Promise<any[][]> {
  if (rawDataCache) {
    return rawDataCache;
  }

  if (isDownloading) {
    let waitCount = 0;
    while (isDownloading && waitCount < 120) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waitCount++;
    }
    if (rawDataCache) {
      return rawDataCache;
    }
  }

  isDownloading = true;
  const releaseUrl = 'https://github.com/Ahmetvhd/hadis-arama/releases/download/v1.0/hadisler.json';

  try {
    console.log('GitHub Release\'den hadisler.json indiriliyor...');
    const response = await fetch(releaseUrl);
    
    if (!response.ok) {
      throw new Error(`İndirme başarısız: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('hadisler.json başarıyla indirildi,', data.length, 'kayıt');
    
    // Raw data cache'e kaydet
    rawDataCache = data;
    isDownloading = false;
    return data;
  } catch (error) {
    isDownloading = false;
    console.error('İndirme hatası:', error);
    throw error;
  }
}

/**
 * Veri yapısını parse et - Site yapısına göre
 * Veri: [id, arapca(1), turkce(2), boş(3), aciklama(4), boş(5), kitapNo(6), bolumNo(7), hadisNo(8), ...]
 */
function parseHadisData(rawData: any[][]): Hadis[] {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return [];
  }

  // Bölüm başlıklarını parse et (ilk kayıt)
  const bolumBasliklari = new Map<string, { arapca: string; turkce: string }>();
  
  if (rawData.length > 0 && Array.isArray(rawData[0]) && rawData[0].length > 100) {
    const basliklar = rawData[0];
    for (let i = 0; i < basliklar.length - 3; i += 4) {
      const kitapNo = String(basliklar[i + 1] || '');
      const bolumNo = String(basliklar[i + 2] || '');
      const bolumKey = `${kitapNo}-${bolumNo}`;
      const baslik = String(basliklar[i + 3] || '');
      // Başlık Arapça olabilir, Türkçe çevirisi ayrı olabilir
      bolumBasliklari.set(bolumKey, {
        arapca: baslik,
        turkce: baslik // Şimdilik aynı, sonra ayrıştırılabilir
      });
    }
  }

  const allRawData = rawData.length > 0 && Array.isArray(rawData[0]) && rawData[0].length > 100
    ? rawData.slice(1)
    : rawData;

  const hadisler: Hadis[] = [];

  for (let i = 0; i < allRawData.length; i++) {
    const item = allRawData[i];
    
    if (!Array.isArray(item) || item.length < 9) continue;

    const id = String(item[0] || i);
    const arapca = String(item[1] || '').trim();
    const turkce = String(item[2] || '').trim();
    const aciklama = String(item[4] || item[3] || '').trim();
    const kitapNo = String(item[6] || '').trim();
    const bolumNo = String(item[7] || '').trim();
    const hadisNo = String(item[8] || '').trim();

    // En az bir alan dolu olmalı
    if (!turkce && !arapca && !aciklama) continue;

    const bolumKey = `${kitapNo}-${bolumNo}`;
    const bolumBaslik = bolumBasliklari.get(bolumKey) || { arapca: '', turkce: '' };

    // Hadis başlığını türkçe metinden çıkar (ilk satır veya özel format)
    let hadisBaslik = '';
    const turkceLines = turkce.split('\n').filter(l => l.trim());
    if (turkceLines.length > 0) {
      const firstLine = turkceLines[0].trim();
      // Eğer başlık formatı varsa (örn: "1. NEBİ S.A.V.'İN: ...")
      if (/^\d+\.\s+/.test(firstLine)) {
        hadisBaslik = firstLine;
      }
    }

    // Ravi zincirini arapça metinden çıkar
    let raviZinciri = '';
    const arapcaLines = arapca.split('\n').filter(l => l.trim());
    if (arapcaLines.length > 0) {
      // Ravi zinciri genellikle "حدثنا" veya "أخبرنا" ile başlar
      const raviMatch = arapca.match(/(حدثنا|أخبرنا|عن)[^]*?(قال|أن|أنبأ)/);
      if (raviMatch) {
        raviZinciri = raviMatch[0].trim();
      }
    }

    // Tekrar numarasını ve diğer tahric bilgilerini çıkar
    let tekrarNo = '';
    let digerTahric = '';
    
    const tekrarMatch = aciklama.match(/Tekrarı:\s*(\d+)/i);
    if (tekrarMatch) {
      tekrarNo = tekrarMatch[1];
    }

    const tahricMatch = aciklama.match(/Diğer\s+Tahric[^:]*:\s*([^)]+)/i);
    if (tahricMatch) {
      digerTahric = tahricMatch[1].trim();
    }

    // Hadis hükmünü tespit et
    const hadisHukmu = detectHadisHukmu(turkce, aciklama);

    const hadis: Hadis = {
      id,
      kitapNo,
      kitapAdi: `Kitap ${kitapNo}`, // Daha sonra kitap isimleri eklenecek
      bolumNo,
      bolumBaslikArapca: bolumBaslik.arapca,
      bolumBaslikTurkce: bolumBaslik.turkce,
      hadisNo,
      hadisBaslik: hadisBaslik || `Hadis ${hadisNo}`,
      raviZinciri,
      hadisMetniArapca: arapca,
      hadisMetniTurkce: turkce,
      tekrarNo: tekrarNo || undefined,
      digerTahric: digerTahric || undefined,
      aciklama: aciklama || undefined,
      hadisHukmu,
    };

    hadisler.push(hadis);
  }

  return hadisler;
}

/**
 * Hadis hükmünü tespit et
 */
function detectHadisHukmu(turkce: string, aciklama: string): 'Sahih' | 'Hasen' | 'Zayıf' | 'Mevzû' | null {
  const text = (turkce + ' ' + aciklama).toLowerCase();

  if (/\b(zayıf|zayif|daif)\b/.test(text)) return 'Zayıf';
  if (/\b(mevzû|mevzu|uydurma)\b/.test(text)) return 'Mevzû';
  if (/\b(hasen)\b/.test(text)) return 'Hasen';
  if (/\b(sahih)\b/.test(text)) return 'Sahih';

  return null;
}

/**
 * Hadis verilerini yükle
 */
async function loadHadisData(): Promise<Hadis[]> {
  if (hadisDataCache) {
    return hadisDataCache;
  }

  try {
    const rawData = await downloadHadisData();
    hadisDataCache = parseHadisData(rawData);
    return hadisDataCache;
  } catch (error) {
    console.error('Hadis verileri yüklenirken hata:', error);
    return [];
  }
}

/**
 * API Route - GET
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const kitapNo = searchParams.get('kitap') || '';
  const bolumNo = searchParams.get('bolum') || '';
  const hadisNo = searchParams.get('hadisNo') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const allHadis = await loadHadisData();
    let filtered = [...allHadis];

    // Hadis numarası araması
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
      const queryLower = query.toLowerCase();
      filtered = filtered.filter(h => {
        return (
          h.hadisMetniTurkce.toLowerCase().includes(queryLower) ||
          h.hadisMetniArapca.toLowerCase().includes(queryLower) ||
          h.hadisBaslik.toLowerCase().includes(queryLower) ||
          h.bolumBaslikTurkce.toLowerCase().includes(queryLower) ||
          (h.aciklama && h.aciklama.toLowerCase().includes(queryLower))
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
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = filtered.slice(startIndex, endIndex);

    return NextResponse.json({
      data: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    });
  } catch (error: any) {
    console.error('API hatası:', error);
    return NextResponse.json(
      { 
        error: 'Veri yüklenirken hata oluştu',
        message: error?.message || 'Bilinmeyen hata',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

