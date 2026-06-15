import { useState } from 'react';
import {
    BookOpen, ChevronDown, ChevronRight, Download,
    Upload, MessageSquare, Database, Settings,
    Shield, Server, Wifi, AlertCircle, CheckCircle,
    FileText, RefreshCw, Trash2, Info, Terminal
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Section {
    id: string;
    icon: React.ReactNode;
    title: string;
    content: React.ReactNode;
}

// ── Accordion Item ─────────────────────────────────────────────────────────────
function AccordionItem({ section, defaultOpen = false }: { section: Section; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="pedoman-accordion-item" style={{ marginBottom: '12px' }}>
            <button
                className="pedoman-accordion-header"
                onClick={() => setOpen(!open)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    background: open ? 'var(--brand-50)' : 'white',
                    border: '1px solid',
                    borderColor: open ? 'var(--brand-100)' : 'var(--slate-200)',
                    borderRadius: open ? '10px 10px 0 0' : '10px',
                    cursor: 'pointer',
                    color: 'var(--slate-800)',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    boxShadow: open ? 'none' : '0 1px 2px rgba(0,0,0,0.02)',
                }}
            >
                <span style={{ color: open ? 'var(--brand-600)' : 'var(--slate-500)', flexShrink: 0 }}>
                    {section.icon}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', flex: 1 }}>{section.title}</span>
                <span style={{ color: 'var(--slate-400)', flexShrink: 0 }}>
                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
            </button>
            {open && (
                <div style={{
                    background: 'white',
                    border: '1px solid var(--brand-100)',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    padding: '20px 24px',
                    fontSize: '0.875rem',
                    color: 'var(--slate-600)',
                    lineHeight: 1.75,
                }}>
                    {section.content}
                </div>
            )}
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Step({ num, text }: { num: number; text: string }) {
    return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{
                minWidth: '26px', height: '26px',
                background: 'var(--brand-100)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-700)', flexShrink: 0,
            }}>{num}</span>
            <span style={{ color: 'var(--slate-700)' }}>{text}</span>
        </div>
    );
}

function Note({ type, text }: { type: 'info' | 'warning' | 'success'; text: string }) {
    const cfg = {
        info:    { bg: '#eff6ff', border: '#bfdbfe', icon: <Info size={18} />,         color: '#1e40af' },
        warning: { bg: '#fffbeb', border: '#fde68a', icon: <AlertCircle size={18} />,  color: '#b45309' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle size={18} />,  color: '#166534' },
    }[type];
    return (
        <div style={{
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: '8px', padding: '12px 16px',
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            margin: '16px 0', color: cfg.color, fontSize: '0.85rem',
            lineHeight: 1.6
        }}>
            <span style={{ flexShrink: 0, marginTop: '2px' }}>{cfg.icon}</span>
            <span>{text}</span>
        </div>
    );
}

function CodeBlock({ code }: { code: string }) {
    return (
        <pre style={{
            background: 'var(--slate-900)', border: '1px solid var(--slate-800)',
            borderRadius: '8px', padding: '16px',
            fontSize: '0.8rem', color: 'var(--slate-50)',
            overflowX: 'auto', margin: '16px 0',
            fontFamily: 'monospace', lineHeight: 1.6,
        }}>{code}</pre>
    );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div style={{ overflowX: 'auto', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--slate-200)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} style={{
                                background: 'var(--slate-50)', color: 'var(--slate-700)',
                                padding: '12px 16px', textAlign: 'left',
                                borderBottom: '1px solid var(--slate-200)',
                                fontWeight: 600
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : 'var(--slate-50)' }}>
                            {row.map((cell, j) => (
                                <td key={j} style={{
                                    padding: '12px 16px',
                                    borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--slate-100)',
                                    color: j === 0 ? 'var(--slate-800)' : 'var(--slate-600)',
                                    fontWeight: j === 0 ? 500 : 400,
                                }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Content Sections ───────────────────────────────────────────────────────────
const SECTIONS: Section[] = [
    {
        id: 'overview',
        icon: <BookOpen size={18} />,
        title: '1. Gambaran Umum Sistem',
        content: (
            <div>
                <p>
                    <strong style={{ color: 'var(--brand-600)' }}>PANDANWANGI</strong> adalah platform Asisten AI berbasis
                    teknologi <em>Retrieval-Augmented Generation</em> (RAG) yang dirancang untuk membantu masyarakat dan ASN
                    Pemerintah Kabupaten Cianjur dalam mengakses informasi dari dokumen kebijakan resmi secara cepat,
                    akurat, dan 24 jam sehari.
                </p>
                <br />
                <Table
                    headers={['Komponen', 'Teknologi', 'Fungsi']}
                    rows={[
                        ['Frontend (UI)', 'React 19 + TypeScript + Vite', 'Antarmuka web pengguna'],
                        ['Backend (API)', 'Node.js + Express + TypeScript', 'Logika bisnis & routing'],
                        ['Database', 'Supabase (PostgreSQL)', 'Penyimpanan data & dokumen'],
                        ['Vector Store', 'Supabase pgvector', 'Pencarian semantik dokumen'],
                        ['AI Model', 'HuggingFace Inference API', 'Pemrosesan bahasa alami'],
                        ['RAG Framework', 'LangChain.js', 'Pipeline retrieval + generation'],
                        ['OCR', 'Google Cloud Vision API', 'Ekstraksi teks PDF scan'],
                        ['WhatsApp', 'Baileys (WA Web API)', 'Kanal chatbot WhatsApp'],
                        ['Auth', 'JWT (JSON Web Token)', 'Autentikasi admin'],
                    ]}
                />
                <Note type="info" text="Semua komponen menggunakan layanan gratis (free tier) atau open-source, sehingga biaya operasional awal adalah Rp 0/bulan." />
            </div>
        ),
    },
    {
        id: 'login',
        icon: <Shield size={18} />,
        title: '2. Login & Autentikasi Admin',
        content: (
            <div>
                <p>Akses halaman admin memerlukan autentikasi. Berikut langkah-langkahnya:</p>
                <br />
                <Step num={1} text='Klik menu "Login Admin" di bagian bawah sidebar kiri.' />
                <Step num={2} text='Masukkan password admin yang telah dikonfigurasi di file .env server (variabel ADMIN_PASSWORD).' />
                <Step num={3} text='Klik tombol "Login". Sistem akan memverifikasi password dan mengeluarkan JWT token.' />
                <Step num={4} text='Setelah berhasil, Anda akan diarahkan ke halaman utama dengan menu admin aktif (Upload Dokumen, Manajemen Dokumen, Laporan Penggunaan, Pedoman Teknis).' />
                <br />
                <Note type="warning" text='Token admin disimpan di localStorage browser. Untuk keamanan, selalu klik tombol "Keluar" setelah selesai menggunakan panel admin.' />
                <Note type="info" text="Jika lupa password, ubah nilai ADMIN_PASSWORD di file server/.env lalu restart server." />
            </div>
        ),
    },
    {
        id: 'upload',
        icon: <Upload size={18} />,
        title: '3. Upload & Indeksasi Dokumen',
        content: (
            <div>
                <p>Fitur ini memungkinkan admin mengunggah dokumen PDF untuk diindeks ke dalam basis pengetahuan AI.</p>
                <br />
                <Step num={1} text='Buka halaman "Upload Dokumen" melalui menu sidebar.' />
                <Step num={2} text='Seret file PDF ke area upload atau klik untuk memilih file dari perangkat Anda.' />
                <Step num={3} text='Sistem akan memulai proses: (a) upload file ke Supabase Storage, (b) ekstraksi teks (dengan OCR otomatis jika dokumen hasil scan), (c) pemotongan teks menjadi chunks, (d) pembuatan embedding semantik, (e) penyimpanan ke vector database.' />
                <Step num={4} text='Tunggu hingga muncul notifikasi "Berhasil diindeks". Durasi tergantung ukuran dan kompleksitas file.' />
                <br />
                <Note type="success" text="Sistem secara otomatis mendeteksi dokumen hasil scan (scanned PDF) dan mengaktifkan OCR via Google Cloud Vision API tanpa konfigurasi tambahan." />
                <Note type="warning" text="Pastikan nama file mencantumkan tahun (contoh: RPJMD_2024.pdf) agar sistem dapat mengekstrak metadata tahun secara otomatis." />
                <br />
                <Table
                    headers={['Format', 'Dukungan', 'Catatan']}
                    rows={[
                        ['PDF teks digital', '✅ Penuh', 'Langsung diekstrak, paling cepat'],
                        ['PDF hasil scan', '✅ Penuh (OCR)', 'Diproses via Google Vision API'],
                        ['PDF terenkripsi', '❌ Tidak', 'Buka enkripsi terlebih dahulu'],
                        ['DOCX / XLSX', '❌ Belum', 'Konversi ke PDF dahulu'],
                    ]}
                />
            </div>
        ),
    },
    {
        id: 'documents',
        icon: <FileText size={18} />,
        title: '4. Manajemen Dokumen',
        content: (
            <div>
                <p>Halaman Manajemen Dokumen menampilkan daftar seluruh dokumen yang telah diindeks beserta statusnya.</p>
                <br />
                <Table
                    headers={['Fitur', 'Fungsi']}
                    rows={[
                        ['Toggle Aktif/Nonaktif', 'Menonaktifkan dokumen agar tidak digunakan dalam pencarian AI tanpa menghapusnya dari database'],
                        ['Re-index', 'Mengindeks ulang dokumen jika jumlah chunks = 0 atau terjadi error saat upload pertama'],
                        ['Regenerate Summary', 'Membuat ulang ringkasan CAG dari dokumen untuk meningkatkan akurasi jawaban'],
                        ['Hapus Dokumen', 'Menghapus dokumen dari database (file di storage tidak otomatis terhapus)'],
                        ['Flush Vector Store', 'Menghapus SEMUA chunks dari vector database. Gunakan hanya jika ingin reset total'],
                    ]}
                />
                <br />
                <Note type="warning" text='"Flush Vector Store" akan menghapus semua data indeks. Semua dokumen harus di-upload ulang setelah operasi ini.' />
                <Note type="info" text="Dokumen yang dinonaktifkan tidak akan muncul dalam hasil pencarian AI, namun datanya tetap tersimpan di database." />
            </div>
        ),
    },
    {
        id: 'chat',
        icon: <MessageSquare size={18} />,
        title: '5. Cara Penggunaan Chat',
        content: (
            <div>
                <p>Fitur chat tersedia untuk semua pengguna (tanpa login) melalui halaman utama.</p>
                <br />
                <Step num={1} text='Buka halaman utama aplikasi. Anda akan disambut oleh Pandan Wangi, asisten AI Kabupaten Cianjur.' />
                <Step num={2} text='Ketikkan pertanyaan dalam Bahasa Indonesia di kolom chat bagian bawah. Contoh: "Apa visi misi Kabupaten Cianjur?" atau "Jelaskan program stunting di Cianjur".' />
                <Step num={3} text='Tekan Enter atau klik tombol kirim. Sistem akan mencari di seluruh dokumen yang terindeks.' />
                <Step num={4} text='Jawaban akan ditampilkan beserta sumber referensi (nama dokumen) untuk verifikasi.' />
                <Step num={5} text='Percakapan disimpan otomatis dalam sesi. Anda dapat mengakses riwayat percakapan di sidebar kiri.' />
                <br />
                <Note type="success" text="Sistem mendukung percakapan multi-gilir (multi-turn). Anda bisa mengajukan pertanyaan lanjutan tanpa mengulang konteks." />
                <Note type="info" text='Untuk pertanyaan terbaik: gunakan kata kunci yang spesifik. Contoh: "anggaran RPJMD 2024" lebih baik dari "anggaran".' />
                <br />
                <p style={{ color: 'var(--slate-600)', marginTop: '12px', padding: '16px', background: 'var(--slate-50)', borderRadius: '8px' }}>
                    <strong style={{ color: 'var(--slate-800)' }}>Via WhatsApp:</strong> Kirim pesan ke nomor WhatsApp yang dikonfigurasi di server.
                    Format bebas, sistem akan otomatis mengenali dan menjawab pertanyaan Anda.
                </p>
            </div>
        ),
    },
    {
        id: 'server',
        icon: <Server size={18} />,
        title: '6. Konfigurasi & Menjalankan Server',
        content: (
            <div>
                <p>Panduan untuk menjalankan server PANDANWANGI secara lokal atau di lingkungan produksi.</p>
                <br />
                <p style={{ fontWeight: 600, color: 'var(--slate-800)', marginBottom: '8px' }}>Prasyarat:</p>
                <Table
                    headers={['Software', 'Versi Minimum']}
                    rows={[
                        ['Node.js', 'v18.0.0 atau lebih baru'],
                        ['npm', 'v9.0.0 atau lebih baru'],
                        ['Akun Supabase', 'Free tier cukup'],
                        ['HuggingFace Token', 'Free (daftar di huggingface.co)'],
                    ]}
                />
                <br />
                <p style={{ fontWeight: 600, color: 'var(--slate-800)', marginBottom: '8px' }}>Cara menjalankan (dari folder root):</p>
                <CodeBlock code={`# Install semua dependensi (jalankan sekali)
npm install

# Jalankan server + client sekaligus
npm run dev

# Atau jalankan terpisah:
cd server && npm run dev    # Server di port 3001
cd client && npm run dev    # Client di port 5173`} />
                <br />
                <p style={{ fontWeight: 600, color: 'var(--slate-800)', marginBottom: '8px' }}>Variabel lingkungan (server/.env):</p>
                <Table
                    headers={['Variabel', 'Keterangan', 'Wajib']}
                    rows={[
                        ['PORT', 'Port server (default: 3001)', 'Opsional'],
                        ['HF_TOKEN', 'Token HuggingFace untuk model AI', 'Ya'],
                        ['SUPABASE_PROJECT_URL', 'URL project Supabase', 'Ya'],
                        ['SERVICE_ROLE_KEY', 'Service role key Supabase', 'Ya'],
                        ['ANON_KEY', 'Anonymous key Supabase', 'Ya'],
                        ['SUPABASE_BUCKET', 'Nama bucket storage (default: knowledge-bucket)', 'Opsional'],
                        ['JWT_SECRET', 'Secret key untuk token admin', 'Ya'],
                        ['ADMIN_PASSWORD', 'Password login admin dashboard', 'Ya'],
                        ['GOOGLE_VISION_API_KEY', 'API key Google Cloud Vision untuk OCR', 'Opsional'],
                        ['WHATSAPP_ENABLED', 'Aktifkan bot WhatsApp (true/false)', 'Opsional'],
                    ]}
                />
                <Note type="warning" text="Jangan pernah commit file .env ke repository publik. Pastikan .env ada di .gitignore." />
            </div>
        ),
    },
    {
        id: 'troubleshoot',
        icon: <RefreshCw size={18} />,
        title: '7. Pemecahan Masalah (Troubleshooting)',
        content: (
            <div>
                <Table
                    headers={['Masalah', 'Kemungkinan Penyebab', 'Solusi']}
                    rows={[
                        ['Server tidak bisa start / stuck', 'Konflik npm workspace atau node_modules korup', 'Hapus semua node_modules & package-lock.json, jalankan npm install dari folder root'],
                        ['Port 3001 sudah dipakai', 'Aplikasi lain berjalan di port yang sama', 'Ubah PORT di server/.env ke nomor port lain (misal 3002)'],
                        ['Upload dokumen gagal (0 chunks)', 'PDF terenkripsi atau file rusak', 'Buka enkripsi PDF, lalu coba upload ulang atau gunakan tombol Re-index'],
                        ['Jawaban AI tidak relevan', 'Dokumen belum diindeks atau chunks terlalu sedikit', 'Upload ulang dokumen, cek jumlah chunks di Manajemen Dokumen'],
                        ['OCR tidak berjalan', 'Google Vision API key tidak dikonfigurasi', 'Tambahkan GOOGLE_VISION_API_KEY di file .env dan restart server'],
                        ['WhatsApp tidak connect', 'Session QR kadaluarsa atau folder auth rusak', 'Hapus folder server/data/whatsapp_auth dan restart server, scan QR baru'],
                        ['Login admin gagal', 'Password salah atau JWT_SECRET berubah', 'Cek ADMIN_PASSWORD di .env. Jika JWT_SECRET diubah, semua token lama invalid'],
                        ['Supabase error 401', 'API key salah atau kadaluarsa', 'Regenerate key di Supabase dashboard dan update .env'],
                    ]}
                />
                <br />
                <Note type="info" text="Untuk melihat log detail server, periksa output terminal tempat server dijalankan. Log mencakup setiap request, proses indexing, dan error." />
            </div>
        ),
    },
    {
        id: 'api',
        icon: <Terminal size={18} />,
        title: '8. Referensi API Endpoint',
        content: (
            <div>
                <p style={{ marginBottom: '16px' }}>Base URL: <code style={{ background: 'var(--slate-100)', padding: '4px 8px', borderRadius: '4px', color: 'var(--brand-600)', border: '1px solid var(--slate-200)' }}>http://localhost:3001/api</code></p>
                <Table
                    headers={['Method', 'Endpoint', 'Auth', 'Fungsi']}
                    rows={[
                        ['GET', '/health', 'Tidak', 'Cek status server'],
                        ['POST', '/login', 'Tidak', 'Login admin, mendapatkan JWT token'],
                        ['POST', '/sessions', 'Tidak', 'Buat sesi percakapan baru'],
                        ['GET', '/sessions', 'Tidak', 'Ambil daftar sesi'],
                        ['GET', '/sessions/:id', 'Tidak', 'Ambil pesan dalam satu sesi'],
                        ['DELETE', '/sessions/:id', 'Tidak', 'Hapus sesi'],
                        ['POST', '/api/chat', 'Tidak', 'Kirim pertanyaan ke AI'],
                        ['POST', '/api/upload', 'Admin', 'Upload dan indeks dokumen PDF'],
                        ['GET', '/api/documents', 'Admin', 'Daftar dokumen terindeks'],
                        ['DELETE', '/api/documents/:id', 'Admin', 'Hapus dokumen'],
                        ['PATCH', '/api/documents/:id/toggle', 'Admin', 'Aktifkan/nonaktifkan dokumen'],
                        ['POST', '/api/documents/:id/reindex', 'Admin', 'Indeks ulang dokumen'],
                        ['DELETE', '/api/vectors/flush', 'Admin', 'Hapus semua chunks'],
                        ['GET', '/api/analytics/stats', 'Admin', 'Statistik penggunaan'],
                        ['GET', '/api/cache/stats', 'Admin', 'Statistik cache CAG'],
                        ['DELETE', '/api/cache/flush', 'Admin', 'Hapus semua cache'],
                    ]}
                />
                <Note type="info" text='Endpoint yang memerlukan Auth harus menyertakan header: Authorization: Bearer <token>' />
            </div>
        ),
    },
    {
        id: 'maintenance',
        icon: <Database size={18} />,
        title: '9. Pemeliharaan Rutin',
        content: (
            <div>
                <Table
                    headers={['Frekuensi', 'Kegiatan', 'Cara']}
                    rows={[
                        ['Setiap ada dokumen baru', 'Upload dokumen terbaru', 'Halaman Upload Dokumen → pilih file → tunggu selesai'],
                        ['Mingguan', 'Cek laporan penggunaan', 'Halaman Laporan Penggunaan → review pertanyaan populer'],
                        ['Bulanan', 'Arsip sesi lama', 'Hapus sesi percakapan lama via Sidebar → ikon Trash'],
                        ['Bulanan', 'Cek dokumen nonaktif', 'Manajemen Dokumen → aktifkan/hapus dokumen yang sudah tidak relevan'],
                        ['Bila ada perubahan dokumen besar', 'Re-generate summary', 'Manajemen Dokumen → klik ikon Refresh pada dokumen terkait'],
                        ['Bila sistem terasa lambat', 'Flush CAG cache', 'Laporan Penggunaan → tombol Flush Cache'],
                    ]}
                />
                <br />
                <Note type="success" text="Sistem memiliki mekanisme cache otomatis. Semakin sering digunakan, semakin cepat respons AI karena pola pertanyaan sudah ter-cache." />
            </div>
        ),
    },
    {
        id: 'contact',
        icon: <Wifi size={18} />,
        title: '10. Kontak & Dukungan Teknis',
        content: (
            <div>
                <Table
                    headers={['Aspek', 'Keterangan']}
                    rows={[
                        ['Pengembang', 'Fajar Afriansyah'],
                        ['Email', 'fajarafriansyah12@gmail.com'],
                        ['Versi Sistem', 'PANDANWANGI v1.0 — Juni 2026'],
                        ['Status', 'Inisiatif / Prototipe'],
                        ['Lisensi', 'Open-source (MIT License)'],
                    ]}
                />
                <br />
                <Note type="info" text="Untuk pelaporan bug atau permintaan fitur baru, hubungi pengembang melalui email atau buat issue di repository GitHub proyek ini." />
                <Note type="success" text="Dokumentasi ini akan diperbarui secara berkala seiring perkembangan sistem PANDANWANGI." />
            </div>
        ),
    },
];

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PedomanTeknisPage() {
    const handleDownloadDocx = () => {
        window.open(
            'https://docs.google.com/uc?export=download&id=PLACEHOLDER_GOOGLE_DRIVE_ID',
            '_blank'
        );
    };

    return (
        <div style={{ padding: '24px', maxWidth: '860px', margin: '0 auto', overflowY: 'auto', height: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '28px',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        background: 'var(--brand-50)',
                        border: '1px solid var(--brand-100)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <BookOpen size={28} color="var(--brand-600)" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                            Pedoman Teknis
                        </h1>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                            PANDANWANGI — Asisten AI Pemerintah Kabupaten Cianjur
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleDownloadDocx}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 18px',
                        background: 'white',
                        border: '1px solid var(--slate-200)', 
                        borderRadius: '8px',
                        color: 'var(--slate-700)', cursor: 'pointer',
                        fontSize: '0.875rem', fontWeight: 600,
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--slate-50)';
                        e.currentTarget.style.borderColor = 'var(--slate-300)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = 'var(--slate-200)';
                    }}
                >
                    <Download size={16} />
                    Unduh PDF / DOCX
                </button>
            </div>

            {/* Version badge */}
            <div style={{
                display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap',
            }}>
                {[
                    { label: 'Versi 1.0', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
                    { label: 'Juni 2026', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
                    { label: 'Inisiatif', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
                ].map(badge => (
                    <span key={badge.label} style={{
                        padding: '4px 12px', borderRadius: '20px',
                        background: badge.bg, border: `1px solid ${badge.border}`,
                        color: badge.color, fontSize: '0.75rem', fontWeight: 600,
                    }}>{badge.label}</span>
                ))}
            </div>

            {/* Intro */}
            <div style={{
                background: 'white',
                border: '1px solid var(--slate-200)',
                borderLeft: '4px solid var(--brand-500)',
                borderRadius: '8px',
                padding: '20px 24px',
                marginBottom: '28px',
                fontSize: '0.9rem',
                color: 'var(--slate-600)',
                lineHeight: 1.7,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                Dokumen ini merupakan panduan teknis penggunaan dan pengelolaan sistem <strong style={{ color: 'var(--brand-600)' }}>PANDANWANGI</strong>.
                Pedoman ini ditujukan bagi operator dan administrator sistem. Klik setiap bagian untuk memperluas kontennya.
            </div>

            {/* Accordion Sections */}
            {SECTIONS.map((s, i) => (
                <AccordionItem key={s.id} section={s} defaultOpen={i === 0} />
            ))}

            {/* Footer */}
            <div style={{
                marginTop: '32px',
                padding: '24px',
                background: 'var(--slate-50)',
                border: '1px solid var(--slate-200)',
                borderRadius: '10px',
                fontSize: '0.8rem',
                color: 'var(--slate-500)',
                textAlign: 'center',
            }}>
                Pedoman Teknis PANDANWANGI v1.0 — Revisi: Juni 2026 — Pengembang: Fajar Afriansyah
            </div>
        </div>
    );
}
