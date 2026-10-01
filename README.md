# İzmir Sinema

İzmir merkez ilçelerinde sinema seanslarını ve doğrulanmış bilet fiyatlarını karşılaştırmak için başlangıç servisi.

## İlçeler
- Karşıyaka
- Konak
- Balçova
- Bornova

## Çalıştırma
```bash
npm install
npm start
```

## API
- `/api/health`
- `/api/cinemas`
- `/api/films`
- `/api/showtimes`
- `/api/prices`
- `/api/compare`
- `/api/sources`
- `/api/updates`

Fiyat verileri kaynağı ve doğrulama zamanı ile tutulacak; doğrulanmamış fiyatlar gerçek fiyat gibi gösterilmeyecek.

## Not
İlk veri seti 1 Ekim 2026 için doğrulanmış resmi Paribu Cineverse seanslarından oluşturulmuştur. Fiyatlar yalnızca kaynakta açıkça doğrulanabilen kayıtlar olarak tutulur; örnek/başka etkinlik fiyatları karşılaştırma fiyatı olarak kullanılmaz.
