# Hadis Arama Web Uygulaması

Next.js ve shadcn/ui kullanılarak geliştirilmiş güçlü hadis arama uygulaması.

## 🌐 Canlı Demo

**Web Sitesi:** [https://hadis-arama.vercel.app](https://hadis-arama.vercel.app)

**GitHub Repository:** [https://github.com/Ahmetvhd/hadis-arama](https://github.com/Ahmetvhd/hadis-arama)

## Özellikler

- 🔍 **Gelişmiş Arama Motoru**: 
  - Türkçe karakter normalizasyonu (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c)
  - Kelime bazlı arama
  - Relevance skorlama ile en alakalı sonuçlar önce gelir
  - Tam cümle eşleşmesi önceliklendirilir
  - Hadis metinlerinde, açıklamalarda ve bölüm başlıklarında arama
- ⚡ **Hızlı ve Responsive**: Modern UI tasarımı ile mobil ve masaüstü uyumlu
- 🎨 **Modern Tasarım**: shadcn/ui componentleri ile şık arayüz
- 📄 **Sayfalama**: Büyük sonuç setleri için sayfalama desteği
- ✨ **Vurgulama**: Arama terimleri otomatik olarak vurgulanır
- 📚 **Parçalı Veritabanı**: 3 parça halinde organize edilmiş veritabanı (her biri 100MB altında)

## Kurulum

1. Repository'yi klonlayın:
```bash
git clone https://github.com/Ahmetvhd/hadis-arama.git
cd hadis-arama
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Veritabanı dosyaları `hadislerjson` klasöründe bulunmaktadır ve otomatik olarak yüklenir.

4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

5. Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.

## Kullanım

Arama kutusuna bir kelime veya cümle yazarak hadisleri arayabilirsiniz. Arama otomatik olarak:
- Türkçe hadis metinlerinde
- Arapça hadis metinlerinde
- Açıklamalarda
- Bölüm başlıklarında

yapılır.

## Teknolojiler

- **Next.js 14** - React framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI componentleri
- **Lucide React** - İkonlar

## Lisans

Bu proje açık kaynaklıdır.

