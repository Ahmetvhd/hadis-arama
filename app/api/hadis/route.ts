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
let rawDataCache: any[][] | null = null;
let isDownloading = false;

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

// HTML placeholder'ları temizle ve içindeki bilgileri çıkar
function cleanHTMLPlaceholders(text: string): { cleanText: string; extractedInfo: string } {
  if (!text || typeof text !== 'string') {
    return { cleanText: text || '', extractedInfo: '' };
  }
  
  let cleanText = text;
  const extractedInfos: string[] = [];
  
  // Placeholder pattern'i
  const placeholderPattern = /__HTML_PLACEHOLDER_\d+__/g;
  
  // Placeholder'ları bul ve etraflarındaki metinleri kontrol et
  let match;
  while ((match = placeholderPattern.exec(text)) !== null) {
    const placeholder = match[0];
    const placeholderIndex = match.index;
    const beforePlaceholder = text.substring(Math.max(0, placeholderIndex - 50), placeholderIndex);
    const afterPlaceholder = text.substring(placeholderIndex + placeholder.length, Math.min(text.length, placeholderIndex + placeholder.length + 50));
    
    // Placeholder'ın etrafındaki metinleri birleştir
    const context = (beforePlaceholder + ' ' + afterPlaceholder).trim();
    
    // Rivayet sıfatları ve hüküm terimlerini kontrol et
    const hukmuPatterns = [
      /\b(sahih|sahihdir|sahihtir|sahih hadis|sahih olan)\b/gi,
      /\b(hasen|hasendir|hasentir|hasen hadis|hasen olan)\b/gi,
      /\b(zayıf|zayiftir|zayifdir|zayıf hadis|zayif hadis|zayıf olan|zayif olan|daif|daiftir|daif hadis)\b/gi,
      /\b(mevzû|mevzu|mevzudur|mevzutur|mevzû hadis|mevzu hadis|mevzû olan|mevzu olan|uydurma|uydurma hadis)\b/gi,
    ];
    
    // Rivayet sıfatları
    const raviPatterns = [
      /\b(ravî|ravi|rivayet|rivayet eden|rivayet eder|rivayet etti)\b/gi,
      /\b(hadis|hadîs|hadis-i şerif)\b/gi,
    ];
    
    // Eğer placeholder'ın etrafında hüküm veya rivayet bilgisi varsa çıkar
    for (const pattern of hukmuPatterns) {
      if (pattern.test(context)) {
        const hukmuMatch = context.match(pattern);
        if (hukmuMatch) {
          extractedInfos.push(hukmuMatch[0].trim());
        }
      }
    }
    
    for (const pattern of raviPatterns) {
      if (pattern.test(context)) {
        const raviMatch = context.match(pattern);
        if (raviMatch) {
          extractedInfos.push(raviMatch[0].trim());
        }
      }
    }
    
    // Placeholder'ı metinden kaldır
    cleanText = cleanText.replace(placeholder, ' ').trim();
  }
  
  // Birden fazla boşluğu tek boşluğa çevir
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  return {
    cleanText: cleanText,
    extractedInfo: extractedInfos.length > 0 ? extractedInfos.join(', ') : '',
  };
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
  
  // Önce "Kaynak:" veya "Tahric:" ile başlayanları bul - sonrasındaki TÜM metni al
  const sourceHeaderPattern = /(?:^|\n|\r\n)\s*(?:Kaynak|KAYNAK|Tahric|TAHRİC|Diğer tahric|Diğer Tahric|Diğer TAHRİC)\s*[:：]\s*(.+)/gis;
  let match;
  while ((match = sourceHeaderPattern.exec(turkce)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      // Sonrasındaki tüm metni al
      const matchStart = turkce.indexOf(match[0]);
      const afterMatch = turkce.substring(matchStart + match[0].length).trim();
      const fullSource = (match[1].trim() + ' ' + afterMatch).trim();
      foundSources.push(fullSource);
      // Metinden çıkar
      cleanText = cleanText.replace(match[0], '').trim();
      if (afterMatch) {
        cleanText = cleanText.replace(afterMatch, '').trim();
      }
    }
  }

  // Eğer kaynak başlığı bulunamadıysa, kaynak isimlerini ara
  if (foundSources.length === 0) {
    const sourceNamePattern = /\b(?:Buhari|Buharî|Buhârî|Muslim|Müslim|Tirmizi|Tirmizî|Ebu Davud|Ebû Davud|İbn-i Mace|İbn Mace|İbn-i Maceh|İbn Maceh|Malik|Muvatta|Ahmed|Müsned)(?:\s+[^\n]+)?/gi;
    const sourceMatches = turkce.match(sourceNamePattern);
    if (sourceMatches && sourceMatches.length > 0) {
      // Kaynak isimlerinden sonra gelen metni bul - daha fazla metin al
      for (const sourceMatch of sourceMatches) {
        const sourceIndex = turkce.indexOf(sourceMatch);
        if (sourceIndex >= 0) {
          // Kaynak isminden sonraki metni al - daha uzun metin almak için sınırları genişlet
          const afterSource = turkce.substring(sourceIndex + sourceMatch.length);
          // Satır sonuna kadar veya bir sonraki ana başlığa kadar al
          const nextSection = afterSource.match(/\n\s*(?:Açıklama|Not|Şerh|İzah|Kaynak|Tahric|Ravi|Raviler)/);
          const sourceTextEnd = nextSection ? nextSection.index : afterSource.length;
          const sourceText = (sourceMatch + afterSource.substring(0, sourceTextEnd)).trim();
          if (sourceText.length > sourceMatch.length) {
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

  // Önce "AÇIKLAMA" (büyük harflerle) pattern'ini kontrol et
  const aciklamaPattern = /(?:^|\n|\r\n)\s*AÇIKLAMA\s*[:：]?\s*(.+)/gis;
  const aciklamaMatches = [...turkce.matchAll(aciklamaPattern)];
  if (aciklamaMatches.length > 0) {
    // Son eşleşmeyi al
    const lastMatch = aciklamaMatches[aciklamaMatches.length - 1];
    if (lastMatch && lastMatch[1]) {
      const explanationText = lastMatch[1].trim();
      if (explanationText.length > 0) {
        // "AÇIKLAMA" ve sonrasındaki TÜM metni çıkar (sınırlama yok)
        const aciklamaStart = turkce.indexOf(lastMatch[0]);
        const beforeAciklama = turkce.substring(0, aciklamaStart).trim();
        const afterAciklama = turkce.substring(aciklamaStart + lastMatch[0].length).trim();
        
        cleanText = beforeAciklama;
        extractedExplanation = afterAciklama || explanationText;
        
        // Eğer birden fazla eşleşme varsa, hepsini birleştir
        if (aciklamaMatches.length > 1) {
          extractedExplanation = aciklamaMatches.map(m => {
            const startIdx = turkce.indexOf(m[0]);
            const endIdx = startIdx + m[0].length;
            // Son eşleşmeden sonraki tüm metni al
            if (m === lastMatch) {
              return turkce.substring(endIdx).trim();
            } else {
              // Diğer eşleşmeler için sonraki eşleşmeye kadar al
              const nextMatchIdx = aciklamaMatches.findIndex(mm => mm !== m && turkce.indexOf(mm[0]) > startIdx);
              if (nextMatchIdx >= 0) {
                const nextStart = turkce.indexOf(aciklamaMatches[nextMatchIdx][0]);
                return turkce.substring(endIdx, nextStart).trim();
              }
              return turkce.substring(endIdx).trim();
            }
          }).filter(Boolean).join('\n\n');
        }
      }
    }
  }

  // Eğer "AÇIKLAMA" bulunamadıysa, diğer pattern'leri dene
  if (!extractedExplanation) {
    // Açıklama pattern'leri (sırayla kontrol et, en spesifik olanlar önce)
    // Tüm açıklamayı almak için sınırlama kaldırıldı
    const explanationPatterns = [
      // Açıklama: ile başlayanlar - sonrasındaki TÜM metni al
      /(?:^|\n|\r\n)\s*Açıklama\s*[:：]\s*(.+)/gis,
      // Not: ile başlayanlar
      /(?:^|\n|\r\n)\s*Not\s*[:：]\s*(.+)/gis,
      // Şerh: ile başlayanlar
      /(?:^|\n|\r\n)\s*Şerh\s*[:：]\s*(.+)/gis,
      // İzah: ile başlayanlar
      /(?:^|\n|\r\n)\s*İzah\s*[:：]\s*(.+)/gis,
      // Dipnot: ile başlayanlar
      /(?:^|\n|\r\n)\s*Dipnot\s*[:：]\s*(.+)/gis,
    ];

    // Tüm açıklama pattern'lerini kontrol et
    for (const pattern of explanationPatterns) {
      const matches = [...turkce.matchAll(pattern)];
      if (matches.length > 0) {
        // Son eşleşmeyi al (en alttaki açıklama)
        const lastMatch = matches[matches.length - 1];
        if (lastMatch && lastMatch[1]) {
          const explanationText = lastMatch[1].trim();
          if (explanationText.length > 0) {
            // Açıklamayı metinden çıkar - sonrasındaki TÜM metni al
            const matchStart = turkce.indexOf(lastMatch[0]);
            const beforeMatch = turkce.substring(0, matchStart).trim();
            const afterMatch = turkce.substring(matchStart + lastMatch[0].length).trim();
            
            cleanText = beforeMatch;
            extractedExplanation = afterMatch || explanationText;
            
            // Eğer birden fazla eşleşme varsa, hepsini birleştir
            if (matches.length > 1) {
              extractedExplanation = matches.map((m, idx) => {
                const startIdx = turkce.indexOf(m[0]);
                const endIdx = startIdx + m[0].length;
                if (m === lastMatch) {
                  // Son eşleşme için sonrasındaki tüm metni al
                  return turkce.substring(endIdx).trim();
                } else {
                  // Diğer eşleşmeler için sonraki eşleşmeye kadar al
                  const nextMatch = matches.find(mm => mm !== m && turkce.indexOf(mm[0]) > startIdx);
                  if (nextMatch) {
                    const nextStart = turkce.indexOf(nextMatch[0]);
                    return turkce.substring(endIdx, nextStart).trim();
                  }
                  return turkce.substring(endIdx).trim();
                }
              }).filter(Boolean).join('\n\n');
            }
            break; // İlk eşleşmede dur
          }
        }
      }
    }
  }

  // Eğer açıklama bulunamadıysa, daha genel pattern'ler dene
  if (!extractedExplanation) {
    // "Açıklama" kelimesi geçiyorsa ve sonrasında metin varsa - TÜM metni al
    const generalPattern = /(?:^|\n|\r\n)\s*(?:Açıklama|AÇIKLAMA|Not|Şerh|İzah|Dipnot)\s*[:：]?\s*(.+)/gi;
    const match = turkce.match(generalPattern);
    if (match && match.length > 0) {
      const lastMatch = match[match.length - 1];
      const explanationStart = turkce.indexOf(lastMatch);
      if (explanationStart > 0) {
        const beforeExplanation = turkce.substring(0, explanationStart).trim();
        const afterExplanation = turkce.substring(explanationStart + lastMatch.length).trim();
        
        // Açıklama kısmı varsa (uzunluk kontrolü kaldırıldı)
        if (afterExplanation.length > 0 || lastMatch.length > 0) {
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


async function downloadHadisDataFromRelease(): Promise<any[][]> {
  // Cache varsa onu kullan
  if (rawDataCache) {
    return rawDataCache;
  }

  // Zaten indiriliyorsa bekle
  if (isDownloading) {
    // İndirme tamamlanana kadar bekle (max 60 saniye)
    let waitCount = 0;
    while (isDownloading && waitCount < 120) {
      await new Promise(resolve => setTimeout(resolve, 500));
      waitCount++;
      if (rawDataCache) {
        return rawDataCache;
      }
    }
  }

  isDownloading = true;
  const releaseUrl = 'https://github.com/Ahmetvhd/hadis-arama/releases/download/v1.0/hadisler.json';
  
  try {
    console.log('GitHub Release\'den hadisler.json indiriliyor...');
    const response = await fetch(releaseUrl);
    
    if (!response.ok) {
      throw new Error(`GitHub Release'den indirme başarısız: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('hadisler.json başarıyla indirildi,', data.length, 'kayıt yüklendi');
    
    // Cache'e kaydet
    rawDataCache = data;
    isDownloading = false;
    return data;
  } catch (error) {
    isDownloading = false;
    console.error('GitHub Release\'den indirme hatası:', error);
    throw error;
  }
}

async function loadHadisData(): Promise<Hadis[]> {
  if (hadisData) {
    return hadisData;
  }

  try {
    let rawData: any[][];
    
    // Önce local dosyayı kontrol et (development için)
    const hadislerJsonPath = path.join(process.cwd(), 'hadisler.json');
    
    if (fs.existsSync(hadislerJsonPath)) {
      // Local dosya varsa onu kullan (development)
      console.log('Local hadisler.json dosyası kullanılıyor');
      const fileContent = fs.readFileSync(hadislerJsonPath, 'utf-8');
      rawData = JSON.parse(fileContent);
    } else {
      // Production'da GitHub Release'den indir
      console.log('Local dosya bulunamadı, GitHub Release\'den indiriliyor...');
      rawData = await downloadHadisDataFromRelease();
    }
    
    if (!Array.isArray(rawData) || rawData.length === 0) {
      console.error('hadisler.json dosyası geçersiz format');
      return [];
    }
    
    let allRawData: any[][] = [];
    
    // Bölüm başlıklarını parse et (ilk kayıt genellikle başlıkları içerir)
    if (rawData.length > 0 && Array.isArray(rawData[0]) && rawData[0].length > 100) {
      bolumBasliklari = new Map();
      const basliklar = rawData[0];
      // Her 4 eleman bir bölüm: [id, kitapNo, bolumNo, baslik]
      for (let i = 0; i < basliklar.length - 3; i += 4) {
        const bolumKey = `${basliklar[i+1]}-${basliklar[i+2]}`;
        bolumBasliklari.set(bolumKey, String(basliklar[i+3] || ''));
      }
      // İlk kaydı atla (başlıklar)
      allRawData = rawData.slice(1);
    } else {
      allRawData = rawData;
    }
    
    hadisData = allRawData
      .filter((item, index) => {
        // İlk kayıt bölüm başlıkları, onu atla
        if (index === 0) return false;
        // Gerçek hadis kayıtlarını filtrele - Türkçe metin içeren kayıtlar
        // Yapı: [id, arapca(1), turkce(2), aciklama(3), ..., kitapNo(6), bolumNo(7), hadisNo(8), ...]
        if (!Array.isArray(item) || item.length < 9) return false;
        
        const turkce = String(item[2] || '').trim();
        const arapca = String(item[1] || '').trim();
        const aciklama = String(item[3] || '').trim();
        
        // En az bir alan dolu olmalı (turkce, arapca veya aciklama)
        if (!turkce && !arapca && !aciklama) return false;
        
        // Sadece boşluk veya özel karakterlerden oluşan metinleri filtrele
        if (turkce && /^[\s\W]*$/.test(turkce) && !arapca && !aciklama) return false;
        
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
        
        // HTML placeholder'ları temizle ve içindeki bilgileri çıkar
        const turkceCleaned = cleanHTMLPlaceholders(turkce);
        turkce = turkceCleaned.cleanText;
        const turkceExtractedInfo = turkceCleaned.extractedInfo;
        
        const aciklamaCleaned = cleanHTMLPlaceholders(aciklama);
        aciklama = aciklamaCleaned.cleanText;
        const aciklamaExtractedInfo = aciklamaCleaned.extractedInfo;
        
        const arapcaCleaned = cleanHTMLPlaceholders(arapca);
        arapca = arapcaCleaned.cleanText;
        
        const bolumBaslikCleaned = cleanHTMLPlaceholders(bolumBaslik);
        bolumBaslik = bolumBaslikCleaned.cleanText;
        
        // Türkçe metinden kaynak bilgilerini ayır
        const { cleanText: turkceWithoutSources, sources: extractedSources } = extractSourcesFromTurkish(turkce);
        turkce = turkceWithoutSources;
        
        // Türkçe metin içinde kalan açıklamaları ayır
        const { cleanText: cleanedTurkceText, explanation: extractedExplanation } = extractExplanationFromTurkish(turkce);
        turkce = cleanedTurkceText;
        
        // Çıkarılan açıklamayı da temizle
        let cleanedExtractedExplanation = '';
        if (extractedExplanation) {
          const cleaned = cleanHTMLPlaceholders(extractedExplanation);
          cleanedExtractedExplanation = cleaned.cleanText;
          if (cleaned.extractedInfo) {
            cleanedExtractedExplanation = `${cleaned.extractedInfo}\n\n${cleanedExtractedExplanation}`.trim();
          }
        }
        
        // Kaynak bilgilerini temizle
        let cleanedSources = '';
        if (extractedSources) {
          const cleaned = cleanHTMLPlaceholders(extractedSources);
          cleanedSources = cleaned.cleanText;
          if (cleaned.extractedInfo) {
            cleanedSources = `${cleaned.extractedInfo}\n\n${cleanedSources}`.trim();
          }
        }
        
        // Açıklamaları birleştir (kaynak bilgilerini ve placeholder'lardan çıkarılan bilgileri de ekle)
        const explanationParts = [];
        if (cleanedExtractedExplanation) {
          explanationParts.push(cleanedExtractedExplanation);
        }
        if (cleanedSources) {
          explanationParts.push(`Kaynak: ${cleanedSources}`);
        }
        // Placeholder'lardan çıkarılan bilgileri ekle
        if (turkceExtractedInfo) {
          explanationParts.push(turkceExtractedInfo);
        }
        if (aciklamaExtractedInfo) {
          explanationParts.push(aciklamaExtractedInfo);
        }
        if (aciklama) {
          explanationParts.push(aciklama);
        }
        let combinedExplanation = explanationParts.join('\n\n').trim();
        
        // Birleştirilmiş açıklamayı da tekrar temizle (güvenlik için)
        const finalCleaned = cleanHTMLPlaceholders(combinedExplanation);
        combinedExplanation = finalCleaned.cleanText;
        if (finalCleaned.extractedInfo) {
          combinedExplanation = `${finalCleaned.extractedInfo}\n\n${combinedExplanation}`.trim();
        }
        
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
      .filter((hadis) => {
        // En az bir alan dolu olmalı
        return hadis && (
          (hadis.turkce && hadis.turkce.trim().length > 0) ||
          (hadis.arapca && hadis.arapca.trim().length > 0) ||
          (hadis.aciklama && hadis.aciklama.trim().length > 0)
        );
      });
    
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

  const allHadis = await loadHadisData();
  
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
    
    // Hadis numarası araması kontrolü (sadece sayılardan oluşuyorsa veya "hadis no" formatında ise)
    const isHadisNoSearch = /^\d+$/.test(query.trim()) || /hadis\s*no[:\s]*\d+/i.test(query.trim());
    let hadisNoToSearch = '';
    if (isHadisNoSearch) {
      const noMatch = query.match(/\d+/);
      if (noMatch) {
        hadisNoToSearch = noMatch[0];
      }
    }
    
    // Her hadis için relevance skoru hesapla
    const hadisWithScores = filtered.map((hadis) => {
      // Hadis numarası araması - öncelikli kontrol
      if (isHadisNoSearch && hadisNoToSearch) {
        const hadisNo = String(hadis.hadisNo || '').trim();
        const hadisId = String(hadis.id || '').trim();
        
        // Sayısal karşılaştırma için sayıya çevir
        const searchNo = parseInt(hadisNoToSearch, 10);
        const hadisNoNum = parseInt(hadisNo, 10);
        const hadisIdNum = parseInt(hadisId, 10);
        
        // Tam sayısal eşleşme (sadece tam eşleşme, substring değil)
        if (!isNaN(searchNo)) {
          if (!isNaN(hadisNoNum) && hadisNoNum === searchNo) {
            return { hadis, score: 10000, matchedWords: queryWords.length };
          }
          if (!isNaN(hadisIdNum) && hadisIdNum === searchNo) {
            return { hadis, score: 10000, matchedWords: queryWords.length };
          }
        }
        
        // String tam eşleşme (sayıya çevrilemezse)
        if (hadisNo === hadisNoToSearch || hadisId === hadisNoToSearch) {
          return { hadis, score: 10000, matchedWords: queryWords.length };
        }
      }
      
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
      
      // Tam cümle eşleşmesi varsa ekstra bonus (öncelikli)
      const fullQuery = normalizedQuery.replace(/\s+/g, ' ');
      if (turkceText.includes(fullQuery)) {
        score += 50; // Cümle eşleşmesi için çok yüksek bonus
      } else if (aciklamaText.includes(fullQuery)) {
        score += 30; // Açıklamada cümle eşleşmesi
      } else if (arapcaText.includes(fullQuery)) {
        score += 20; // Arapça metinde cümle eşleşmesi
      }
      
      // Kısmi cümle eşleşmesi (ardışık kelimeler)
      if (queryWords.length > 1) {
        const consecutiveWords = queryWords.slice(0, Math.min(3, queryWords.length)).join(' ');
        if (turkceText.includes(consecutiveWords)) {
          score += 25; // Ardışık kelimeler için bonus
        }
      }
      
      return { hadis, score, matchedWords };
    });
    
    // Sadece eşleşen hadisleri filtrele ve skora göre sırala
    filtered = hadisWithScores
      .filter(item => item.score > 0)
      .sort((a, b) => {
        // Önce skora göre, sonra eşleşen kelime sayısına göre, son olarak hadis numarasına göre
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (b.matchedWords !== a.matchedWords) {
          return b.matchedWords - a.matchedWords;
        }
        // Hadis numarasına göre sayısal sıralama
        const aNo = parseInt(a.hadis.hadisNo || '0', 10);
        const bNo = parseInt(b.hadis.hadisNo || '0', 10);
        return aNo - bNo;
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
      .sort((a, b) => {
        // Önce önceliğe göre, sonra hadis numarasına göre
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        const aNo = parseInt(a.hadis.hadisNo || '0', 10);
        const bNo = parseInt(b.hadis.hadisNo || '0', 10);
        return aNo - bNo;
      })
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
      .sort((a, b) => {
        // Önce önceliğe göre, sonra hadis numarasına göre
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        const aNo = parseInt(a.hadis.hadisNo || '0', 10);
        const bNo = parseInt(b.hadis.hadisNo || '0', 10);
        return aNo - bNo;
      })
      .map(item => item.hadis);
  }

  // Tüm filtrelerden sonra hadis numarasına göre sırala (eğer özel sıralama yoksa)
  if (!query && !alim && !kategori) {
    filtered = filtered.sort((a, b) => {
      const aNo = parseInt(a.hadisNo || '0', 10);
      const bNo = parseInt(b.hadisNo || '0', 10);
      return aNo - bNo;
    });
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

