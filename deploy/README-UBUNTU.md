# Neye Ihtiyac Var - Ubuntu Production Kurulum Notlari

Bu klasor Windows development -> Ubuntu production yapisina gore hazirlanmistir.

Sunucu dizinleri:
- /var/www/neyeihtiyacvar/backend
- /var/www/neyeihtiyacvar/frontend
- /etc/neyeihtiyacvar/backend.env

Servisler:
- neyeihtiyacvar-api.service
- neyeihtiyacvar-web.service

Nginx:
- deploy/nginx/neyeihtiyacvar.conf

Onemli:
1. backend.env.example dosyasindaki CHANGE_ME degerleri gercek sunucuda doldurulacak.
2. Gercek backend.env Git'e eklenmeyecek.
3. DNS sunucuya yonlendirildikten sonra Certbot ile HTTPS kurulacak.
4. HTTPS kurulmadan canli kullanici trafigi acilmayacak.
5. Veritabani migration/backup adimi canli deploy prosedurune eklenecek.
6. Production secret degerleri dosya izinleri 600 olacak sekilde korunacak.

SSL kurulumu sunucuda:
sudo certbot --nginx -d neyeihtiyacvar.com -d www.neyeihtiyacvar.com

Servis kontrolu:
sudo systemctl status neyeihtiyacvar-api
sudo systemctl status neyeihtiyacvar-web
sudo nginx -t

Log:
sudo journalctl -u neyeihtiyacvar-api -f
sudo journalctl -u neyeihtiyacvar-web -f