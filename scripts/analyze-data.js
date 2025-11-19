const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'hadisler.json');
const fileContent = fs.readFileSync(filePath, 'utf-8');
const rawData = JSON.parse(fileContent);

// İlk birkaç hadis kaydını analiz et
console.log('Toplam kayıt sayısı:', rawData.length);
console.log('\nİlk 5 kayıt analizi:\n');

for (let i = 0; i < Math.min(5, rawData.length); i++) {
  const item = rawData[i];
  if (Array.isArray(item) && item.length > 10) {
    console.log(`\nKayıt ${i}:`);
    console.log('Uzunluk:', item.length);
    console.log('İlk 15 eleman:');
    item.slice(0, 15).forEach((val, idx) => {
      if (typeof val === 'string' && val.length > 0) {
        const preview = val.length > 100 ? val.substring(0, 100) + '...' : val;
        console.log(`  [${idx}]: ${preview.replace(/\r\n/g, ' ').substring(0, 80)}`);
      }
    });
  }
}

// Türkçe metin içeren kayıtları bul
const hadisRecords = rawData.filter(item => 
  Array.isArray(item) && 
  item.length > 10 && 
  typeof item[9] === 'string' && 
  item[9].trim().length > 0
);

console.log(`\n\nTürkçe metin içeren hadis kayıt sayısı: ${hadisRecords.length}`);

if (hadisRecords.length > 0) {
  console.log('\nÖrnek hadis kaydı yapısı:');
  const example = hadisRecords[0];
  console.log('Toplam eleman sayısı:', example.length);
  console.log('\nÖnemli alanlar:');
  console.log(`[0] ID: ${example[0]}`);
  console.log(`[1] Kitap/Bölüm No?: ${example[1]}`);
  console.log(`[2] Bölüm No?: ${example[2]}`);
  console.log(`[3] Bölüm Başlığı?: ${example[3]?.substring(0, 50)}`);
  console.log(`[8] Arapça?: ${example[8]?.substring(0, 50)}`);
  console.log(`[9] Türkçe: ${example[9]?.substring(0, 100)}`);
  console.log(`[10] Açıklama?: ${example[10]?.substring(0, 100)}`);
}

