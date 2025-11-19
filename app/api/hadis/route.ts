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

function loadHadisData(): Hadis[] {
  if (hadisData) {
    return hadisData;
  }

  try {
    const filePath = path.join(process.cwd(), 'hadisler.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rawData: any[][] = JSON.parse(fileContent);
    
    // İlk kayıt bölüm başlıklarını içeriyor - onu parse et
    bolumBasliklari = new Map();
    if (rawData.length > 0 && Array.isArray(rawData[0]) && rawData[0].length > 100) {
      const basliklar = rawData[0];
      // Her 4 eleman bir bölüm: [id, kitapNo, bolumNo, baslik]
      for (let i = 0; i < basliklar.length - 3; i += 4) {
        const bolumKey = `${basliklar[i+1]}-${basliklar[i+2]}`;
        bolumBasliklari.set(bolumKey, String(basliklar[i+3] || ''));
      }
    }
    
    hadisData = rawData
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

  // Metin araması
  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter((hadis) => {
      const searchText = `${hadis.turkce} ${hadis.arapca} ${hadis.bolumBaslik} ${hadis.aciklama}`.toLowerCase();
      return searchText.includes(lowerQuery);
    });
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

