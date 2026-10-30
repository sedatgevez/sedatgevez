# SedoX VPS Kayıt

Alarmlar, watchlist, ekran profilleri ve oturum verisi VPS üzerinde JSON olarak saklanır.

## Kurulum (PHP — önerilen)

1. Bu klasörün içeriğini site köküne kopyala:
   - `index.html` (SedoX HTML)
   - `api/data.php`
   - `data/` (yazılabilir olmalı)

```bash
chmod 755 data
# veya:
chown www-data:www-data data
chmod 775 data
```

2. `api/data.php` içindeki `$SECRET` değerini değiştir:
```php
$SECRET = 'kendi-uzun-gizli-anahtarin';
```

3. HTML içinde aynı token'ı ayarla (dosyanın script bölümünde):
```js
const VPS_SYNC = {
  enabled: true,
  url: '/api/data.php',          // veya https://alanadin.com/api/data.php
  token: 'kendi-uzun-gizli-anahtarin',
};
```

## Kurulum (Node.js)

```bash
export SEDOX_TOKEN='kendi-uzun-gizli-anahtarin'
export SEDOX_PORT=3847
node server.js
```

Nginx örneği:
```nginx
location /api/data {
  proxy_pass http://127.0.0.1:3847/api/data;
}
```

## API

- `GET  /api/data.php?key=alerts&token=...`
- `GET  /api/data.php?key=all&token=...`
- `POST /api/data.php` body:
```json
{
  "token": "...",
  "key": "alerts",
  "data": [ ... ]
}
```

`key` seçenekleri: `alerts`, `watchlist`, `screens`, `session`, `workspace`, `all`

## Notlar

- Tarayıcı önce localStorage kullanır; VPS senkronu arka planda çalışır.
- Sayfa açılınca sunucudan alarm/watchlist/ekran yüklenir (varsa).
- Token bilmeyen istekler 401 alır.
- `data/` klasörü web'den okunamaz (`.htaccess` ile).
