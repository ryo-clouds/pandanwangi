# PANDANWANGI — Asisten AI Pemerintah Kabupaten Cianjur

PANDANWANGI adalah sebuah prototipe Asisten Kecerdasan Buatan (AI) berbasis **Retrieval-Augmented Generation (RAG)** yang dikembangkan untuk menjawab pertanyaan masyarakat dan ASN Pemerintah Kabupaten Cianjur secara cepat, akurat, dan merujuk pada dokumen resmi pemerintah (seperti RPJMD, Renstra, SOP, dll).

Sistem ini mendukung akses melalui **Web Browser** dan **WhatsApp Bot**, sehingga sangat inklusif dan mudah diakses oleh siapapun tanpa perlu menginstal aplikasi tambahan.

## 🚀 Fitur Utama
- **Tanya Jawab Berbasis Dokumen (RAG)**: Jawaban digenerate berdasarkan dokumen PDF yang diunggah oleh admin, memastikan akurasi dan meminimalisir halusinasi AI.
- **Dukungan Multi-Kanal**:
  - **Aplikasi Web**: Antarmuka chat responsif (Mobile & Desktop).
  - **WhatsApp Bot**: Bot otomatis membalas pesan di WA menggunakan library Baileys.
- **Admin Dashboard**: Panel khusus admin untuk mengunggah dokumen baru, memonitor log analitik penggunaan, dan menghapus percakapan.
- **Ekstraksi Teks (OCR)**: Mendukung pemindaian dokumen PDF berbasis gambar (hasil scan) menggunakan Tesseract.

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Vite, CSS Native
- **Backend**: Node.js, Express, TypeScript
- **AI & RAG**: LangChain.js, HuggingFace Inference API (Mixtral/Llama 3)
- **Database / Vector Store**: Supabase (PostgreSQL + pgvector)
- **WhatsApp Integration**: `@whiskeysockets/baileys`

---

## 💻 Cara Instalasi & Menjalankan (Development)

### 1. Persyaratan Sistem
Pastikan Anda sudah menginstal:
- **Node.js** (v20 LTS disarankan)
- **Git**
- Dependensi sistem operasi untuk pemrosesan PDF:
  - Ubuntu/Debian: `sudo apt install poppler-utils tesseract-ocr tesseract-ocr-ind`
  - MacOS (via Homebrew): `brew install poppler tesseract tesseract-lang`

### 2. Kloning & Instalasi Paket
Proyek ini menggunakan struktur *Monorepo* ringan (Client & Server).

```bash
git clone https://github.com/ryoclouds/pandanwangi.git
cd pandanwangi/ai-agent-js

# Menginstal dependensi di root, /server, dan /client secara bersamaan
npm run setup
```

### 3. Konfigurasi Environment Variable
Duplikat file `.env.example` (jika ada) atau buat file `.env` baru di dalam folder `server/`:

```bash
cd server
nano .env
```
Contoh isi `server/.env`:
```env
PORT=3001
HF_TOKEN=hf_xxxxxxxxx...
SUPABASE_PROJECT_URL=https://xxxx.supabase.co
DATABASE_PASSWORD=xxxxxx
SUPABASE_BUCKET=knowledge-bucket
SERVICE_ROLE_KEY=eyJhb....
ANON_KEY=eyJhb....
JWT_SECRET=rahasia_negara_cianjur_2024
ADMIN_PASSWORD=cianjur_jago
GOOGLE_VISION_API_KEY=AIzaSy...
WHATSAPP_ENABLED=true
```

### 4. Menjalankan Aplikasi
Kembali ke root folder `ai-agent-js` dan jalankan script dev:

```bash
cd ..
npm run dev
```

Script ini akan menjalankan **Vite Frontend** dan **Node.js Backend** secara bersamaan.
- **Frontend Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

Jika `WHATSAPP_ENABLED=true`, perhatikan terminal Anda karena akan muncul **QR Code**. Scan QR Code tersebut menggunakan aplikasi WhatsApp Anda (fitur Linked Devices) untuk mengaktifkan bot WhatsApp.

---

## 🐳 Deployment (Production)

Untuk mendeploy di VPS (misal Ubuntu 24.04), disarankan menggunakan **PM2** dan **Nginx**. Panduan arsitektur deployment secara penuh akan dirilis menyusul, namun perintah dasarnya adalah:

1. Build Frontend: `cd client && npm run build`
2. Jalankan PM2: `pm2 start ecosystem.config.js` (pastikan Anda sudah membuat konfigurasi ecosystem PM2).

---

## 📄 Lisensi
Sistem ini bersifat Open-Source untuk keperluan Lomba Inovasi Daerah (LIDa) dan pengembangan ekosistem digital Kabupaten Cianjur.
