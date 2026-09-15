# Neye Ihtiyac Var - Canliya Cikis Checklist

## Teknik kalite
- [x] Frontend TypeScript
- [x] Frontend production build
- [x] Frontend E2E smoke test
- [x] Backend automated tests
- [x] Backend Release build
- [x] robots.txt altyapisi
- [x] sitemap.xml altyapisi
- [x] Dinamik kategori SEO
- [x] Dinamik isletme SEO
- [x] LocalBusiness JSON-LD
- [x] GA4 event altyapisi

## Production config
- [x] Development secret'lari User Secrets'ta
- [x] Production environment ornekleri hazir
- [x] Nginx config hazir
- [x] systemd servisleri hazir

## Canliya cikmadan once ZORUNLU
- [ ] Ubuntu sunucu satin al / hazirla
- [ ] Domain DNS kayitlarini sunucuya yonlendir
- [ ] PostgreSQL production veritabanini kur
- [ ] Production secret'larini Ubuntu environment dosyasina gir
- [ ] Nginx'i etkinlestir
- [ ] Let's Encrypt / Certbot SSL kur
- [ ] Firewall kontrolu (22, 80, 443)
- [ ] Database migration/backup prosedurunu uygula
- [ ] PayTR merchant_id / merchant_key / merchant_salt tanimla
- [ ] PayTR callback URL'lerini canli domain ile tanimla
- [ ] PayTR test odemesini basariyla tamamla
- [ ] GA4 Measurement ID tanimla
- [ ] Google Search Console domain dogrulamasi yap
- [ ] sitemap.xml dosyasini Search Console'a gonder
- [ ] Production smoke test yap
- [ ] E-posta dogrulama / sifre sifirlama testi yap
- [ ] Isletme kaydi / paket secimi / odeme testi yap
- [ ] Yedekleme ve geri donus planini kontrol et

## Canliya cikis karari
Ubuntu ve PayTR tamamlanmadan genel kullanici trafigi acilmayacak.