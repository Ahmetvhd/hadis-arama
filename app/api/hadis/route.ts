import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Hadis {
  id: string;
  kitapNo: string;
  bolumNo: string;
  bolumBaslik: string;
  hadisNo: string;
  arapca: string;
  turkce: string;
  aciklama: string;
  [key: string]: any;
}

let hadisData: Hadis[] | null = null;
let bolumBasliklari: Map<string, string> | null = null;

// Türkçe karakter normalizasyonu
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c');
}

// Metni temizle ve arama için hazırla
function prepareSearchText(text: string): string {
  return normalizeText(text)
    .replace(/[^\w\s]/g, ' ') // Özel karakterleri boşlukla değiştir
    .replace(/\s+/g, ' ') // Birden fazla boşluğu tek boşluğa çevir
    .trim();
}


function loadHadisData(): Hadis[] {
  if (hadisData) {
    return hadisData;
  }

  try {
    const hadislerJsonDir = path.join(process.cwd(), 'hadislerjson');
    const partFiles = ['hadisler_part_1.json', 'hadisler_part_2.json', 'hadisler_part_3.json'];
    
    let allRawData: any[][] = [];
    let firstPartProcessed = false;
    
    // Tüm parça dosyalarını oku
    for (const partFile of partFiles) {
      const filePath = path.join(hadislerJsonDir, partFile);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const rawData: any[][] = JSON.parse(fileContent);
        
        // İlk dosyadan bölüm başlıklarını parse et
        if (!firstPartProcessed && rawData.length > 0 && Array.isArray(rawData[0]) && rawData[0].length > 100) {
          bolumBasliklari = new Map();
          const basliklar = rawData[0];
          // Her 4 eleman bir bölüm: [id, kitapNo, bolumNo, baslik]
          for (let i = 0; i < basliklar.length - 3; i += 4) {
            const bolumKey = `${basliklar[i+1]}-${basliklar[i+2]}`;
            bolumBasliklari.set(bolumKey, String(basliklar[i+3] || ''));
          }
          firstPartProcessed = true;
        }
        
        allRawData = allRawData.concat(rawData);
      }
    }
    
    hadisData = allRawData
      .filter((item, index) => {
        // İlk kayıt bölüm başlıkları, onu atla
        if (index === 0) return false;
        // Gerçek hadis kayıtlarını filtrele - Türkçe metin içeren kayıtlar
        // Yapı: [id, arapca(1), turkce(2), aciklama(3), ..., kitapNo(6), bolumNo(7), hadisNo(8), ...]
        return Array.isArray(item) && item.length > 10 && 
               typeof item[2] === 'string' && item[2].trim().length > 0 &&
               item[2].length > 20; // Gerçek hadis metni olmalı
      })
      .map((item, index) => {
        const kitapNo = String(item[6] || '');
        const bolumNo = String(item[7] || '');
        const bolumKey = `${kitapNo}-${bolumNo}`;
        
        let turkce = String(item[2] || '');
        let aciklama = String(item[3] || '');
        
        // Eğer açıklama Türkçe metin içinde birleşik geliyorsa ayır
        // Açıklama genellikle "Açıklama:", "Not:", "Dipnot:" gibi kelimelerle başlar
        if (turkce && aciklama) {
          // Türkçe metin içinde açıklama varsa ve ayrı bir açıklama alanı da varsa
          // Türkçe metinden açıklama kısmını çıkar
          const aciklamaPatterns = [
            /(?:^|\n)\s*(?:Açıklama|Not|Dipnot|Açıklama:|Not:|Dipnot:)\s*[:]\s*(.+)/i,
            /(?:^|\n)\s*(?:Açıklama|Not|Dipnot)\s*[:]\s*(.+)/i
          ];
          
          for (const pattern of aciklamaPatterns) {
            const match = turkce.match(pattern);
            if (match && match[1]) {
              // Türkçe metinden açıklama kısmını çıkar
              turkce = turkce.replace(pattern, '').trim();
              // Eğer ayrı bir açıklama yoksa, bulduğumuz açıklamayı kullan
              if (!aciklama || aciklama.trim().length < 10) {
                aciklama = match[1].trim();
              }
            }
          }
        }
        
        // Veri yapısına göre hadis bilgilerini çıkar
        const hadis: Hadis = {
          id: String(item[0] || index),
          kitapNo,
          bolumNo,
          bolumBaslik: bolumBasliklari?.get(bolumKey) || '',
          hadisNo: String(item[8] || ''),
          arapca: String(item[1] || ''),
          turkce: turkce.trim(),
          aciklama: aciklama.trim(),
        };
        return hadis;
      })
      .filter((hadis) => hadis.turkce && hadis.turkce.trim().length > 20);
    
    return hadisData;
  } catch (error) {
    console.error('Hadis verileri yüklenirken hata:', error);
    return [];
  }
}

// Alim isimleri ve arama terimleri
const ALIM_ISIMLERI: Record<string, string> = {
  'buhari': 'Sahih-i Buhari',
  'muslim': 'Sahih-i Müslim',
  'tirmizi': 'Sünen Tirmizi',
  'ebu-davud': 'Sünen Ebu Davud',
  'ibn-mace': 'Sünen İbn-i Mace',
  'malik': 'Muvatta Malik',
  'ahmed': 'Müsned Ahmed',
};

const ALIM_ARAMA_TERIMLERI: Record<string, string[]> = {
  'buhari': ['buhari', 'buharî', 'buhârî', 'buhari\'nin', 'buhari\'de'],
  'muslim': ['müslim', 'muslim', 'müslim\'in', 'muslim\'in', 'müslim\'de', 'muslim\'de', 'sahih-i müslim'],
  'tirmizi': ['tirmizi', 'tirmizî', 'tirmizi\'nin', 'tirmizi\'de', 'sünen tirmizi'],
  'ebu-davud': ['ebu davud', 'ebu davud\'un', 'ebû davud', 'ebu davud\'da', 'sünen ebu davud'],
  'ibn-mace': ['ibn-i mace', 'ibn mace', 'ibn-i maceh', 'ibn maceh', 'ibn-i mace\'nin', 'ibn-i mace\'de', 'sünen ibn-i mace'],
  'malik': ['muvatta', 'malik', 'malik\'in', 'malik\'de', 'muvatta malik'],
  'ahmed': ['müsned', 'ahmed', 'ahmed b. hanbel', 'ahmed bin hanbel', 'ahmed\'in', 'müsned ahmed'],
};

// Kategori isimleri ve arama terimleri
const KATEGORI_ISIMLERI: Record<string, string> = {
  'ilim': 'İlim',
  'dua': 'Dua',
  'iman': 'İman',
  'ibadet': 'İbadet',
  'selam': 'Selam',
  'zikir': 'Zikir',
  'tevekkul': 'Tevekkül',
  'fitrat': 'Fıtrat',
  'tevbe': 'Tevbe',
  'sirk': 'Şirk',
  'tevhid': 'Tevhid',
};

const KATEGORI_ARAMA_TERIMLERI: Record<string, string[]> = {
  'ilim': ['ilim', 'ilmi', 'alim', 'alimler', 'ilim öğrenmek', 'ilim tahsil', 'ilim ehli'],
  'dua': ['dua', 'dua etmek', 'dua edin', 'dua eder', 'dua edelim', 'dua ediyor'],
  'iman': ['iman', 'imân', 'iman etmek', 'mümin', 'müminler', 'iman eden'],
  'ibadet': ['ibadet', 'ibadet etmek', 'ibadet edin', 'ibadet eder', 'ibadetler'],
  'selam': ['selam', 'selâm', 'selam vermek', 'selam verin', 'selamlaşmak'],
  'zikir': ['zikir', 'zikretmek', 'zikir edin', 'zikir eder', 'zikirler'],
  'tevekkul': ['tevekkül', 'tevekkül etmek', 'tevekkül edin', 'tevekkül eder'],
  'fitrat': ['fıtrat', 'fitrat', 'fıtrat üzere', 'fıtrat üzerine'],
  'tevbe': ['tevbe', 'tevbe etmek', 'tevbe edin', 'tevbe eder', 'tevbe eden'],
  'sirk': ['şirk', 'sirk', 'şirk koşmak', 'şirk koşan', 'şirk koşmayın'],
  'tevhid': ['tevhid', 'tevhid inancı', 'tevhid akidesi', 'tevhid ehli'],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const kitapNo = searchParams.get('kitap') || '';
  const bolumNo = searchParams.get('bolum') || '';
  const alim = searchParams.get('alim') || '';
  const kategori = searchParams.get('kategori') || '';
  const listKitaplar = searchParams.get('listKitaplar') === 'true';
  const listBolumler = searchParams.get('listBolumler') === 'true';
  const listAlimler = searchParams.get('listAlimler') === 'true';
  const listKategoriler = searchParams.get('listKategoriler') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const allHadis = loadHadisData();
  
  // Alimler listesi isteniyorsa
  if (listAlimler) {
    const alimMap = new Map<string, number>();
    
    Object.keys(ALIM_ISIMLERI).forEach((alimId) => {
      const aramaTerimleri = ALIM_ARAMA_TERIMLERI[alimId] || [];
      let count = 0;
      
      allHadis.forEach((hadis) => {
        const turkceText = hadis.turkce.toLowerCase();
        const aciklamaText = hadis.aciklama.toLowerCase();
        const bolumText = hadis.bolumBaslik.toLowerCase();
        
        // Önce Türkçe metinde ara, sonra açıklamada
        const found = aramaTerimleri.some(terim => {
          const terimLower = terim.toLowerCase();
          return turkceText.includes(terimLower) || 
                 aciklamaText.includes(terimLower) || 
                 bolumText.includes(terimLower);
        });
        
        if (found) {
          count++;
        }
      });
      
      if (count > 0) {
        alimMap.set(alimId, count);
      }
    });
    
    const alimList = Array.from(alimMap.entries())
      .map(([id, count]) => ({
        id,
        name: ALIM_ISIMLERI[id],
        hadisSayisi: count,
      }))
      .sort((a, b) => b.hadisSayisi - a.hadisSayisi);
    
    return NextResponse.json({
      alimler: alimList,
      total: alimList.length,
    });
  }
  
  // Kategoriler listesi isteniyorsa
  if (listKategoriler) {
    const kategoriMap = new Map<string, number>();
    
    Object.keys(KATEGORI_ISIMLERI).forEach((kategoriId) => {
      const aramaTerimleri = KATEGORI_ARAMA_TERIMLERI[kategoriId] || [];
      let count = 0;
      
      allHadis.forEach((hadis) => {
        const turkceText = hadis.turkce.toLowerCase();
        const aciklamaText = hadis.aciklama.toLowerCase();
        const bolumText = hadis.bolumBaslik.toLowerCase();
        
        // Önce Türkçe metinde ara, sonra açıklamada
        const found = aramaTerimleri.some(terim => {
          const terimLower = terim.toLowerCase();
          return turkceText.includes(terimLower) || 
                 aciklamaText.includes(terimLower) || 
                 bolumText.includes(terimLower);
        });
        
        if (found) {
          count++;
        }
      });
      
      if (count > 0) {
        kategoriMap.set(kategoriId, count);
      }
    });
    
    const kategoriList = Array.from(kategoriMap.entries())
      .map(([id, count]) => ({
        id,
        name: KATEGORI_ISIMLERI[id],
        hadisSayisi: count,
      }))
      .sort((a, b) => b.hadisSayisi - a.hadisSayisi);
    
    return NextResponse.json({
      kategoriler: kategoriList,
      total: kategoriList.length,
    });
  }
  
  // Kitaplar listesi isteniyorsa
  if (listKitaplar) {
    const kitapMap = new Map<string, { name: string; bolumSayisi: number; hadisSayisi: number }>();
    
    allHadis.forEach((hadis) => {
      if (hadis.kitapNo) {
        const existing = kitapMap.get(hadis.kitapNo);
        const bolumler = new Set<string>();
        
        // Aynı kitaptaki tüm hadisleri topla
        allHadis.forEach((h) => {
          if (h.kitapNo === hadis.kitapNo && h.bolumNo) {
            bolumler.add(h.bolumNo);
          }
        });
        
        if (!existing) {
          const hadisSayisi = allHadis.filter((h) => h.kitapNo === hadis.kitapNo).length;
          kitapMap.set(hadis.kitapNo, {
            name: `Kitap ${hadis.kitapNo}`,
            bolumSayisi: bolumler.size,
            hadisSayisi,
          });
        }
      }
    });
    
    const kitapList = Array.from(kitapMap.entries())
      .map(([no, info]) => ({ no, ...info }))
      .sort((a, b) => parseInt(a.no) - parseInt(b.no));
    
    return NextResponse.json({
      kitaplar: kitapList,
      total: kitapList.length,
    });
  }
  
  // Bölümler listesi isteniyorsa (kitap numarasına göre)
  if (listBolumler && kitapNo) {
    const bolumMap = new Map<string, { name: string; hadisSayisi: number }>();
    
    allHadis.forEach((hadis) => {
      if (hadis.kitapNo === kitapNo && hadis.bolumNo) {
        const existing = bolumMap.get(hadis.bolumNo);
        if (!existing) {
          const hadisSayisi = allHadis.filter(
            (h) => h.kitapNo === kitapNo && h.bolumNo === hadis.bolumNo
          ).length;
          bolumMap.set(hadis.bolumNo, {
            name: hadis.bolumBaslik || `Bölüm ${hadis.bolumNo}`,
            hadisSayisi,
          });
        }
      }
    });
    
    const bolumList = Array.from(bolumMap.entries())
      .map(([no, info]) => ({ no, ...info }))
      .sort((a, b) => parseInt(a.no) - parseInt(b.no));
    
    return NextResponse.json({
      bolumler: bolumList,
      total: bolumList.length,
      kitapNo,
    });
  }
  
  let filtered = allHadis;

  // Gelişmiş metin araması
  if (query) {
    const normalizedQuery = prepareSearchText(query);
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 0);
    
    // Her hadis için relevance skoru hesapla
    const hadisWithScores = filtered.map((hadis) => {
      const turkceText = prepareSearchText(hadis.turkce);
      const arapcaText = prepareSearchText(hadis.arapca);
      const bolumText = prepareSearchText(hadis.bolumBaslik);
      const aciklamaText = prepareSearchText(hadis.aciklama);
      
      let score = 0;
      let matchedWords = 0;
      
      // Her kelime için skor hesapla
      for (const word of queryWords) {
        let wordScore = 0;
        
        // Türkçe metinde tam eşleşme (en yüksek skor)
        if (turkceText.includes(word)) {
          const index = turkceText.indexOf(word);
          // Başta geçiyorsa daha yüksek skor
          wordScore += index < 50 ? 10 : 5;
        }
        
        // Bölüm başlığında geçiyorsa
        if (bolumText.includes(word)) {
          wordScore += 8;
        }
        
        // Açıklamada geçiyorsa
        if (aciklamaText.includes(word)) {
          wordScore += 3;
        }
        
        // Arapça metinde geçiyorsa
        if (arapcaText.includes(word)) {
          wordScore += 2;
        }
        
        if (wordScore > 0) {
          score += wordScore;
          matchedWords++;
        }
      }
      
      // Tüm kelimeler eşleştiyse bonus skor
      if (matchedWords === queryWords.length && queryWords.length > 1) {
        score += 5;
      }
      
      // Tam cümle eşleşmesi varsa ekstra bonus
      const fullQuery = normalizedQuery.replace(/\s+/g, ' ');
      if (turkceText.includes(fullQuery)) {
        score += 15;
      }
      
      return { hadis, score, matchedWords };
    });
    
    // Sadece eşleşen hadisleri filtrele ve skora göre sırala
    filtered = hadisWithScores
      .filter(item => item.score > 0)
      .sort((a, b) => {
        // Önce skora göre, sonra eşleşen kelime sayısına göre
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.matchedWords - a.matchedWords;
      })
      .map(item => item.hadis);
  }

  // Kitap filtresi
  if (kitapNo) {
    filtered = filtered.filter((hadis) => hadis.kitapNo === kitapNo);
  }

  // Bölüm filtresi
  if (bolumNo) {
    filtered = filtered.filter((hadis) => hadis.bolumNo === bolumNo);
  }

  // Alim filtresi
  if (alim && ALIM_ARAMA_TERIMLERI[alim]) {
    const aramaTerimleri = ALIM_ARAMA_TERIMLERI[alim];
    const hadisWithPriority = filtered.map((hadis) => {
      const turkceText = hadis.turkce.toLowerCase();
      const aciklamaText = hadis.aciklama.toLowerCase();
      const bolumText = hadis.bolumBaslik.toLowerCase();
      
      // Önce Türkçe metinde ara
      const turkceMatch = aramaTerimleri.some(terim => turkceText.includes(terim.toLowerCase()));
      // Sonra açıklamada ara
      const aciklamaMatch = aramaTerimleri.some(terim => aciklamaText.includes(terim.toLowerCase()));
      // Bölüm başlığında ara
      const bolumMatch = aramaTerimleri.some(terim => bolumText.includes(terim.toLowerCase()));
      
      if (turkceMatch || aciklamaMatch || bolumMatch) {
        // Öncelik: Türkçe metin > Açıklama > Bölüm başlığı
        let priority = 0;
        if (turkceMatch) priority = 3;
        else if (aciklamaMatch) priority = 2;
        else if (bolumMatch) priority = 1;
        
        return { hadis, priority, match: true };
      }
      return { hadis, priority: 0, match: false };
    });
    
    filtered = hadisWithPriority
      .filter(item => item.match)
      .sort((a, b) => b.priority - a.priority)
      .map(item => item.hadis);
  }

  // Kategori filtresi
  if (kategori && KATEGORI_ARAMA_TERIMLERI[kategori]) {
    const aramaTerimleri = KATEGORI_ARAMA_TERIMLERI[kategori];
    const hadisWithPriority = filtered.map((hadis) => {
      const turkceText = hadis.turkce.toLowerCase();
      const aciklamaText = hadis.aciklama.toLowerCase();
      const bolumText = hadis.bolumBaslik.toLowerCase();
      
      // Önce Türkçe metinde ara
      const turkceMatch = aramaTerimleri.some(terim => turkceText.includes(terim.toLowerCase()));
      // Sonra açıklamada ara
      const aciklamaMatch = aramaTerimleri.some(terim => aciklamaText.includes(terim.toLowerCase()));
      // Bölüm başlığında ara
      const bolumMatch = aramaTerimleri.some(terim => bolumText.includes(terim.toLowerCase()));
      
      if (turkceMatch || aciklamaMatch || bolumMatch) {
        // Öncelik: Türkçe metin > Açıklama > Bölüm başlığı
        let priority = 0;
        if (turkceMatch) priority = 3;
        else if (aciklamaMatch) priority = 2;
        else if (bolumMatch) priority = 1;
        
        return { hadis, priority, match: true };
      }
      return { hadis, priority: 0, match: false };
    });
    
    filtered = hadisWithPriority
      .filter(item => item.match)
      .sort((a, b) => b.priority - a.priority)
      .map(item => item.hadis);
  }

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
}

