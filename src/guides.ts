export const guides: Record<string, readonly string[]> = {
  "json": [
    "Tempel JSON untuk memeriksa struktur atau menyiapkannya agar mudah dibaca dan dikirim.",
    "Format merapikan JSON dengan indentasi 2 atau 4 spasi. Minify membuang spasi dan baris kosong di luar string. Keduanya mempertahankan teks angka dan string dari input.",
    "Validate memeriksa sintaks dan menampilkan pesan jika JSON tidak valid. Gunakan Example untuk mencoba contoh bawaan."
  ],
  "sql": [
    "Tempel query SQL, pilih dialek database, lalu klik Format.",
    "Format merapikan indentasi dan baris serta mengubah kata kunci SQL menjadi huruf kapital. Gunakan Standard SQL untuk sintaks umum atau pilih PostgreSQL, MySQL, SQLite, BigQuery, atau T-SQL sesuai sumber query.",
    "Query hanya diproses sebagai teks. Pemeriksaan tabel, kolom, dan hasil query dilakukan di database."
  ],
  "markup": [
    "Tempel markup dan pilih XML atau HTML sesuai dokumen.",
    "Format merapikan markup menurut jenis yang dipilih. Validate XML memeriksa struktur XML, termasuk pasangan tag dan satu elemen akar. Aksi ini selalu memeriksa XML, meskipun opsi HTML sedang dipilih."
  ],
  "go": [
    "Tempel objek JSON yang mewakili respons API atau konfigurasi, lalu klik Convert.",
    "Convert menghasilkan tipe Go bernama Root dengan field dan tag JSON. Tipe dibuat dari nilai contoh. Periksa kembali field opsional, nilai null, dan array dengan tipe campuran sebelum menggunakan struct di aplikasi."
  ],
  "yaml": [
    "Gunakan tool ini saat memindahkan konfigurasi atau data antara format YAML dan JSON.",
    "YAML to JSON menerima YAML dan menghasilkan JSON berindentasi. JSON to YAML menerima JSON dan menghasilkan YAML. Pilih arah sesuai format input.",
    "Komentar dan gaya penulisan asal bisa hilang. Angka di luar rentang presisi yang didukung dapat ditolak."
  ],
  "time": [
    "Konversi timestamp Unix untuk membaca waktu dari log atau menyiapkan nilai waktu untuk API.",
    "To ISO mengubah angka menjadi tanggal UTC. To Unix menerima tanggal YYYY-MM-DD atau waktu ISO 8601 dengan Z atau offset. Now menghasilkan timestamp saat ini tanpa memakai isi input.",
    "Seconds dan Milliseconds menentukan satuan input untuk To ISO dan satuan hasil untuk To Unix atau Now."
  ],
  "jwt": [
    "Tempel JWT dengan tiga segmen yang dipisahkan titik, lalu klik Decode untuk memeriksa isinya.",
    "Decode menampilkan header, claims, dan byte signature dalam heksadesimal. Anda bisa melihat nilai seperti sub atau exp jika tersedia. Tool ini tidak memverifikasi signature atau menentukan apakah token masih berlaku."
  ],
  "base64": [
    "Gunakan tool ini untuk mengubah teks UTF-8 menjadi Base64 atau membaca kembali teks yang sudah di-encode.",
    "Encode menghasilkan Base64. Decode mengubah Base64 kembali menjadi teks UTF-8. Standard menggunakan + dan /, sedangkan URL-safe menghasilkan - dan _ tanpa padding.",
    "Base64 adalah representasi data dan dapat dibalik tanpa kunci."
  ],
  "url": [
    "Tempel satu komponen URL, misalnya nilai parameter pencarian.",
    "Encode mengubah karakter khusus menjadi percent-encoding, seperti & menjadi %26. Decode membalikkan percent-encoding. Tanda + biasa tetap + saat di-decode."
  ],
  "hash": [
    "Tempel teks untuk mendapatkan sidik jari digital dalam format heksadesimal.",
    "Hash menghitung digest teks UTF-8. Pilih SHA-256, SHA-384, atau SHA-512 sesuai format yang dibutuhkan. SHA-1 tersedia untuk kompatibilitas sistem lama.",
    "Spasi dan baris baru ikut dihitung, jadi salin teks persis seperti sumbernya."
  ],
  "id": [
    "Masukkan jumlah ID dari 1 sampai 1.000, pilih jenisnya, lalu klik Generate.",
    "UUID v4 menghasilkan ID acak dalam format UUID. ULID menghasilkan ID 26 karakter dengan awalan waktu yang dapat diurutkan. Hasil ditampilkan satu ID per baris."
  ],
  "mock": [
    "Tentukan nama field sebagai key dan jenis data sebagai value, misalnya {\"id\":\"uuid\",\"active\":\"boolean\"}.",
    "Jenis yang tersedia adalah string, name, email, integer, boolean, date, dan uuid. Masukkan jumlah record dari 1 sampai 1.000, lalu klik Generate untuk menghasilkan array JSON berisi data uji."
  ],
  "qr": [
    "Tempel teks atau URL, lalu klik Generate agar nilainya bisa dipindai sebagai QR.",
    "Medium memakai koreksi kesalahan sedang. High lebih tahan terhadap kerusakan, dengan kapasitas teks yang lebih kecil. Setelah QR muncul, gunakan Download PNG untuk menyimpannya."
  ],
  "password": [
    "Masukkan panjang 8 sampai 256 karakter, lalu klik Generate untuk membuat kata sandi memakai keacakan sistem.",
    "Letters + numbers mengambil karakter dari huruf dan angka. Letters + numbers + symbols juga mengizinkan simbol. Set karakter menentukan karakter yang boleh dipilih, dan setiap hasil dapat memakai kombinasi yang berbeda."
  ],
  "diff": [
    "Masukkan teks sebelum perubahan ke Original text dan versi sesudahnya ke Modified text.",
    "Compare menampilkan perbedaan per baris. Tanda − menunjukkan baris yang dihapus, tanda + menunjukkan baris tambahan, dan baris tanpa tanda tetap sama."
  ],
  "regex": [
    "Masukkan pola regex JavaScript tanpa garis miring pembuka dan penutup, lalu isi Test text dan klik Test.",
    "Hasil menampilkan teks yang cocok, posisi, dan grup tangkapan. Flag g mencari semua kecocokan. i mengabaikan kapitalisasi. m membuat penanda awal dan akhir berlaku per baris. u memakai aturan Unicode. Opsi gabungan menerapkan semua flag yang ditampilkan. None mencari kecocokan pertama tanpa flag.",
    "Hasil dibatasi hingga 500 kecocokan dan pola yang terlalu lama dihentikan."
  ],
  "curl": [
    "Tempel satu perintah cURL dengan URL HTTP(S), lalu pilih JavaScript Fetch atau Python Requests.",
    "Convert menghasilkan cuplikan kode dari metode, header, body literal, dan opsi redirect yang didukung. Perintah dan cuplikan tidak dijalankan.",
    "Gunakan argumen literal. Pipeline, ekspansi shell, dan body dari file tidak didukung."
  ]
}
