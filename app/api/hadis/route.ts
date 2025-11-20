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
  hadisHukmu?: string | null;
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

// HTML placeholder'ları temizle
function cleanHTMLPlaceholders(text: string): string {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  // Tüm __HTML_PLACEHOLDER_*__ kalıplarını kaldır
  return text.replace(/__HTML_PLACEHOLDER_\d+__/g, '').trim();
}

// Türkçe metinden kaynak bilgilerini ayır
function extractSourcesFromTurkish(turkce: string): { cleanText: string; sources: string } {
  if (!turkce || typeof turkce !== 'string') {
    return { cleanText: turkce || '', sources: '' };
  }

  let cleanText = turkce;
  let extractedSources = '';

  // Kaynak pattern'leri
  const sourcePatterns = [
    // Kaynak: veya Tahric: ile başlayanlar
    /(?:^|\n|\r\n)\s*(?:Kaynak|KAYNAK|Tahric|TAHRİC|Diğer tahric|Diğer Tahric|Diğer TAHRİC)\s*[:：]\s*(.+?)(?=\n\s*(?:Açıklama|Not|Şerh|İzah|Ravi|Raviler|$)|$)/gis,
    // Buhari, Muslim, Tirmizi vb. kaynak isimleri ile başlayanlar
    /\b(?:Buhari|Buharî|Buhârî|Muslim|Müslim|Tirmizi|Tirmizî|Ebu Davud|Ebû Davud|İbn-i Mace|İbn Mace|İbn-i Maceh|İbn Maceh|Malik|Muvatta|Ahmed|Müsned)(?:\s+[^\n]+)?/gi,
  ];

  // Kaynak bilgilerini bul ve çıkar
  const foundSources: string[] = [];
  
  // Önce "Kaynak:" veya "Tahric:" ile başlayanları bul
  const sourceHeaderPattern = /(?:^|\n|\r\n)\s*(?:Kaynak|KAYNAK|Tahric|TAHRİC|Diğer tahric|Diğer Tahric|Diğer TAHRİC)\s*[:：]\s*(.+?)(?=\n\s*(?:Açıklama|Not|Şerh|İzah|Ravi|Raviler|$)|$)/gis;
  let match;
  while ((match = sourceHeaderPattern.exec(turkce)) !== null) {
    if (match[1] && match[1].trim().length > 3) {
      foundSources.push(match[1].trim());
      // Metinden çıkar
      cleanText = cleanText.replace(match[0], '').trim();
    }
  }

  // Eğer kaynak başlığı bulunamadıysa, kaynak isimlerini ara
  if (foundSources.length === 0) {
    const sourceNamePattern = /\b(?:Buhari|Buharî|Buhârî|Muslim|Müslim|Tirmizi|Tirmizî|Ebu Davud|Ebû Davud|İbn-i Mace|İbn Mace|İbn-i Maceh|İbn Maceh|Malik|Muvatta|Ahmed|Müsned)(?:\s+[^\n]+)?/gi;
    const sourceMatches = turkce.match(sourceNamePattern);
    if (sourceMatches && sourceMatches.length > 0) {
      // Kaynak isimlerinden sonra gelen metni bul
      for (const sourceMatch of sourceMatches) {
        const sourceIndex = turkce.indexOf(sourceMatch);
        if (sourceIndex >= 0) {
          // Kaynak isminden sonraki metni al (satır sonuna kadar veya noktalama işaretine kadar)
          const afterSource = turkce.substring(sourceIndex + sourceMatch.length);
          const sourceText = (sourceMatch + afterSource.split(/[\.\n]/)[0]).trim();
          if (sourceText.length > sourceMatch.length + 5) {
            foundSources.push(sourceText);
            // Metinden çıkar
            cleanText = cleanText.replace(sourceText, '').trim();
          }
        }
      }
    }
  }

  if (foundSources.length > 0) {
    extractedSources = foundSources.join('; ').trim();
  }

  return {
    cleanText: cleanText.trim(),
    sources: extractedSources.trim(),
  };
}

// Türkçe metinden açıklamaları ayır
function extractExplanationFromTurkish(turkce: string): { cleanText: string; explanation: string } {
  if (!turkce || typeof turkce !== 'string') {
    return { cleanText: turkce || '', explanation: '' };
  }

  let cleanText = turkce;
  let extractedExplanation = '';

  // Açıklama pattern'leri (sırayla kontrol et, en spesifik olanlar önce)
  const explanationPatterns = [
    // Açıklama: veya AÇIKLAMA: ile başlayanlar
    /(?:^|\n|\r\n)\s*(?:Açıklama|AÇIKLAMA)\s*[:：]\s*(.+?)(?=\n\s*(?:Not|Şerh|İzah|Kaynak|Tahric|Ravi|Raviler|$)|$)/gis,
    // Not: ile başlayanlar
    /(?:^|\n|\r\n)\s*Not\s*[:：]\s*(.+?)(?=\n\s*(?:Açıklama|Şerh|İzah|Kaynak|Tahric|Ravi|Raviler|$)|$)/gis,
    // Şerh: ile başlayanlar
    /(?:^|\n|\r\n)\s*Şerh\s*[:：]\s*(.+?)(?=\n\s*(?:Açıklama|Not|İzah|Kaynak|Tahric|Ravi|Raviler|$)|$)/gis,
    // İzah: ile başlayanlar
    /(?:^|\n|\r\n)\s*İzah\s*[:：]\s*(.+?)(?=\n\s*(?:Açıklama|Not|Şerh|Kaynak|Tahric|Ravi|Raviler|$)|$)/gis,
    // Dipnot: ile başlayanlar
    /(?:^|\n|\r\n)\s*Dipnot\s*[:：]\s*(.+?)(?=\n\s*(?:Açıklama|Not|Şerh|İzah|Kaynak|Tahric|Ravi|Raviler|$)|$)/gis,
  ];

  // Tüm açıklama pattern'lerini kontrol et
  for (const pattern of explanationPatterns) {
    const matches = [...turkce.matchAll(pattern)];
    if (matches.length > 0) {
      // Son eşleşmeyi al (en alttaki açıklama)
      const lastMatch = matches[matches.length - 1];
      if (lastMatch && lastMatch[1]) {
        const explanationText = lastMatch[1].trim();
        if (explanationText.length > 10) {
          // Açıklamayı metinden çıkar
          cleanText = turkce.replace(pattern, '').trim();
          // Eğer birden fazla eşleşme varsa, hepsini birleştir
          if (matches.length > 1) {
            extractedExplanation = matches.map(m => m[1]?.trim()).filter(Boolean).join('\n\n');
          } else {
            extractedExplanation = explanationText;
          }
          break; // İlk eşleşmede dur
        }
      }
    }
  }

  // Eğer açıklama bulunamadıysa, daha genel pattern'ler dene
  if (!extractedExplanation) {
    // "Açıklama" kelimesi geçiyorsa ve sonrasında metin varsa
    const generalPattern = /(?:^|\n|\r\n)\s*(?:Açıklama|AÇIKLAMA|Not|Şerh|İzah|Dipnot)\s*[:：]?\s*(.+)/gi;
    const match = turkce.match(generalPattern);
    if (match && match.length > 0) {
      const lastMatch = match[match.length - 1];
      const explanationStart = turkce.indexOf(lastMatch);
      if (explanationStart > 0) {
        const beforeExplanation = turkce.substring(0, explanationStart).trim();
        const afterExplanation = turkce.substring(explanationStart + lastMatch.length).trim();
        
        // Eğer açıklama kısmı yeterince uzunsa
        if (afterExplanation.length > 10 || lastMatch.length > 20) {
          cleanText = beforeExplanation;
          extractedExplanation = (lastMatch.replace(/^(?:Açıklama|AÇIKLAMA|Not|Şerh|İzah|Dipnot)\s*[:：]?\s*/i, '') + ' ' + afterExplanation).trim();
        }
      }
    }
  }

  return {
    cleanText: cleanText.trim(),
    explanation: extractedExplanation.trim(),
  };
}

// Hadis hükmünü tespit et (sahih, hasen, zayıf, mevzû)
function detectHadisHukmu(turkce: string, aciklama: string, bolumBaslik: string): string | null {
  const searchText = `${turkce} ${aciklama} ${bolumBaslik}`.toLowerCase();
  
  // Kitap isimlerini hariç tut (sahih-i buhari, sahih-i müslim gibi)
  const kitapIsimleri = [
    'sahih-i buhari',
    'sahih-i müslim',
    'sahih-i muslim',
    'sahih buhari',
    'sahih müslim',
    'sahih muslim',
  ];
  
  // Kitap isimlerini geçici olarak değiştir
  let cleanedText = searchText;
  for (const kitap of kitapIsimleri) {
    cleanedText = cleanedText.replace(new RegExp(kitap, 'gi'), 'KITAP_ISMI');
  }
  
  // Zayıf terimleri (en spesifik olanlar önce)
  const zayifPatterns = [
    /\bzayıf hadis\b/,
    /\bzayif olan\b/,
    /\bzayiftir\b/,
    /\bzayifdir\b/,
    /\bzayif\b/,
    /\bdaif\b/,
    /\bdaif hadis\b/,
    /\bdaiftir\b/,
  ];
  
  // Mevzû terimleri (en spesifik olanlar önce)
  const mevzuPatterns = [
    /\bmevzû hadis\b/,
    /\bmevzu hadis\b/,
    /\buydurma hadis\b/,
    /\bmevzû olan\b/,
    /\bmevzu olan\b/,
    /\bmevzudur\b/,
    /\bmevzutur\b/,
    /\bmevzû\b/,
    /\bmevzu\b/,
    /\buydurma\b/,
  ];
  
  // Hasen terimleri (en spesifik olanlar önce)
  const hasenPatterns = [
    /\bhasen hadis\b/,
    /\bhasen olan\b/,
    /\bhasendir\b/,
    /\bhasentir\b/,
    /\bhasen\b/,
  ];
  
  // Sahih terimleri (en spesifik olanlar önce, kitap isimlerinden sonra kontrol et)
  const sahihPatterns = [
    /\bsahih hadis\b/,
    /\bsahih olan\b/,
    /\bsahihtir\b/,
    /\bsahihdir\b/,
    /\bsahih\b/,
  ];
  
  // Öncelik sırası: Zayıf > Mevzû > Hasen > Sahih (en spesifik olanlar önce)
  // Zayıf ve Mevzû daha önemli çünkü bunlar uyarı gerektirir
  for (const pattern of zayifPatterns) {
    if (pattern.test(cleanedText)) {
      return 'Zayıf';
    }
  }
  
  for (const pattern of mevzuPatterns) {
    if (pattern.test(cleanedText)) {
      return 'Mevzû';
    }
  }
  
  for (const pattern of hasenPatterns) {
    if (pattern.test(cleanedText)) {
      return 'Hasen';
    }
  }
  
  // Sahih'i en son kontrol et (çünkü kitap isimlerinde de geçebilir)
  for (const pattern of sahihPatterns) {
    if (pattern.test(cleanedText)) {
      return 'Sahih';
    }
  }
  
  return null;
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
        if (!Array.isArray(item) || item.length <= 10) return false;
        
        const turkce = String(item[2] || '').trim();
        // Türkçe metin boş olmamalı ve yeterince uzun olmalı
        if (!turkce || turkce.length < 20) return false;
        
        // Sadece boşluk veya özel karakterlerden oluşan metinleri filtrele
        if (/^[\s\W]*$/.test(turkce)) return false;
        
        return true;
      })
      .map((item, index) => {
        const kitapNo = String(item[6] || '');
        const bolumNo = String(item[7] || '');
        const bolumKey = `${kitapNo}-${bolumNo}`;
        
        let turkce = String(item[2] || '').trim();
        let aciklama = String(item[3] || '').trim();
        let arapca = String(item[1] || '').trim();
        let bolumBaslik = bolumBasliklari?.get(bolumKey) || '';
        
        // HTML placeholder'ları temizle
        turkce = cleanHTMLPlaceholders(turkce);
        aciklama = cleanHTMLPlaceholders(aciklama);
        arapca = cleanHTMLPlaceholders(arapca);
        bolumBaslik = cleanHTMLPlaceholders(bolumBaslik);
        
        // Türkçe metinden kaynak bilgilerini ayır
        const { cleanText: turkceWithoutSources, sources: extractedSources } = extractSourcesFromTurkish(turkce);
        turkce = turkceWithoutSources;
        
        // Türkçe metin içinde kalan açıklamaları ayır
        const { cleanText: cleanedTurkceText, explanation: extractedExplanation } = extractExplanationFromTurkish(turkce);
        turkce = cleanedTurkceText;
        
        // Çıkarılan açıklamayı da temizle
        let cleanedExtractedExplanation = extractedExplanation ? cleanHTMLPlaceholders(extractedExplanation) : '';
        
        // Kaynak bilgilerini temizle
        let cleanedSources = extractedSources ? cleanHTMLPlaceholders(extractedSources) : '';
        
        // Açıklamaları birleştir (kaynak bilgilerini de ekle)
        const explanationParts = [];
        if (cleanedExtractedExplanation) {
          explanationParts.push(cleanedExtractedExplanation);
        }
        if (cleanedSources) {
          explanationParts.push(`Kaynak: ${cleanedSources}`);
        }
        if (aciklama) {
          explanationParts.push(aciklama);
        }
        let combinedExplanation = explanationParts.join('\n\n').trim();
        
        // Birleştirilmiş açıklamayı da tekrar temizle (güvenlik için)
        combinedExplanation = cleanHTMLPlaceholders(combinedExplanation);
        
        // Hadis hükmünü tespit et
        const hadisHukmu = detectHadisHukmu(
          turkce.trim(),
          combinedExplanation.trim(),
          bolumBaslik
        );
        
        // Veri yapısına göre hadis bilgilerini çıkar
        const hadis: Hadis = {
          id: String(item[0] || index),
          kitapNo,
          bolumNo,
          bolumBaslik: bolumBaslik,
          hadisNo: String(item[8] || ''),
          arapca: arapca,
          turkce: turkce.trim(),
          aciklama: combinedExplanation || '',
          hadisHukmu: hadisHukmu || null,
        };
        return hadis;
      })
      .filter((hadis) => hadis && hadis.turkce && hadis.turkce.trim().length > 10);
    
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

