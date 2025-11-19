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
        
        // Veri yapısına göre hadis bilgilerini çıkar
        const hadis: Hadis = {
          id: String(item[0] || index),
          kitapNo,
          bolumNo,
          bolumBaslik: bolumBasliklari?.get(bolumKey) || '',
          hadisNo: String(item[8] || ''),
          arapca: String(item[1] || ''),
          turkce: String(item[2] || ''),
          aciklama: String(item[3] || ''),
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const kitapNo = searchParams.get('kitap') || '';
  const bolumNo = searchParams.get('bolum') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const allHadis = loadHadisData();
  
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

