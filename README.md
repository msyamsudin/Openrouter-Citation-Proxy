# OpenRouter Citation Proxy
Alat yang berfungsi untuk mengambil **URL rujukan (citations)** dari model **Perplexity/Sonar** melalui **OpenRouter**. Secara default, OpenRouter tidak menyertakan metadata URL rujukan dalam respon API-nya.

## Key Features
- **Ekstraksi URL Rujukan**: Secara otomatis mengidentifikasi URL rujukan dari topik apa pun.

### Prerequisites
- **Node.js** (versi LTS direkomendasikan)
- **API Key OpenRouter**

### Setup Instructions
1. **Instal Dependensi**:
   ```bash
   npm install
   cd server && npm install
   ```
2. **Konfigurasi API Key OpenRouter**:
   Ada dua cara untuk mengkonfigurasi API Key OpenRouter:
   - **Via UI (Direkomendasikan)**: Jalankan aplikasi, klik **Settings** (ikon roda gigi) di pojok kanan atas, dan masukkan API Key OpenRouter Kamu. Ini akan disimpan ke `server/config.json`.
   - **Via Environment Variable**: Ubah nama `.env.example` menjadi `.env.local` dan tempelkan API Key OpenRouter Kamu:
     ```
     OPENROUTER_API_KEY=sk-or-v1-your-key-here
     ```
3. **Jalankan Aplikasi**:
   Gunakan skrip batch yang disediakan untuk menjalankan frontend dan backend secara bersamaan:
   ```bash
   ./Run.bat
   ```
   Atau jalankan secara manual:
   - **Frontend**: `npm run dev` (Port 5173)
   - **Backend**: `node server/index.js` (Port 3001)

## Development
- **Frontend**: React + Vite + TailwindCSS + Lucide Icons.
- **Backend**: Server Express.js yang bertindak sebagai proxy ke OpenRouter API.

## License
[MIT License](LICENSE).

---