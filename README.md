# HubbyKit

Toolkit developer offline dengan Svelte, TypeScript, dan Tauri 2. JSON Beautifier terbuka saat aplikasi dimulai.

## Menjalankan

Siapkan Node.js 24, Rust, Visual Studio C++ Build Tools, dan WebView2 untuk pengembangan desktop Windows.

```sh
npm ci
npm run tauri dev
```

Jalankan `npm run tauri build` untuk membuat executable dan installer NSIS di `src-tauri/target/release`. Untuk versi web, jalankan `npm run dev` atau layani hasil `npm run build` dari folder `dist`. Gunakan HTTPS untuk akses clipboard dan Web Crypto di luar localhost.

## Tool

| Kategori | Tool |
| --- | --- |
| Formatters | JSON Beautifier, SQL Formatter, XML / HTML Pretty |
| Converters | JSON to Go Struct, YAML ↔ JSON, Unix Timestamp |
| Encoders / Security | JWT Debugger, Base64, URL Encode, Hash Generator |
| Generators | UUID / ULID, Mock JSON, QR Code, Password Generator |
| Text & Testing | Diff Checker, Regex Tester, cURL to Code |

- JSON Beautifier memvalidasi input dan mempertahankan token angka serta string saat format atau minify.
- SQL Formatter mendukung beberapa dialek. Validasi terhadap skema database tetap dilakukan di database.
- JWT Debugger menampilkan header, claims, dan signature dalam hex. Verifikasi signature tidak tersedia.
- Mock JSON menerima objek dengan tipe field `string`, `name`, `email`, `integer`, `boolean`, `date`, atau `uuid`.
- cURL to Code menghasilkan JavaScript Fetch atau Python Requests dari URL HTTP(S), method, header, body literal, dan opsi redirect. Konversi berjalan offline.

Jalankan `npm run check` untuk pemeriksaan TypeScript dan Svelte, serta `npm test` untuk pengujian tool.
