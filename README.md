# Hadis Arama Web Uygulaması

Next.js ve shadcn/ui kullanılarak geliştirilmiş güçlü hadis arama uygulaması.

## Özellikler

- 🔍 **Güçlü Arama**: Hadis metinlerinde, açıklamalarda ve bölüm başlıklarında arama yapın
- ⚡ **Hızlı ve Responsive**: Modern UI tasarımı ile mobil ve masaüstü uyumlu
- 🎨 **Modern Tasarım**: shadcn/ui componentleri ile şık arayüz
- 📄 **Sayfalama**: Büyük sonuç setleri için sayfalama desteği
- ✨ **Vurgulama**: Arama terimleri otomatik olarak vurgulanır

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

3. **Önemli**: `hadisler.json` dosyasını proje kök dizinine eklemeniz gerekiyor. Bu dosya GitHub'a yüklenemeyecek kadar büyük olduğu için repository'de bulunmuyor.

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

