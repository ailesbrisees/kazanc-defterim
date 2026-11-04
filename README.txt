KAZANÇ DEFTERİM — ilk kurulum

1) Supabase > SQL Editor > New query bölümünü açın.
2) schema.sql dosyasının tamamını yapıştırıp RUN'e basın. Bu işlem tabloları ve kullanıcı bazlı RLS güvenlik kurallarını oluşturur.
3) Supabase > Authentication > URL Configuration bölümünde Site URL alanını uygulamanın yayınlanacağı adresle güncelleyin. E-posta doğrulaması açıksa kayıt sırasında gelen doğrulama bağlantısına tıklayın.
4) Bu klasörü statik web hosting hizmetine (ör. Netlify Drop) yükleyin. index.html kök dizinde olmalıdır.
5) Yayınlanan web adresini Android Chrome'da açın > menü > Ana ekrana ekle / Uygulamayı yükle. Windows'ta Edge/Chrome adres çubuğundaki yükle simgesini kullanın.

GÜVENLİK
- config.js içindeki publishable key tarayıcıda kullanılmak üzere tasarlanmıştır. Gizli service_role/secret key kesinlikle eklemeyin.
- Veritabanı erişimi RLS politikalarıyla auth.uid() üzerinden kullanıcıya sınırlandırılır.
- Her kazanç kaydı birim ücret ve toplam tutarı kendi içinde saklar. Sonradan tarife eklemek eski kayıtları değiştirmez.
- Yayına almadan önce Supabase Authentication e-posta ayarlarını ve URL yönlendirmelerini kontrol edin.

Not: Bu proje ilk sürüm iskeletidir. Silme/düzenleme, CSV dışa aktarma ve gelişmiş raporlar sonraki sürümlerde eklenebilir.
