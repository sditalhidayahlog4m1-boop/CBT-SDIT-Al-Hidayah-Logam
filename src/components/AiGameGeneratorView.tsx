import React, { useState, useEffect, useRef, useMemo } from 'react';
import { shuffleGameDataMap, shuffleArray, getStoredSubjects, getStoredBanks } from '../utils/storage';
import { AuthUser, Subject, QuestionBank, Question, GameHistoryLog } from '../types';
import {
  Gamepad2,
  Sparkles,
  Loader2,
  Play,
  RotateCcw,
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Brain,
  Download,
  Share2,
  Volume2,
  VolumeX,
  Grid,
  Layers,
  Heart,
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  ArrowRight,
  Flame,
  Award,
  BookOpen,
  FileCode,
  Check,
  Trash2,
  Database,
  Edit3,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Eye,
  PlusCircle,
  FileText,
  Save,
  ClipboardList,
  Pin,
  Rocket,
  Info,
} from 'lucide-react';
import { parseRawDocumentText } from './ManualQuestionBuilder';

export type GameMode =
  | 'pilihan-ganda'
  | 'sambung-ayat'
  | 'melengkapi-ayat'
  | 'tebak-surat'
  | 'tebak-nomor-ayat'
  | 'tebak-audio'
  | 'puzzle-ayat'
  | 'memory-card'
  | 'ular-tangga-islami'
  | 'export-game';

interface GameItem {
  id: string;
  category?: string;
  subject_name?: string;
  difficulty?: 'Mudah' | 'Sedang' | 'Sulit';
  prompt_text: string;
  arabic_text?: string;
  translation?: string;
  options?: string[];
  correct_answer?: string;
  puzzle_pieces?: string[];
  correct_order?: string[];
  explanation?: string;
  surah_name?: string;
  surah_number?: number;
  ayah_number?: number;
  audio_text?: string;
  audio_url?: string;
}

export const QARI_LIST = [
  { id: 'alafasy', name: 'Syaikh Mishary Rashid Al-Afasy (Murottal Merdu Original)', cdn: 'https://everyayah.com/data/Alafasy_128kbps/' },
  { id: 'husary', name: 'Syaikh Mahmoud Khalil Al-Husary (Tajweed Halus & Jelas)', cdn: 'https://everyayah.com/data/Husary_128kbps/' },
  { id: 'minshawi', name: 'Syaikh Siddiq Al-Minshawi (Tartil Khusyu & Lembut)', cdn: 'https://everyayah.com/data/Minshawy_Murattal_128kbps/' },
  { id: 'ghamadi', name: 'Syaikh Saad Al-Ghamdi (Tartil Jelas & Halus)', cdn: 'https://everyayah.com/data/Ghamadi_40kbps/' },
  { id: 'sudais', name: 'Syaikh Abdul Rahman Al-Sudais (Murottal Haramain)', cdn: 'https://everyayah.com/data/Sudais_128kbps/' },
  { id: 'abdulbasit', name: 'Syaikh Abdul Samad / Abdul Basit (Qari Klasik)', cdn: 'https://everyayah.com/data/AbdulSamad_64kbps_Offerlm/' },
  { id: 'hani_rifai', name: 'Syaikh Hani Ar-Rifai (Suara Syahdu & Halus)', cdn: 'https://everyayah.com/data/Hani_Rifai_192kbps/' },
  { id: 'tts_indonesia', name: '🇮🇩 Suara Narasi Indonesia (Suara Jelas & Lembut)', cdn: '' },
];

export function getBestIndonesianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Search for Indonesian voices with natural/female/gentle name patterns
  const idVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().includes('id') ||
      v.lang.toLowerCase().includes('ind') ||
      v.name.toLowerCase().includes('indonesia')
  );

  if (idVoices.length > 0) {
    const preferred = idVoices.find(
      (v) =>
        v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('gadis') ||
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('damayanti') ||
        v.name.toLowerCase().includes('siti') ||
        v.name.toLowerCase().includes('female')
    );
    return preferred || idVoices[0];
  }
  return null;
}

export function resolveQuranAudioUrl(item: GameItem, qariId = 'alafasy'): string | null {
  if (item.audio_url) return item.audio_url;

  let surahNum = item.surah_number;
  let ayahNum = item.ayah_number || 1;

  if (!surahNum) {
    const textToSearch = `${item.surah_name || ''} ${item.prompt_text || ''} ${item.correct_answer || ''} ${(item.options || []).join(' ')}`;
    const lower = textToSearch.toLowerCase();

    // Check for "surah X ayat Y" or "X:Y" format
    const verseMatch = lower.match(/(?:surah|surat)\s*([a-z'\s\-]+)?\s*ayat\s*(\d+)/i) || lower.match(/(\d{1,3})\s*:\s*(\d{1,3})/);
    if (verseMatch && verseMatch[2]) {
      ayahNum = parseInt(verseMatch[2], 10) || 1;
    }

    if (lower.includes('ikhlas')) surahNum = 112;
    else if (lower.includes('falaq')) surahNum = 113;
    else if (lower.includes('nasr')) surahNum = 110;
    else if (lower.includes('nas') || lower.includes('an-nas')) surahNum = 114;
    else if (lower.includes('fatihah')) surahNum = 1;
    else if (lower.includes('kawthar') || lower.includes('kausar')) surahNum = 108;
    else if (lower.includes('fil') || lower.includes('al-fil')) surahNum = 105;
    else if (lower.includes('kafirun')) surahNum = 109;
    else if (lower.includes('ma\'un') || lower.includes('maun')) surahNum = 107;
    else if (lower.includes('qadr')) surahNum = 97;
    else if (lower.includes('asr')) surahNum = 103;
    else if (lower.includes('quraysh') || lower.includes('quraisy')) surahNum = 106;
    else if (lower.includes('lahab') || lower.includes('masad')) surahNum = 111;
    else if (lower.includes('humazah')) surahNum = 104;
    else if (lower.includes('takathur') || lower.includes('takasur')) surahNum = 102;
    else if (lower.includes('qariah') || lower.includes('qari\'ah')) surahNum = 101;
    else if (lower.includes('adiyat')) surahNum = 100;
    else if (lower.includes('zalzalah')) surahNum = 99;
    else if (lower.includes('bayyinah')) surahNum = 98;
    else if (lower.includes('tin')) surahNum = 95;
    else if (lower.includes('inshirah') || lower.includes('syarh')) surahNum = 94;
    else if (lower.includes('duha')) surahNum = 93;
    else if (lower.includes('balad')) surahNum = 90;
    else if (lower.includes('shams') || lower.includes('syams')) surahNum = 91;
    else if (lower.includes('ala') || lower.includes('a\'la')) surahNum = 87;
    else if (lower.includes('ghashiyah')) surahNum = 88;
    else if (lower.includes('baqarah') || lower.includes('bakarah')) surahNum = 2;
    else if (lower.includes('ali imran') || lower.includes('imran')) surahNum = 3;
    else if (lower.includes('yasin') || lower.includes('yaseen')) surahNum = 36;
    else if (lower.includes('mulk')) surahNum = 67;
    else if (lower.includes('kahf') || lower.includes('kahfi')) surahNum = 18;
    else if (lower.includes('rahman')) surahNum = 55;
    else if (lower.includes('waqiah') || lower.includes('waqi\'ah')) surahNum = 56;
    else if (lower.includes('naba')) surahNum = 78;
    else if (lower.includes('nazi\'at') || lower.includes('naziat')) surahNum = 79;
    else if (lower.includes('abasa')) surahNum = 80;
    else if (lower.includes('takwir')) surahNum = 81;
    else if (lower.includes('infitar')) surahNum = 82;
    else if (lower.includes('mutaffifin')) surahNum = 83;
    else if (lower.includes('inshiqaq')) surahNum = 84;
    else if (lower.includes('buruj')) surahNum = 85;
    else if (lower.includes('tariq')) surahNum = 86;
    else if (lower.includes('fajr')) surahNum = 89;
    else if (lower.includes('layl') || lower.includes('lail')) surahNum = 92;
  }

  if (item.arabic_text) {
    const ar = item.arabic_text;
    if (ar.includes('قُلْ هُوَ اللَّهُ أَحَدٌ') || ar.includes('قل هو الله احد')) { surahNum = 112; ayahNum = 1; }
    else if (ar.includes('قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ') || ar.includes('قل اعوذ برب الفلق')) { surahNum = 113; ayahNum = 1; }
    else if (ar.includes('قُلْ أَعُوذُ بِرَبِّ النَّاسِ') || ar.includes('قل اعوذ برب الناس')) { surahNum = 114; ayahNum = 1; }
    else if (ar.includes('إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ') || ar.includes('انا اعطيناك الكوثر')) { surahNum = 108; ayahNum = 1; }
    else if (ar.includes('أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ') || ar.includes('الم تر كيف فعل ربك')) { surahNum = 105; ayahNum = 1; }
    else if (ar.includes('إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ')) { surahNum = 1; ayahNum = 5; }
    else if (ar.includes('قُلْ يَا أَيُّهَا الْكَافِرُونَ')) { surahNum = 109; ayahNum = 1; }
    else if (ar.includes('إِذَا جَاءَ نصر اللَّهِ وَالْفَتْحُ') || ar.includes('إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ')) { surahNum = 110; ayahNum = 1; }
    else if (ar.includes('تَبَّتْ يَدَا أَبِي لَهَبٍ')) { surahNum = 111; ayahNum = 1; }
    else if (ar.includes('وَالْعَصْرِ')) { surahNum = 103; ayahNum = 1; }
    else if (ar.includes('إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ')) { surahNum = 97; ayahNum = 1; }
    else if (ar.includes('أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ')) { surahNum = 107; ayahNum = 1; }
    else if (ar.includes('اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ')) { surahNum = 2; ayahNum = 255; }
  }

  if (!surahNum) return null;

  const qariObj = QARI_LIST.find((q) => q.id === qariId) || QARI_LIST[0];
  if (!qariObj.cdn) return null;

  const sStr = String(surahNum).padStart(3, '0');
  const aStr = String(ayahNum).padStart(3, '0');

  return `${qariObj.cdn}${sStr}${aStr}.mp3`;
}

// Auto-Classifier for Game Questions
export function classifyGameItem(item: GameItem, preferredMode?: GameMode): GameMode {
  // 1. Explicit Category from AI or Data
  if (item.category) {
    const cat = item.category.toLowerCase().trim();
    if (cat === 'pilihan-ganda' || cat === 'pilihan_ganda' || cat === 'pg') return 'pilihan-ganda';
    if (cat === 'sambung-ayat' || cat === 'sambung_ayat' || cat === 'sambung-kalimat') return 'sambung-ayat';
    if (cat === 'melengkapi-ayat' || cat === 'melengkapi_ayat' || cat === 'melengkapi-kata') return 'melengkapi-ayat';
    if (cat === 'tebak-surat' || cat === 'tebak_surat' || cat === 'tebak-nama-surat') return 'tebak-surat';
    if (cat === 'tebak-nomor-ayat' || cat === 'tebak_nomor_ayat' || cat === 'nomor-ayat') return 'tebak-nomor-ayat';
    if (cat === 'tebak-audio' || cat === 'tebak_audio' || cat === 'dengar' || cat === 'mendengarkan' || cat === 'audio') return 'tebak-audio';
    if (cat === 'puzzle-ayat' || cat === 'puzzle_ayat' || cat === 'puzzle') return 'puzzle-ayat';
    if (cat === 'memory-card' || cat === 'memory_card' || cat === 'kartu-pasangan') return 'memory-card';
    if (cat === 'ular-tangga-islami' || cat === 'ular_tangga' || cat === 'ular-tangga') return 'ular-tangga-islami';
  }

  const prompt = (item.prompt_text || '').toLowerCase();
  const options = (item.options || []).map((o) => o.toLowerCase());
  const arabic = (item.arabic_text || '').toLowerCase();

  // 1.5. Tebak Audio / Mendengarkan
  if (
    prompt.includes('dengar') ||
    prompt.includes('mendengarkan') ||
    prompt.includes('suara') ||
    prompt.includes('audio') ||
    prompt.includes('simak') ||
    prompt.includes('bacaan audio') ||
    item.audio_text !== undefined
  ) {
    return 'tebak-audio';
  }

  // 2. Puzzle Ayat (Puzzle / Arranging pieces)
  if (
    (item.puzzle_pieces && item.puzzle_pieces.length > 0) ||
    (item.correct_order && item.correct_order.length > 0) ||
    prompt.includes('puzzle') ||
    prompt.includes('susun') ||
    prompt.includes('urutkan')
  ) {
    return 'puzzle-ayat';
  }

  // 3. Memory Card (Matching cards / pairs)
  if (
    prompt.includes('memory') ||
    prompt.includes('kartu') ||
    prompt.includes('pasangkan') ||
    prompt.includes('cocokkan') ||
    prompt.includes('card match')
  ) {
    return 'memory-card';
  }

  // 4. Tebak Nomor Ayat
  if (
    prompt.includes('nomor ayat') ||
    prompt.includes('ayat ke') ||
    prompt.includes('nomor berapa') ||
    options.some((o) => /^ayat\s*\d+/i.test(o) || /^\d+$/i.test(o))
  ) {
    return 'tebak-nomor-ayat';
  }

  // 5. Tebak Nama Surat
  const surahKeywords = [
    'al-fatihah', 'al-baqarah', 'an-nas', 'al-ikhlas', 'al-falaq', 'al-fil',
    'al-ma\'un', 'at-tin', 'al-qadr', 'al-kafirun', 'al-kawthar', 'al-quraysh',
    'al-humazah', 'al-\'asr', 'at-takathur', 'al-qari\'ah', 'al-\'adiyat', 'az-zalzalah'
  ];
  if (
    prompt.includes('tebak surat') ||
    prompt.includes('nama surat') ||
    prompt.includes('surat apakah') ||
    prompt.includes('termasuk surat') ||
    options.some((o) => surahKeywords.some((s) => o.includes(s)))
  ) {
    return 'tebak-surat';
  }

  // 6. Sambung Ayat (Continuation / sentence joining)
  if (
    prompt.includes('sambung') ||
    prompt.includes('kelanjutan') ||
    prompt.includes('setelah ayat') ||
    prompt.includes('ayat berikutnya') ||
    prompt.includes('lanjutan') ||
    prompt.includes('sambungkan')
  ) {
    return 'sambung-ayat';
  }

  // 7. Melengkapi Ayat (Fill-in-the-blank word or verse)
  if (
    prompt.includes('lengkapi') ||
    prompt.includes('rumpang') ||
    prompt.includes('hilang') ||
    arabic.includes('...') ||
    arabic.includes('___')
  ) {
    return 'melengkapi-ayat';
  }

  // 8. Ular Tangga Islami
  if (prompt.includes('ular tangga')) {
    return 'ular-tangga-islami';
  }

  // 9. Default to preferredMode if valid, else pilihan-ganda
  if (preferredMode && preferredMode !== 'export-game') {
    return preferredMode;
  }

  return 'pilihan-ganda';
}

// Built-in empty game structure
const PRESET_GAME_DATA: Record<string, GameItem[]> = {};

// Built-in Offline Local Question Generator (No Internet Needed)
export function generateOfflineGameItems(
  gameMode: string,
  surahOrTopic: string,
  gradeLevel: string = 'SD / MI',
  totalItems: number = 5,
  difficulty: 'Mudah' | 'Sedang' | 'Sulit' = 'Sedang',
  subjectName: string = 'Al-Qur\'an Hadits'
): GameItem[] {
  const topic = (surahOrTopic || 'Latihan').trim();
  const lowerSub = (subjectName || '').toLowerCase();
  const isIslamic =
    lowerSub.includes('pai') ||
    lowerSub.includes('agama') ||
    lowerSub.includes('qur') ||
    lowerSub.includes('tahfizh') ||
    lowerSub.includes('tahfidz') ||
    lowerSub.includes('hadits') ||
    lowerSub.includes('fiqih') ||
    lowerSub.includes('ski') ||
    lowerSub.includes('akidah') ||
    lowerSub.includes('arab');

  const result: GameItem[] = [];

  const angles = [
    {
      theme: 'Konsep & Definisi',
      qIslamic: (n: number) => `Soal #${n} (${difficulty}): Dalam mempelajari materi "${topic}" pada mata pelajaran ${subjectName} (${gradeLevel}), apakah pokok ajaran dan pengertian yang paling mendasar?`,
      aIslamic: `Memahami dan mengamalkan ajaran ${topic} secara ikhlas sesuai syariat`,
      distIslamic: [
        `Mengabaikan prinsip utama materi ${topic} demi kepentingan pribadi`,
        `Mengubah tata cara dan kaidah ${topic} tanpa dasar ilmu`,
        `Menganggap materi ${topic} tidak perlu dipraktikkan dalam ibadah`,
      ],
      explIslamic: `Inti pokok materi ${topic} adalah pemahaman yang benar dan keikhlasan dalam beramal.`,
      qGeneral: (n: number) => `Soal #${n} (${difficulty}): Berdasarkan pembelajaran materi "${topic}" pada mata pelajaran ${subjectName} (${gradeLevel}), manakah pernyataan yang paling tepat menjelaskan konsep intinya?`,
      aGeneral: `Prinsip dasar materi ${topic} dipahami secara sistematis dan diterapkan sesuai kaidah keilmuan`,
      distGeneral: [
        `Pernyataan yang bertentangan dengan konsep ilmiah materi ${topic}`,
        `Asumsi perkiraan yang belum teruji kebenarannya dalam konteks ${topic}`,
        `Penerapan konsep umum yang tidak berhubungan langsung dengan ${topic}`,
      ],
      explGeneral: `Konsep pokok ${topic} dibangun di atas kaidah yang sistematis dan teruji.`,
    },
    {
      theme: 'Ciri & Ketentuan Pokok',
      qIslamic: (n: number) => `Soal #${n} (${difficulty}): Ciri orang yang memahami dan mengamalkan materi "${topic}" dengan baik dalam kehidupan sehari-hari adalah...`,
      aIslamic: `Senantiasa bertakwa, berakhlak mulia, dan istiqamah menjalankan ketentuan ${topic}`,
      distIslamic: [
        `Hanya menjalankan ${topic} saat dilihat oleh orang lain (riya)`,
        `Merasa paling benar sendiri dan merendahkan orang lain`,
        `Melalaikan kewajiban lain demi alasan yang tidak syar'i`,
      ],
      explIslamic: `Pengamalan materi ${topic} terwujud dalam akhlak mulia dan keistiqamahan.`,
      qGeneral: (n: number) => `Soal #${n} (${difficulty}): Karakteristik atau ciri utama materi "${topic}" pada ${subjectName} (${gradeLevel}) yang membedakannya adalah...`,
      aGeneral: `Memiliki kaidah yang terukur dan komponen yang saling berkaitan secara konsisten`,
      distGeneral: [
        `Tidak memiliki landasan teori yang jelas dan berubah secara acak`,
        `Hanya berlaku pada satu kondisi khusus tanpa konsistensi konsep`,
        `Menyimpang dari tujuan utama pembelajaran kurikulum ${subjectName}`,
      ],
      explGeneral: `Karakteristik materi ${topic} ditandai oleh konsistensi kaidah dan komponennya.`,
    },
    {
      theme: 'Penerapan Praktis',
      qIslamic: (n: number) => `Soal #${n} (${difficulty}): Langkah konkret dalam menerapkan nilai-nilai materi "${topic}" di lingkungan sekolah dan masyarakat adalah...`,
      aIslamic: `Menebarkan kedamaian, saling tolong-menolong, dan menjaga kejujuran sesuai ajaran ${topic}`,
      distIslamic: [
        `Membiarkan kemungkaran dan bersikap acuh tak acuh`,
        `Mengutamakan perselisihan dibanding musyawarah`,
        `Mencari keuntungan pribadi yang merugikan orang banyak`,
      ],
      explIslamic: `Penerapan praktis ${topic} menghasilkan kedamaian dan kebaikan bersama.`,
      qGeneral: (n: number) => `Soal #${n} (${difficulty}): Dalam menyelesaikan persoalan terkait materi "${topic}" pada ${subjectName}, langkah terbaik yang harus dilakukan adalah...`,
      aGeneral: `Menganalisis data permasalahan secara cermat berdasarkan metode dan konsep ${topic}`,
      distGeneral: [
        `Menyimpulkan secara tergesa-gesa tanpa melihat data fakta`,
        `Mengabaikan komponen penting yang mempengaruhi hasil`,
        `Mengganti rumus baku dengan asumsi yang belum terbukti`,
      ],
      explGeneral: `Penyelesaian masalah ${topic} membutuhkan analisis cermat berbasis metode ilmiah.`,
    },
    {
      theme: 'Manfaat & Hikmah',
      qIslamic: (n: number) => `Soal #${n} (${difficulty}): Hikmah terbesar yang dapat dipetik dari penguasaan materi "${topic}" adalah...`,
      aIslamic: `Mendekatkan diri kepada Allah SWT serta mempererat tali persaudaraan sesama`,
      distIslamic: [
        `Mendapatkan pujian dari sesama manusia semata`,
        `Menumbuhkan rasa bangga dan takabur atas ilmu yang dimiliki`,
        `Menjadikan ilmu sebagai alat untuk menjatuhkan pihak lain`,
      ],
      explIslamic: `Hikmah mempelajari ${topic} adalah mendekatkan diri kepada Allah dan memperkuat ukhuwah.`,
      qGeneral: (n: number) => `Soal #${n} (${difficulty}): Manfaat utama penguasaan materi "${topic}" bagi peserta didik adalah...`,
      aGeneral: `Melatih daya nalar kritis, logis, dan solutif dalam menghadapi berbagai permasalahan`,
      distGeneral: [
        `Membatasi kemampuan berpikir hanya pada hafalan tanpa pemahaman`,
        `Menghambat eksplorasi ide dalam menyelesaikan soal`,
        `Menghasilkan kesimpulan yang tidak dapat dipertanggungjawabkan`,
      ],
      explGeneral: `Penguasaan ${topic} mengasah keterampilan berpikir analitis dan pemecahan masalah.`,
    },
    {
      theme: 'Evaluasi & Kesimpulan',
      qIslamic: (n: number) => `Soal #${n} (${difficulty}): Bukti nyata keberhasilan seseorang dalam mempelajari materi "${topic}" tercermin dari...`,
      aIslamic: `Kesesuaian antara ucapan, keyakinan hati, dan tindakan nyata yang bermanfaat`,
      distIslamic: [
        `Banyaknya teori yang dihafal tanpa ada pengamalan nyata`,
        `Kemampuan berdebat untuk memenangkan pendapat pribadi`,
        `Sikap meremehkan nasihat kebaikan dari sesama`,
      ],
      explIslamic: `Indikator pemahaman ${topic} adalah integritas antara hati, lisan, dan perbuatan.`,
      qGeneral: (n: number) => `Soal #${n} (${difficulty}): Evaluasi akhir terhadap ketercapaian pemahaman materi "${topic}" ditunjukkan oleh...`,
      aGeneral: `Kemampuan menjelaskan kembali prinsip inti serta memecahkan soal analisis dengan tepat`,
      distGeneral: [
        `Ketidakmampuan menghubungkan teori dengan penerapan praktis`,
        `Hanya menghafal istilah tanpa memahami mekanisme kerjanya`,
        `Kerap melakukan kesalahan mendasar pada konsep kunci materi ${topic}`,
      ],
      explGeneral: `Ketercapaian materi ${topic} dibuktikan oleh pemahaman konsep mendalam dan kemampuan aplikatif.`,
    },
  ];

  for (let i = 0; i < totalItems; i++) {
    const itemId = `offline-${gameMode}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${i}`;
    const num = i + 1;
    const angle = angles[i % angles.length];

    if (gameMode === 'sambung-ayat') {
      const correct = isIslamic ? `اللَّهُ الصَّمَدُ` : `adalah prinsip dasar yang harus dipahami secara tepat`;
      const distractors = isIslamic
        ? [`لَمْ يَلِدْ وَلَمْ يُولَدْ`, `وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ`, `مِنْ شَرِّ مَا خَلَقَ`]
        : [`adalah pernyataan yang bertentangan dengan ${topic}`, `tidak memiliki kaitan dengan materi ${topic}`, `merupakan asumsi yang keliru`];
      const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

      result.push({
        id: itemId,
        category: 'sambung-ayat',
        difficulty: difficulty,
        prompt_text: isIslamic
          ? `Lanjutkan potongan ayat/kalimat berikut terkait materi "${topic}" (Soal #${num}):`
          : `Lanjutkan sambungan potongan kalimat materi "${topic}" (Soal #${num}):`,
        arabic_text: isIslamic ? `قُلْ هُوَ اللَّهُ أَحَدٌ` : undefined,
        translation: isIslamic ? `Katakanlah: Dialah Allah, Yang Maha Esa.` : undefined,
        options: allOpts,
        correct_answer: correct,
        explanation: `Lanjutan kalimat yang benar sesuai materi "${topic}".`,
        subject_name: subjectName,
      });
    } else if (gameMode === 'melengkapi-ayat') {
      const correct = isIslamic ? `نَسْتَعِينُ` : `Konsep Pokok`;
      const distractors = isIslamic
        ? [`الرَّحْمَٰنِ`, `الْمُسْتَقِيمَ`, `الصِّرَاطَ`]
        : [`Pengecoh Konsep A`, `Pengecoh Konsep B`, `Pengecoh Konsep C`];
      const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

      result.push({
        id: itemId,
        category: 'melengkapi-ayat',
        difficulty: difficulty,
        prompt_text: isIslamic
          ? `Lengkapi kata/lafaz rumpang (...) dalam materi "${topic}" (Soal #${num}):`
          : `Lengkapi istilah rumpang "___" dalam pernyataan materi "${topic}" (Soal #${num}):`,
        arabic_text: isIslamic ? `إِيَّاكَ نَعْبُدُ وَإِيَّاكَ (...)` : undefined,
        translation: isIslamic ? `Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami memohon pertolongan.` : undefined,
        options: allOpts,
        correct_answer: correct,
        explanation: `Istilah yang tepat untuk melengkapi materi "${topic}".`,
        subject_name: subjectName,
      });
    } else if (gameMode === 'tebak-surat') {
      const correct = isIslamic ? `Surat Al-Falaq` : `${topic}`;
      const distractors = isIslamic
        ? [`Surat Al-Ikhlas`, `Surat An-Nas`, `Surat Al-Kautsar`]
        : [`Pengecoh Topik A`, `Pengecoh Topik B`, `Pengecoh Topik C`];
      const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

      result.push({
        id: itemId,
        category: 'tebak-surat',
        difficulty: difficulty,
        prompt_text: isIslamic
          ? `Tentukan nama surat dari potongan bacaan materi "${topic}" (Soal #${num}):`
          : `Tentukan konsep/istilah utama dari pembahasan materi "${topic}" (Soal #${num}):`,
        arabic_text: isIslamic ? `قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ` : undefined,
        translation: isIslamic ? `Katakanlah: Aku berlindung kepada Tuhan yang menguasai subuh.` : undefined,
        options: allOpts,
        correct_answer: correct,
        explanation: `Identifikasi topik/surat yang benar sesuai materi "${topic}".`,
        subject_name: subjectName,
      });
    } else if (gameMode === 'tebak-nomor-ayat') {
      const correct = `Ayat ${((i % 5) + 1)}`;
      const distractors = [`Ayat ${((i % 5) + 2)}`, `Ayat ${((i % 5) + 3)}`, `Ayat ${((i % 5) + 4)}`];
      const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

      result.push({
        id: itemId,
        category: 'tebak-nomor-ayat',
        difficulty: difficulty,
        prompt_text: isIslamic
          ? `Ayat ke berapakah lafaz berikut dalam materi "${topic}" (Soal #${num}):`
          : `Urutan ke berapakah prinsip/langkah materi "${topic}" (Soal #${num}):`,
        arabic_text: isIslamic ? `مِنْ شَرِّ مَا خَلَقَ` : undefined,
        options: allOpts,
        correct_answer: correct,
        explanation: `Urutan yang tepat sesuai susunan materi "${topic}".`,
        subject_name: subjectName,
      });
    } else if (gameMode === 'tebak-audio') {
      const correct = isIslamic ? `Surat Al-Falaq` : `${topic}`;
      const distractors = isIslamic
        ? [`Surat An-Nas`, `Surat Al-Ikhlas`, `Surat Al-Lahab`]
        : [`Topik Pengecoh X`, `Topik Pengecoh Y`, `Topik Pengecoh Z`];
      const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

      result.push({
        id: itemId,
        category: 'tebak-audio',
        difficulty: difficulty,
        surah_number: isIslamic ? 113 : undefined,
        ayah_number: isIslamic ? 1 : undefined,
        prompt_text: isIslamic
          ? `Dengarkan audio bacaan berikut dan tentukan surat yang dibacakan (${topic} - Soal #${num}):`
          : `Dengarkan narasi audio berikut dan tentukan konsep yang benar (${topic} - Soal #${num}):`,
        arabic_text: isIslamic ? `قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ` : undefined,
        translation: isIslamic ? `Katakanlah: Aku berlindung kepada Tuhan yang menguasai subuh.` : undefined,
        options: allOpts,
        correct_answer: correct,
        explanation: `Audio membacakan konten seputar materi "${topic}".`,
        subject_name: subjectName,
      });
    } else if (gameMode === 'puzzle-ayat') {
      const pieces = isIslamic
        ? ['بِرَبِّ', 'أَعُوذُ', 'قُلْ', 'الْفَلَقِ']
        : ['Memahami', 'materi', topic, 'dengan', 'benar'];
      const order = isIslamic
        ? ['قُلْ', 'أَعُوذُ', 'بِرَبِّ', 'الْفَلَقِ']
        : ['Memahami', 'materi', topic, 'dengan', 'benar'];
      const correctStr = isIslamic ? 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ' : `Memahami materi ${topic} dengan benar`;

      result.push({
        id: itemId,
        category: 'puzzle-ayat',
        difficulty: difficulty,
        prompt_text: `Susunlah kata-kata acak berikut menjadi kalimat yang benar seputar "${topic}" (Soal #${num}):`,
        puzzle_pieces: pieces,
        correct_order: order,
        options: [correctStr, 'Susunan Pengecoh A', 'Susunan Pengecoh B', 'Susunan Pengecoh C'].sort(() => Math.random() - 0.5),
        correct_answer: correctStr,
        explanation: `Urutan kalimat yang benar adalah: ${correctStr}.`,
        subject_name: subjectName,
      });
    } else if (gameMode === 'memory-card') {
      result.push({
        id: itemId,
        category: 'memory-card',
        difficulty: difficulty,
        prompt_text: isIslamic ? `قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ` : `Konsep: ${topic} #${num}`,
        translation: isIslamic ? `Aku berlindung kepada Tuhan yang menguasai subuh` : `Kaidah & pembahasan utama materi ${topic} #${num}`,
        options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
        correct_answer: isIslamic ? `Aku berlindung kepada Tuhan yang menguasai subuh` : `Kaidah & pembahasan utama materi ${topic} #${num}`,
        explanation: `Pasangan kartu memori yang sesuai untuk materi "${topic}".`,
        subject_name: subjectName,
      });
    } else {
      // pilihan-ganda & ular-tangga-islami
      const qText = isIslamic ? angle.qIslamic(num) : angle.qGeneral(num);
      const correctAns = isIslamic ? angle.aIslamic : angle.aGeneral;
      const rawDist = isIslamic ? angle.distIslamic : angle.distGeneral;
      const expl = isIslamic ? angle.explIslamic : angle.explGeneral;
      const allOpts = [correctAns, ...rawDist].sort(() => Math.random() - 0.5);

      result.push({
        id: itemId,
        category: gameMode as any,
        difficulty: difficulty,
        prompt_text: qText,
        options: allOpts,
        correct_answer: correctAns,
        explanation: expl,
        subject_name: subjectName,
      });
    }
  }

  return result;
}

// Convert QuestionBank from Bank Soal to GameItem[]
export function getGameItemsFromBankSoal(subjectName: string, mode: string, banks?: QuestionBank[]): GameItem[] {
  if (!banks || banks.length === 0) return [];

  const matchingBanks = banks.filter(
    (b) => b.subject && b.subject.trim().toLowerCase() === subjectName.trim().toLowerCase()
  );
  if (matchingBanks.length === 0) return [];

  const items: GameItem[] = [];
  matchingBanks.forEach((bank) => {
    (bank.questions || []).forEach((q, idx) => {
      const optionsTexts = (q.options || []).map((o) => o.option_text);
      const correctText = (q.options || []).find((o) => o.is_correct)?.option_text || optionsTexts[0] || '';

      items.push({
        id: `bank-${bank.id}-${q.id || idx}`,
        category: mode,
        difficulty: 'Sedang',
        prompt_text: q.question_text,
        options: optionsTexts,
        correct_answer: correctText,
        explanation: q.explanation || `Soal dari Bank Soal (${bank.title})`,
        subject_name: subjectName,
      });
    });
  });

  return items;
}

export const isArabicText = (text?: string): boolean => {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
};

interface AiGameGeneratorViewProps {
  currentUser?: AuthUser | null;
  subjects?: Subject[];
  banks?: QuestionBank[];
  setBanks?: React.Dispatch<React.SetStateAction<QuestionBank[]>>;
  onSaveGameLog?: (log: GameHistoryLog) => void;
  gameData?: Record<string, any>;
  onUpdateGameData?: (data: Record<string, any>) => void;
}

export const AiGameGeneratorView: React.FC<AiGameGeneratorViewProps> = ({
  currentUser,
  subjects = [],
  banks = [],
  setBanks,
  onSaveGameLog,
  gameData,
  onUpdateGameData,
}) => {
  const isStudentOrUmum = currentUser?.role === 'siswa' || currentUser?.role === 'umum';
  const [activeMode, setActiveMode] = useState<GameMode>('pilihan-ganda');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // AI Generator Form
  const [topicInput, setTopicInput] = useState('');
  const [gradeLevel, setGradeLevel] = useState('SD / MI');
  const [itemCountText, setItemCountText] = useState('5');
  const [difficulty, setDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit'>('Sedang');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const isIslamicSubject = useMemo(() => {
    if (!selectedSubject) return true;
    const lower = selectedSubject.toLowerCase();
    return (
      lower.includes('pai') ||
      lower.includes('agama') ||
      lower.includes('qur') ||
      lower.includes('tahfizh') ||
      lower.includes('tahfidz') ||
      lower.includes('hadits') ||
      lower.includes('hadis') ||
      lower.includes('fiqih') ||
      lower.includes('fiqh') ||
      lower.includes('ski') ||
      lower.includes('akidah') ||
      lower.includes('aqidah') ||
      lower.includes('arab')
    );
  }, [selectedSubject]);
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<'Semua' | 'Mudah' | 'Sedang' | 'Sulit'>('Mudah');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastGenMessage, setLastGenMessage] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetSubject, setResetTargetSubject] = useState<string>('Semua');
  const [resetTargetDifficulty, setResetTargetDifficulty] = useState<'Semua' | 'Mudah' | 'Sedang' | 'Sulit'>('Semua');
  const [resetTargetModeScope, setResetTargetModeScope] = useState<'all' | 'current'>('all');

  // Edit Question Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<GameItem | null>(null);

  // Add Manual Question Modal State
  const [isAddManualModalOpen, setIsAddManualModalOpen] = useState(false);
  const [manualInputMode, setManualInputMode] = useState<'form' | 'paste'>('paste');
  const [manualPastedDocText, setManualPastedDocText] = useState('');
  const [manualPromptText, setManualPromptText] = useState('');
  const [manualArabicText, setManualArabicText] = useState('');
  const [manualOptions, setManualOptions] = useState<string[]>(['', '', '', '']);
  const [manualCorrectAnswer, setManualCorrectAnswer] = useState('');
  const [manualExplanation, setManualExplanation] = useState('');
  const [manualDifficulty, setManualDifficulty] = useState<'Mudah' | 'Sedang' | 'Sulit'>('Sedang');

  // Game Data Map for modes
  const [gameDataMap, setGameDataMap] = useState<Record<string, GameItem[]>>(() => {
    try {
      const saved = localStorage.getItem('cbt_game_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    return {
      'pilihan-ganda': [],
      'sambung-ayat': [],
      'melengkapi-ayat': [],
      'tebak-surat': [],
      'tebak-nomor-ayat': [],
      'tebak-audio': [],
      'puzzle-ayat': [],
      'memory-card': [],
      'ular-tangga-islami': [],
    };
  });

  const subjectOptions = useMemo(() => {
    const list: string[] = [];

    // Ambil MURNI dari daftar terdaftar di menu Kelola Mata Pelajaran (props/storage)
    const masterSubjects = (subjects && subjects.length > 0) ? subjects : getStoredSubjects();
    if (masterSubjects && masterSubjects.length > 0) {
      masterSubjects.forEach((s) => {
        if (s.name && s.name.trim() && !list.includes(s.name.trim())) {
          list.push(s.name.trim());
        }
      });
    }

    return list;
  }, [subjects]);

  // Jaga agar pilihan mata pelajaran selalu valid dan sinkron
  useEffect(() => {
    if (subjectOptions.length > 0) {
      if (!selectedSubject || !subjectOptions.includes(selectedSubject)) {
        setSelectedSubject(subjectOptions[0]);
      }
    } else {
      setSelectedSubject('');
    }
  }, [subjectOptions, selectedSubject]);

  // Sync gameDataMap from incoming gameData prop when updated remotely
  useEffect(() => {
    if (gameData && typeof gameData === 'object' && Object.keys(gameData).length > 0) {
      setGameDataMap((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(gameData)) return prev;
        return gameData as Record<string, GameItem[]>;
      });
      const activeList = (gameData[activeMode] || []).filter(
        (it: GameItem) => (it.subject_name || selectedSubject) === selectedSubject
      );
      if (activeList.length > 0) {
        setGameItems(activeList);
      }
    }
  }, [gameData, activeMode, selectedSubject]);

  // Active Game State
  const [gameItems, setGameItems] = useState<GameItem[]>(() => {
    try {
      const saved = localStorage.getItem('cbt_game_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed['pilihan-ganda'])) {
          return parsed['pilihan-ganda'];
        }
      }
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Active filtered game items based on selected difficulty filter
  const activePlayItems = useMemo(() => {
    if (selectedDifficultyFilter === 'Semua') {
      return gameItems;
    }
    return gameItems.filter((item) => (item.difficulty || 'Sedang') === selectedDifficultyFilter);
  }, [gameItems, selectedDifficultyFilter]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const maxLives = activeMode === 'memory-card' ? 10 : 3;
  const [lives, setLives] = useState(activeMode === 'memory-card' ? 10 : 3);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const hasLoggedGameRef = useRef(false);

  // Puzzle Ayat state
  const [puzzleSelected, setPuzzleSelected] = useState<string[]>([]);

  // Memory Card state
  const [cards, setCards] = useState<{ id: string; content: string; type: 'arabic' | 'translation'; matchId: string; flipped: boolean; matched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);

  // Ular Tangga State
  const [playerPos, setPlayerPos] = useState(1);
  const [boardPrevPos, setBoardPrevPos] = useState(1);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [currentBoardEvent, setCurrentBoardEvent] = useState<string | null>(null);
  const [boardQuestionModalOpen, setBoardQuestionModalOpen] = useState(false);
  const [currentBoardQuestion, setCurrentBoardQuestion] = useState<GameItem | null>(null);
  const [boardModalSelected, setBoardModalSelected] = useState<string | null>(null);
  const [boardModalIsCorrect, setBoardModalIsCorrect] = useState<boolean | null>(null);

  // Listening / Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [selectedQari, setSelectedQari] = useState<string>('alafasy');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [audioSourceType, setAudioSourceType] = useState<'qari_mp3' | 'tts_indonesia' | 'tts_arabic'>('qari_mp3');
  const [audioProgress, setAudioProgress] = useState<{ current: number; duration: number }>({ current: 0, duration: 0 });
  const [showTranslationHint, setShowTranslationHint] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopVerseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setIsPlayingAudio(false);
    setAudioLoading(false);
    setAudioProgress({ current: 0, duration: 0 });
  };

  const seekAudio = (targetSec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = targetSec;
      setAudioProgress((prev) => ({ ...prev, current: targetSec }));
    }
  };

  const playVerseAudio = (overrideText?: string, forceTTS = false) => {
    stopVerseAudio();
    const item = activePlayItems[currentIdx];
    if (!item) return;

    // Try authentic Qari MP3 recitation first if not forced TTS / not tts_indonesia
    if (!forceTTS && selectedQari !== 'tts_indonesia') {
      const mp3Url = resolveQuranAudioUrl(item, selectedQari);
      if (mp3Url) {
        setAudioLoading(true);
        setAudioSourceType('qari_mp3');

        const audio = new Audio(mp3Url);
        audio.playbackRate = playbackSpeed;
        audioRef.current = audio;

        audio.oncanplay = () => {
          setAudioLoading(false);
        };

        audio.onplay = () => {
          setIsPlayingAudio(true);
          setAudioLoading(false);
        };

        audio.ontimeupdate = () => {
          if (audio.duration && !isNaN(audio.duration)) {
            setAudioProgress({
              current: Math.floor(audio.currentTime),
              duration: Math.floor(audio.duration),
            });
          }
        };

        audio.onended = () => {
          setIsPlayingAudio(false);
          setAudioProgress({ current: 0, duration: 0 });
          audioRef.current = null;
        };

        audio.onerror = () => {
          console.warn('Qari MP3 failed to load, switching smoothly to TTS');
          setAudioLoading(false);
          audioRef.current = null;
          playTtsText(overrideText || item.audio_text || item.arabic_text || item.prompt_text);
        };

        audio.play().catch((err) => {
          console.warn('Playback blocked/error, switching to TTS:', err);
          setAudioLoading(false);
          audioRef.current = null;
          playTtsText(overrideText || item.audio_text || item.arabic_text || item.prompt_text);
        });

        return;
      }
    }

    // TTS Fallback or direct TTS request
    const textToPlay = overrideText || item.audio_text || item.arabic_text || item.prompt_text;
    playTtsText(textToPlay);
  };

  const playTtsText = (text?: string, targetLang?: string, customRate?: number, customPitch?: number) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const hasArabic = isArabicText(text);
      const isId = targetLang === 'id-ID' || (!hasArabic && targetLang !== 'ar-SA');

      setAudioSourceType(isId ? 'tts_indonesia' : 'tts_arabic');
      const utterance = new SpeechSynthesisUtterance(text);

      if (isId) {
        utterance.lang = 'id-ID';
        const indoVoice = getBestIndonesianVoice();
        if (indoVoice) utterance.voice = indoVoice;
        utterance.rate = customRate || 0.88 * playbackSpeed;
        utterance.pitch = customPitch || 1.06; // Soft gentle female/natural tone
      } else {
        utterance.lang = 'ar-SA';
        const voices = window.speechSynthesis.getVoices();
        const arVoice = voices.find((v) => v.lang.toLowerCase().includes('ar'));
        if (arVoice) utterance.voice = arVoice;
        utterance.rate = customRate || 0.82 * playbackSpeed;
        utterance.pitch = customPitch || 0.96;
      }

      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('TTS audio error:', e);
      setIsPlayingAudio(false);
    }
  };

  const playPromptAudio = () => {
    const item = activePlayItems[currentIdx];
    if (item && item.prompt_text) {
      stopVerseAudio();
      playTtsText(item.prompt_text, 'id-ID', 0.88 * playbackSpeed, 1.06);
    }
  };

  const playTranslationAudio = () => {
    const item = activePlayItems[currentIdx];
    if (item && item.translation) {
      stopVerseAudio();
      playTtsText(item.translation, 'id-ID', 0.88 * playbackSpeed, 1.06);
    }
  };

  // Reset audio & hint on question or mode or Qari change
  useEffect(() => {
    setShowTranslationHint(false);
    stopVerseAudio();
    if (activeMode === 'tebak-audio' && activePlayItems[currentIdx] && soundEnabled) {
      const timer = setTimeout(() => {
        playVerseAudio();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, activeMode, selectedQari, activePlayItems, soundEnabled]);

  const handleSyncToBankSoal = () => {
    if (!gameItems || gameItems.length === 0) {
      alert('Tidak ada soal game yang tersedia untuk disinkronkan.');
      return;
    }

    const convertedQuestions: Question[] = gameItems.map((item, idx) => {
      const opts = item.options || ['A', 'B', 'C', 'D'];
      const correctAns = item.correct_answer || opts[0];

      return {
        id: item.id || `gq-${Date.now()}-${idx}`,
        question_number: idx + 1,
        question_text: item.prompt_text + (item.arabic_text ? `\n${item.arabic_text}` : ''),
        options: opts.map((optText, oIdx) => {
          const letter = String.fromCharCode(65 + oIdx);
          return {
            option_letter: letter,
            option_text: optText,
            is_correct: optText === correctAns || letter === correctAns,
          };
        }),
        explanation: item.explanation || `Kunci jawaban: ${correctAns}`,
      };
    });

    const activeTabLabel = menuList.find((m) => m.id === activeMode)?.label || activeMode;

    const newBank: QuestionBank = {
      id: `bank-game-${Date.now()}`,
      title: `Bank Soal Game (${activeTabLabel}) - ${selectedSubject}`,
      teacher_name: currentUser?.name || 'Guru CBT',
      subject: selectedSubject,
      grade_level: gradeLevel,
      class_room: 'Semua Kelas',
      total_questions: convertedQuestions.length,
      token: Math.random().toString(36).substring(2, 8).toUpperCase(),
      questions: convertedQuestions,
      createdAt: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      durationMinutes: 30,
    };

    if (setBanks) {
      setBanks((prev) => [newBank, ...prev]);
      alert(`✅ Berhasil Sinkronisasi! ${convertedQuestions.length} soal game telah disimpan ke Bank Soal Mata Pelajaran "${selectedSubject}". Token Ujian CBT: ${newBank.token}`);
    } else {
      alert(`✅ ${convertedQuestions.length} Soal telah diproses untuk Mata Pelajaran "${selectedSubject}".`);
    }
  };

  // Helper to fetch question for Ular Tangga tile
  const getQuestionForTile = (tileNum: number): GameItem => {
    let items = gameDataMap['ular-tangga-islami'] || [];
    if (!items || items.length === 0) {
      items = gameDataMap['pilihan-ganda'] || [];
    }

    if (items && items.length > 0) {
      const qIndex = (tileNum - 1) % items.length;
      return items[qIndex];
    }

    return {
      id: `tile-${tileNum}`,
      prompt_text: `Soal Kotak #${tileNum}: Pertanyaan Ular Tangga`,
      options: ['Pilihan Jawaban A', 'Pilihan Jawaban B', 'Pilihan Jawaban C', 'Pilihan Jawaban D'],
      correct_answer: 'Pilihan Jawaban A',
      explanation: 'Penjelasan soal Ular Tangga.',
    };
  };

  // Export State
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Voice Speech Synthesis (Indonesian)
  const speakFeedback = (isCorrect: boolean) => {
    if (!soundEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = isCorrect
        ? 'Alhamdulillah jawaban anda benar'
        : 'Maaf jawaban anda salah, silahkan coba lagi';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  };

  // Shuffle current active game items & options
  const handleShuffleCurrentGame = () => {
    const shuffledMap = shuffleGameDataMap(gameDataMap);
    try {
      localStorage.setItem('cbt_game_data', JSON.stringify(shuffledMap));
    } catch (e) {}
    setGameDataMap(shuffledMap);
    onUpdateGameData?.(shuffledMap);
    const current = shuffledMap[activeMode] || [];
    setGameItems(current);
    if (activeMode === 'memory-card') {
      initMemoryCards(current);
    }
    resetGameStates();
  };

  // Sound Synth Generator (Web Audio API)
  const playSound = (type: 'correct' | 'wrong' | 'dice' | 'win') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'wrong') {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'dice') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(450, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'win') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      // Audio not permitted or supported
    }
  };

  // Open Reset Confirmation Modal with pre-selected subject & difficulty level
  const handleResetGame = () => {
    setResetTargetSubject(selectedSubject);
    setResetTargetDifficulty(selectedDifficultyFilter);
    setResetTargetModeScope('all');
    setShowResetModal(true);
  };

  // Calculate matching questions count for deletion preview
  const matchingQuestionCount = useMemo(() => {
    let count = 0;
    const modesToCheck =
      resetTargetModeScope === 'current'
        ? [activeMode]
        : Object.keys(gameDataMap);

    for (const modeKey of modesToCheck) {
      const list = gameDataMap[modeKey] || [];
      for (const item of list) {
        const itemSubject = item.subject_name || selectedSubject;
        const itemDiff = item.difficulty || 'Sedang';

        const matchSubject =
          resetTargetSubject === 'Semua' || itemSubject === resetTargetSubject;
        const matchDiff =
          resetTargetDifficulty === 'Semua' || itemDiff === resetTargetDifficulty;

        if (matchSubject && matchDiff) {
          count++;
        }
      }
    }
    return count;
  }, [gameDataMap, resetTargetSubject, resetTargetDifficulty, resetTargetModeScope, activeMode, selectedSubject]);

  // Scoped Reset: Deletes questions matching selected subject & difficulty level
  const executeResetGame = () => {
    const nextMap: Record<string, GameItem[]> = {};

    for (const modeKey of Object.keys(gameDataMap)) {
      if (resetTargetModeScope === 'current' && modeKey !== activeMode) {
        nextMap[modeKey] = gameDataMap[modeKey] || [];
        continue;
      }

      const list = gameDataMap[modeKey] || [];
      nextMap[modeKey] = list.filter((item) => {
        const itemSubject = item.subject_name || selectedSubject;
        const itemDiff = item.difficulty || 'Sedang';

        const matchSubject =
          resetTargetSubject === 'Semua' || itemSubject === resetTargetSubject;
        const matchDiff =
          resetTargetDifficulty === 'Semua' || itemDiff === resetTargetDifficulty;

        // Delete only items matching both selected subject & level
        if (matchSubject && matchDiff) {
          return false;
        }
        return true;
      });
    }

    try {
      localStorage.setItem('cbt_game_data', JSON.stringify(nextMap));
    } catch (e) {}
    setGameDataMap(nextMap);
    onUpdateGameData?.(nextMap);

    const updatedActiveItems = (nextMap[activeMode] || []).filter(
      (it) => (it.subject_name || selectedSubject) === selectedSubject
    );
    setGameItems(updatedActiveItems);
    if (activeMode === 'memory-card') {
      initMemoryCards(updatedActiveItems);
    }

    resetGameStates();
    setShowResetModal(false);

    const diffText =
      resetTargetDifficulty === 'Semua' ? 'semua level' : `level "${resetTargetDifficulty}"`;
    const subjText =
      resetTargetSubject === 'Semua' ? 'semua mata pelajaran' : `mapel "${resetTargetSubject}"`;
    const modeText =
      resetTargetModeScope === 'current'
        ? `mode "${menuList.find((m) => m.id === activeMode)?.label}"`
        : 'semua mode game';

    setLastGenMessage(
      `🗑️ Soal game untuk ${subjText} ${diffText} (${modeText}) berhasil dihapus.`
    );
  };

  // Delete single active question
  const handleDeleteSingleQuestion = (questionId: string) => {
    const nextMap: Record<string, GameItem[]> = {};

    for (const modeKey of Object.keys(gameDataMap)) {
      const list = gameDataMap[modeKey] || [];
      nextMap[modeKey] = list.filter((item) => item.id !== questionId);
    }

    try {
      localStorage.setItem('cbt_game_data', JSON.stringify(nextMap));
    } catch (e) {}
    setGameDataMap(nextMap);
    onUpdateGameData?.(nextMap);

    const updatedActiveItems = (nextMap[activeMode] || []).filter(
      (it) => (it.subject_name || selectedSubject) === selectedSubject
    );
    setGameItems(updatedActiveItems);
    if (activeMode === 'memory-card') {
      initMemoryCards(updatedActiveItems);
    }

    resetGameStates();
    setLastGenMessage('🗑️ 1 Soal berhasil dihapus.');
  };

  // Open Edit Question Modal
  const handleOpenEditModal = (item: GameItem) => {
    // Ensure options array has at least 4 items for PG editing
    const opts = item.options && item.options.length > 0 ? [...item.options] : ['', '', '', ''];
    while (opts.length < 4) {
      opts.push('');
    }

    setEditingQuestion({
      ...item,
      options: opts,
      correct_answer: item.correct_answer || opts[0] || '',
      explanation: item.explanation || '',
      arabic_text: item.arabic_text || '',
      translation: item.translation || '',
    });
    setIsEditModalOpen(true);
  };

  // Save Edit Question changes
  const handleSaveEditQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    const updatedId = editingQuestion.id;

    // Filter out completely empty options
    const cleanOptions = (editingQuestion.options || []).map((o) => o.trim()).filter(Boolean);

    const finalQuestion: GameItem = {
      ...editingQuestion,
      prompt_text: editingQuestion.prompt_text.trim(),
      options: cleanOptions.length > 0 ? cleanOptions : editingQuestion.options,
      correct_answer: editingQuestion.correct_answer || cleanOptions[0] || '',
    };

    // 1. Update active gameItems list
    setGameItems((prev) => prev.map((item) => (item.id === updatedId ? finalQuestion : item)));

    // 2. Update gameDataMap in state and localStorage
    const nextMap: Record<string, GameItem[]> = {};

    for (const modeKey of Object.keys(gameDataMap)) {
      const list = gameDataMap[modeKey] || [];
      nextMap[modeKey] = list.map((it) => (it.id === updatedId ? finalQuestion : it));
    }

    try {
      localStorage.setItem('cbt_game_data', JSON.stringify(nextMap));
    } catch (err) {}
    setGameDataMap(nextMap);
    onUpdateGameData?.(nextMap);

    // 3. Update current board question if editing in Ular Tangga
    if (currentBoardQuestion && currentBoardQuestion.id === updatedId) {
      setCurrentBoardQuestion(finalQuestion);
    }

    setIsEditModalOpen(false);
    setEditingQuestion(null);
    setLastGenMessage('✏️ Soal dan Jawaban berhasil diperbarui!');
  };

  // Open Add Manual Question Modal
  const handleOpenAddManualModal = () => {
    setManualPastedDocText('');
    setManualInputMode('paste');
    setManualPromptText('');
    setManualArabicText('');
    setManualOptions(['', '', '', '']);
    setManualCorrectAnswer('');
    setManualExplanation('');
    setManualDifficulty(difficulty || 'Sedang');
    setIsAddManualModalOpen(true);
  };

  // Process Document Text (Paste Word) and Extract Questions to Game
  const handleProcessManualPasteText = () => {
    if (!manualPastedDocText.trim()) {
      alert('Harap tempel (paste) isi dokumen soal di dalam kotak terlebih dahulu!');
      return;
    }

    const parsed = parseRawDocumentText(manualPastedDocText);
    if (parsed.length === 0) {
      alert(
        'Tidak dapat membaca struktur soal. Pastikan format soal menggunakan nomor (1.), pilihan (A-D/E), dan kata kunci (Kunci: X atau Jawaban: X).'
      );
      return;
    }

    const newItems: GameItem[] = parsed.map((p, idx) => ({
      id: `game-ext-${Date.now()}-${idx}`,
      prompt_text: p.question,
      options: p.options.filter(Boolean),
      correct_answer: p.answer,
      explanation: p.explanation || undefined,
      difficulty: manualDifficulty,
      subject_name: selectedSubject,
      category: activeMode,
    }));

    const activeTabLabel = menuList.find((m) => m.id === activeMode)?.label || activeMode;
    applyNewGeneratedItems(
      newItems,
      `🚀 ${newItems.length} Soal dari Dokumen Word Berhasil Diekstrak & Ditambahkan ke Mode "${activeTabLabel}" (${selectedSubject})!`
    );
    setIsAddManualModalOpen(false);
  };

  // Save New Manual Question to Active Game & LocalStorage / State
  const handleSaveManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPromptText.trim()) {
      alert('Pertanyaan / Teks Soal wajib diisi!');
      return;
    }
    const cleanOpts = manualOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      alert('Minimal harus mengisi 2 pilihan jawaban!');
      return;
    }
    const chosenAnswer = manualCorrectAnswer.trim() || cleanOpts[0];
    if (!chosenAnswer) {
      alert('Silakan pilih salah satu opsi sebagai Kunci Jawaban!');
      return;
    }

    const newItem: GameItem = {
      id: `game-manual-${Date.now()}`,
      prompt_text: manualPromptText.trim(),
      arabic_text: manualArabicText.trim() || undefined,
      options: cleanOpts,
      correct_answer: chosenAnswer,
      explanation: manualExplanation.trim() || undefined,
      difficulty: manualDifficulty,
      subject_name: selectedSubject,
      category: activeMode,
    };

    const activeTabLabel = menuList.find((m) => m.id === activeMode)?.label || activeMode;
    applyNewGeneratedItems([newItem], `✍️ 1 Soal Manual Berhasil Ditambahkan ke Mode "${activeTabLabel}" (${selectedSubject})!`);
    setIsAddManualModalOpen(false);
  };

  // Load or generate questions tailored to a specific subject
  const loadQuestionsForSubject = (subj: string, mode: GameMode) => {
    // 1. Try questions from Bank Soal matching subj
    const bankItems = getGameItemsFromBankSoal(subj, mode, banks);
    if (bankItems && bankItems.length > 0) {
      setGameItems(bankItems);
      if (mode === 'memory-card') {
        initMemoryCards(bankItems);
      }
      resetGameStates();
      setLastGenMessage(`🎯 Soal dimuat dari Bank Soal Mata Pelajaran "${subj}" (${bankItems.length} Soal).`);
      return bankItems;
    }

    // 2. Try stored items in gameDataMap[mode] matching subj
    const stored = (gameDataMap[mode] || []).filter(
      (it) => it.subject_name === subj
    );
    if (stored && stored.length > 0) {
      setGameItems(stored);
      if (mode === 'memory-card') {
        initMemoryCards(stored);
      }
      resetGameStates();
      return stored;
    }

    // 3. No created questions found for this subject/mode: return empty array
    setGameItems([]);
    if (mode === 'memory-card') {
      initMemoryCards([]);
    }
    resetGameStates();
    return [];
  };

  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubject(newSubject);
    loadQuestionsForSubject(newSubject, activeMode);
  };

  // Switch mode handler
  const handleSwitchMode = (mode: GameMode) => {
    setActiveMode(mode);
    setGameFinished(false);
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setLives(mode === 'memory-card' ? 10 : 3);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setPuzzleSelected([]);
    setPlayerPos(1);
    setBoardPrevPos(1);
    setDiceRoll(null);
    setBoardQuestionModalOpen(false);
    setCurrentBoardQuestion(null);
    setBoardModalSelected(null);
    setBoardModalIsCorrect(null);

    loadQuestionsForSubject(selectedSubject, mode);
  };

  // Auto-load subject questions when selectedSubject or activeMode changes
  useEffect(() => {
    if (selectedSubject) {
      loadQuestionsForSubject(selectedSubject, activeMode);
    }
  }, [selectedSubject, activeMode]);

  // Memory Card Initialization
  const initMemoryCards = (items: GameItem[]) => {
    const list: { id: string; content: string; type: 'arabic' | 'translation'; matchId: string; flipped: boolean; matched: boolean }[] = [];
    items.forEach((item, index) => {
      const contentA = item.arabic_text || item.prompt_text || item.options?.[0] || `Soal #${index + 1}`;
      const contentB = item.translation || item.correct_answer || item.options?.[1] || `Jawaban #${index + 1}`;

      list.push({
        id: `card-a-${index}`,
        content: contentA,
        type: 'arabic',
        matchId: item.id,
        flipped: false,
        matched: false,
      });
      list.push({
        id: `card-b-${index}`,
        content: contentB,
        type: 'translation',
        matchId: item.id,
        flipped: false,
        matched: false,
      });
    });

    // Shuffle
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
  };

  // Auto-Save Game Log when game finishes
  useEffect(() => {
    if (gameFinished && !hasLoggedGameRef.current) {
      hasLoggedGameRef.current = true;
      if (onSaveGameLog) {
        const modeLabels: Record<string, string> = {
          'pilihan-ganda': 'Pilihan Ganda',
          'sambung-ayat': 'Sambung Ayat',
          'melengkapi-ayat': 'Melengkapi Ayat',
          'tebak-surat': 'Tebak Surat',
          'tebak-nomor-ayat': 'Tebak Nomor Ayat',
          'tebak-audio': 'Tebak Audio Ayat',
          'puzzle-ayat': 'Puzzle Susun Ayat',
          'memory-card': 'Memory Card Match',
          'ular-tangga-islami': 'Ular Tangga Islami',
        };

        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const studentClass = (currentUser?.details as any)?.classRoom || (currentUser?.role === 'guru' ? 'Guru' : currentUser?.role === 'admin' ? 'Admin' : 'Umum');

        const effectiveDifficulty = selectedDifficultyFilter !== 'Semua' 
          ? selectedDifficultyFilter 
          : (activePlayItems[0]?.difficulty || difficulty || 'Sedang');

        const newLog: GameHistoryLog = {
          id: `glog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: `${dateStr} ${timeStr}`,
          studentName: currentUser?.name || 'Siswa / Pengguna',
          classRoom: studentClass,
          gameType: modeLabels[activeMode] || activeMode,
          subject: selectedSubject || 'Umum / Agama Islam',
          difficulty: effectiveDifficulty,
          topic: topicInput || activeMode,
          score: score,
          correctCount: correctAnswersCount,
          totalQuestions: activePlayItems.length || 10,
        };

        onSaveGameLog(newLog);
      }
    }
    if (!gameFinished) {
      hasLoggedGameRef.current = false;
    }
  }, [gameFinished, activeMode, score, correctAnswersCount, selectedSubject, selectedDifficultyFilter, difficulty, topicInput, currentUser, activePlayItems, onSaveGameLog]);

  const applyNewGeneratedItems = (items: GameItem[], successMsg: string) => {
    const currentModeList = gameDataMap[activeMode] || [];

    // Set item baru dengan ID unik & atribut category/subject_name yang konsisten
    const exclusiveItems: GameItem[] = items.map((raw, idx) => ({
      ...raw,
      category: activeMode,
      difficulty: raw.difficulty || difficulty,
      id: `game-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
      subject_name: raw.subject_name || selectedSubject,
    }));

    // Akumulasikan soal baru tanpa menghapus soal lama
    const nextMap = {
      ...gameDataMap,
      [activeMode]: [...currentModeList, ...exclusiveItems],
    };

    try {
      localStorage.setItem('cbt_game_data', JSON.stringify(nextMap));
    } catch (e) {}
    setGameDataMap(nextMap);
    onUpdateGameData?.(nextMap);

    const updatedActiveItems = nextMap[activeMode].filter(
      (it) => it.subject_name === selectedSubject
    );
    setGameItems(updatedActiveItems);
    if (activeMode === 'memory-card') {
      initMemoryCards(updatedActiveItems);
    }

    resetGameStates();
    setLastGenMessage(successMsg);
  };

  // Generate AI / Offline Content with Category Isolation & Difficulty Parameter
  const handleGenerateAiGame = async (forceOffline = false) => {
    setIsGenerating(true);
    setAiError(null);
    setLastGenMessage(null);

    if (!selectedSubject || subjectOptions.length === 0) {
      setAiError('Belum ada Mata Pelajaran terdaftar. Silakan daftarkan Mata Pelajaran terlebih dahulu di menu "Kelola Mata Pelajaran".');
      setIsGenerating(false);
      return;
    }

    const activeTabLabel = menuList.find((m) => m.id === activeMode)?.label || activeMode;
    const requestedCount = parseInt(itemCountText, 10) || 5;
    const requestedTopic = topicInput || 'Surat-surat Pendek Juz 30';

    if (forceOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      const offlineItems = generateOfflineGameItems(
        activeMode,
        requestedTopic,
        gradeLevel,
        requestedCount,
        difficulty,
        selectedSubject
      );
      applyNewGeneratedItems(
        offlineItems,
        `⚡ ${offlineItems.length} Soal Berhasil Dibuat dari Database Built-in Offline untuk Mapel "${selectedSubject}" Mode "${activeTabLabel}" (Tingkat ${difficulty})`
      );
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: activeMode,
          surahOrTopic: requestedTopic,
          gradeLevel: gradeLevel,
          totalItems: requestedCount,
          difficulty: difficulty,
          subjectName: selectedSubject,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal terhubung ke AI Online');
      }

      if (data.data?.items && Array.isArray(data.data.items)) {
        const rawItems: GameItem[] = data.data.items.map((it: GameItem) => ({
          ...it,
          subject_name: it.subject_name || selectedSubject,
        }));
        applyNewGeneratedItems(
          rawItems,
          `✨ ${rawItems.length} Soal AI Gemini Berhasil Dihasilkan Khusus untuk Mapel "${selectedSubject}" Mode "${activeTabLabel}" (Tingkat ${difficulty})`
        );
      } else {
        throw new Error('Format respon AI tidak valid');
      }
    } catch (err: any) {
      console.warn('AI request fallback to local built-in offline database:', err);
      const fallbackItems = generateOfflineGameItems(
        activeMode,
        requestedTopic,
        gradeLevel,
        requestedCount,
        difficulty,
        selectedSubject
      );
      applyNewGeneratedItems(
        fallbackItems,
        `⚡ (Mode Offline Aktif - Database Built-in) ${fallbackItems.length} Soal disajikan untuk Mapel "${selectedSubject}" Mode "${activeTabLabel}" (Tingkat ${difficulty})`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const resetGameStates = () => {
    setCurrentIdx(0);
    setScore(0);
    setCorrectAnswersCount(0);
    setStreak(0);
    setLives(activeMode === 'memory-card' ? 10 : 3);
    setSelectedAnswer(null);
    setIsAnswerCorrect(null);
    setGameFinished(false);
    setPuzzleSelected([]);
    setPlayerPos(1);
    setBoardPrevPos(1);
    setDiceRoll(null);
    setBoardQuestionModalOpen(false);
    setCurrentBoardQuestion(null);
    setBoardModalSelected(null);
    setBoardModalIsCorrect(null);
    setCurrentBoardEvent(null);
    setFlippedCards([]);
    hasLoggedGameRef.current = false;
  };

  // Answer Choice Selection
  const handleAnswerClick = (option: string) => {
    if (selectedAnswer !== null) return; // Prevent double click

    const currentItem = activePlayItems[currentIdx];
    if (!currentItem) return;
    const isCorrect = option === currentItem.correct_answer;

    setSelectedAnswer(option);
    setIsAnswerCorrect(isCorrect);

    if (isCorrect) {
      playSound('correct');
      speakFeedback(true);
      const addScore = 10;
      setScore((prev) => prev + addScore);
      setCorrectAnswersCount((prev) => prev + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak >= 2 && nextStreak % 2 === 0) {
        setLives((prev) => Math.min(maxLives, prev + 1));
      }
    } else {
      playSound('wrong');
      speakFeedback(false);
      setStreak(0);
      setLives((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => {
            setGameFinished(true);
          }, 700);
        }
        return Math.max(0, next);
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < activePlayItems.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setPuzzleSelected([]);
    } else {
      setGameFinished(true);
      playSound('win');
    }
  };

  // Jump question for Teacher/Admin Review Mode (Maju / Mundur)
  const handleJumpQuestion = (targetIdx: number) => {
    if (targetIdx >= 0 && targetIdx < activePlayItems.length) {
      setCurrentIdx(targetIdx);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setPuzzleSelected([]);
    }
  };

  // Puzzle Word Toggle
  const handlePuzzleWordClick = (word: string) => {
    if (puzzleSelected.includes(word)) {
      setPuzzleSelected(puzzleSelected.filter((w) => w !== word));
    } else {
      setPuzzleSelected([...puzzleSelected, word]);
    }
  };

  const handleCheckPuzzle = () => {
    const currentItem = activePlayItems[currentIdx];
    if (!currentItem || !currentItem.correct_order) return;

    const isMatch =
      JSON.stringify(puzzleSelected) === JSON.stringify(currentItem.correct_order);

    setIsAnswerCorrect(isMatch);
    if (isMatch) {
      playSound('correct');
      speakFeedback(true);
      setScore((prev) => prev + 10);
      setCorrectAnswersCount((prev) => prev + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak >= 2 && nextStreak % 2 === 0) {
        setLives((prev) => Math.min(maxLives, prev + 1));
      }
    } else {
      playSound('wrong');
      speakFeedback(false);
      setStreak(0);
      setLives((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => {
            setGameFinished(true);
          }, 700);
        }
        return Math.max(0, next);
      });
    }
  };

  // Memory Card Click
  const handleCardClick = (index: number) => {
    if (flippedCards.length === 2 || cards[index].flipped || cards[index].matched) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const idx1 = newFlipped[0];
      const idx2 = newFlipped[1];

      if (cards[idx1].matchId === cards[idx2].matchId) {
        // Matched!
        playSound('correct');
        speakFeedback(true);
        setTimeout(() => {
          setCards((prevCards) => {
            const nextCards = prevCards.map((c, i) =>
              i === idx1 || i === idx2 ? { ...c, matched: true } : c
            );
            const allMatched = nextCards.every((c) => c.matched);
            if (allMatched) {
              setTimeout(() => {
                setGameFinished(true);
                playSound('win');
              }, 100);
            }
            return nextCards;
          });
          setFlippedCards([]);
          setScore((s) => s + 10);
          setCorrectAnswersCount((prev) => prev + 1);
          setStreak((prevStreak) => {
            const nextStreak = prevStreak + 1;
            if (nextStreak >= 2 && nextStreak % 2 === 0) {
              setLives((l) => Math.min(maxLives, l + 1));
            }
            return nextStreak;
          });
        }, 500);
      } else {
        // Not matched - deduct life
        playSound('wrong');
        speakFeedback(false);
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setTimeout(() => {
              setGameFinished(true);
            }, 1000);
          }
          return Math.max(0, next);
        });
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((c, i) =>
              i === idx1 || i === idx2 ? { ...c, flipped: false } : c
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  // Ular Tangga Roll Dice & Interactive Movement
  const handleRollDice = () => {
    if (isRolling || boardQuestionModalOpen || gameFinished) return;
    setIsRolling(true);
    playSound('dice');
    setBoardModalSelected(null);
    setBoardModalIsCorrect(null);

    const startPos = playerPos;
    setBoardPrevPos(startPos);

    let rolls = 0;
    const interval = setInterval(() => {
      const randomDice = Math.floor(Math.random() * 6) + 1;
      setDiceRoll(randomDice);
      rolls++;
      if (rolls > 10) {
        clearInterval(interval);
        setIsRolling(false);
        const finalDice = Math.floor(Math.random() * 6) + 1;
        setDiceRoll(finalDice);

        const targetPos = Math.min(30, startPos + finalDice);

        // Step-by-step movement animation
        let currentStep = startPos;
        const stepInterval = setInterval(() => {
          if (currentStep < targetPos) {
            currentStep++;
            setPlayerPos(currentStep);
          } else {
            clearInterval(stepInterval);

            // Arrived at targetPos
            if (targetPos === 30) {
              setGameFinished(true);
              playSound('win');
              speakFeedback(true);
              setCurrentBoardEvent('🏆 SELAMAT! Anda Mencapai Garis Finish Ular Tangga Islami!');
            } else {
              // Open Question Modal Automatically!
              const q = getQuestionForTile(targetPos);
              setCurrentBoardQuestion(q);
              setBoardQuestionModalOpen(true);
              setCurrentBoardEvent(`🎲 Dadu: ${finalDice} | Melangkah ke Kotak #${targetPos}. Jawab soal untuk amankan posisi!`);
            }
          }
        }, 180);
      }
    }, 90);
  };

  // Handle Ular Tangga Question Modal Answer
  const handleAnswerBoardQuestion = (opt: string) => {
    if (!currentBoardQuestion || boardModalSelected !== null) return;
    setBoardModalSelected(opt);

    const isCorrect = opt === currentBoardQuestion.correct_answer;
    setBoardModalIsCorrect(isCorrect);

    if (isCorrect) {
      playSound('correct');
      speakFeedback(true);
      setScore((prev) => prev + 10);
      setCorrectAnswersCount((prev) => prev + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak >= 2 && nextStreak % 2 === 0) {
        setLives((prev) => Math.min(maxLives, prev + 1));
      }

      const currentP = playerPos;
      if (currentP === 3) {
        setTimeout(() => {
          setPlayerPos(12);
          setCurrentBoardEvent('🚀 BENAR! Dan Naik Tangga dari Kotak 3 meluncur ke Kotak 12!');
        }, 1000);
      } else if (currentP === 10) {
        setTimeout(() => {
          setPlayerPos(22);
          setCurrentBoardEvent('🚀 BENAR! Dan Naik Tangga dari Kotak 10 meluncur ke Kotak 22!');
        }, 1000);
      } else {
        setCurrentBoardEvent(`🎉 BENAR! Posisi Anda Aman di Kotak #${currentP}.`);
      }
    } else {
      playSound('wrong');
      speakFeedback(false);
      setStreak(0);
      setLives((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => {
            setBoardQuestionModalOpen(false);
            setGameFinished(true);
          }, 1200);
        }
        return Math.max(0, next);
      });

      const currentP = playerPos;
      if (currentP === 17) {
        setTimeout(() => {
          setPlayerPos(7);
          setCurrentBoardEvent('🐍 JAWABAN SALAH! Terpeleset Ular turun dari Kotak 17 ke Kotak 7.');
        }, 1000);
      } else if (currentP === 27) {
        setTimeout(() => {
          setPlayerPos(15);
          setCurrentBoardEvent('🐍 JAWABAN SALAH! Terpeleset Ular turun dari Kotak 27 ke Kotak 15.');
        }, 1000);
      } else {
        setTimeout(() => {
          setPlayerPos(boardPrevPos);
          setCurrentBoardEvent(`❌ JAWABAN SALAH! Penalti: Karakter mundur kembali ke Kotak #${boardPrevPos}.`);
        }, 1000);
      }
    }
  };

  // Export HTML Game Standalone Package
  const generateExportHtml = () => {
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Edukasi Islami Offline - ${activeMode}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: system-ui, sans-serif; background: #020617; color: #f8fafc; padding: 20px; text-align: center; }
    .card { background: #0f172a; border: 1px solid #334155; padding: 24px; border-radius: 16px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .btn { background: #334155; color: #f8fafc; border: 1px solid #475569; padding: 12px 20px; border-radius: 12px; font-weight: bold; cursor: pointer; margin: 8px; transition: 0.2s; font-size: 15px; display: inline-block; }
    .btn:hover { background: #475569; border-color: #64748b; }
    .btn-audio { background: #6366f1; color: #ffffff; border: 1px solid #818cf8; font-size: 16px; padding: 14px 24px; border-radius: 14px; margin-bottom: 16px; }
    .btn-audio:hover { background: #4f46e5; }
    .arabic, .btn.arabic-opt { font-size: 26px; line-height: 2; font-family: 'KFGQPC Uthmanic Script Hafs', 'Amiri Quran', 'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', serif; color: #fbbf24; margin: 12px 0; direction: rtl; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🤖 Game Edukasi Islami (${activeMode.toUpperCase()})</h1>
    <p>Game ini dapat dimainkan 100% offline tanpa koneksi internet!</p>
    <div id="game-box"></div>
  </div>
  <script>
    const data = ${JSON.stringify(gameItems)};
    let current = 0;
    function isArabic(txt) { return /[\u0600-\u06FF]/.test(txt); }
    function speak(txt) {
      if (!('speechSynthesis' in window)) return alert('Browser tidak mendukung audio.');
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = isArabic(txt) ? 'ar-SA' : 'id-ID';
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
    function render() {
      if (current >= data.length) {
        document.getElementById('game-box').innerHTML = '<h2>🎉 Game Selesai! Terima Kasih Telah Bermain.</h2>';
        return;
      }
      const item = data[current];
      let html = '<h3>' + item.prompt_text + '</h3>';
      const speakTxt = item.audio_text || item.arabic_text || item.prompt_text;
      if (speakTxt) {
        html += '<button class="btn btn-audio" onclick="speak(\'' + speakTxt.replace(/'/g, "\\'") + '\')">🔊 Putar Suara Bacaan Audio</button><br/>';
      }
      if (item.arabic_text && '${activeMode}' !== 'tebak-audio') html += '<div class="arabic">' + item.arabic_text + '</div>';
      if (item.options) {
        item.options.forEach(opt => {
          const cls = isArabic(opt) ? 'btn arabic-opt' : 'btn';
          html += '<button class="' + cls + '" onclick="check(\'' + opt.replace(/'/g, "\\'") + '\')">' + opt + '</button>';
        });
      }
      document.getElementById('game-box').innerHTML = html;
    }
    function check(opt) {
      const item = data[current];
      if (opt === item.correct_answer) {
        alert('✅ Jawaban Benar!');
      } else {
        alert('❌ Jawaban Belum Tepat. Kunci: ' + item.correct_answer);
      }
      current++;
      render();
    }
    render();
  </script>
</body>
</html>`;
  };

  const handleCopyExportHtml = () => {
    const html = generateExportHtml();
    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleDownloadExportHtml = () => {
    const html = generateExportHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Game-Islami-${activeMode}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const menuList = [
    { id: 'pilihan-ganda', label: 'Game Pilihan Ganda', icon: Trophy, desc: 'Kuis pilihan ganda dengan skor & nyawa' },
    { id: 'sambung-ayat', label: isIslamicSubject ? 'Sambung Ayat' : 'Menyambung Kalimat', icon: Flame, desc: isIslamicSubject ? 'Menghubungkan potongan ayat berikutnya' : 'Melanjutkan/menyambung potongan kalimat materi' },
    { id: 'melengkapi-ayat', label: isIslamicSubject ? 'Melengkapi Ayat' : 'Melengkapi Kalimat', icon: BookOpen, desc: isIslamicSubject ? 'Mengisi kata/kata rumpang dalam Al-Qur\'an' : 'Mengisi kata/istilah yang rumpang dalam kalimat' },
    { id: 'tebak-surat', label: isIslamicSubject ? 'Tebak Surat' : 'Tebak Topik / Istilah', icon: Brain, desc: isIslamicSubject ? 'Menebak nama surat dari potongan ayat' : 'Menebak nama istilah/topik dari deskripsi' },
    { id: 'tebak-nomor-ayat', label: isIslamicSubject ? 'Tebak Nomor Ayat' : 'Tebak Urutan / Angka', icon: HelpCircle, desc: isIslamicSubject ? 'Menebak urutan nomor ayat Al-Qur\'an' : 'Menebak urutan nomor/angka/tahun materi' },
    { id: 'tebak-audio', label: 'Mendengarkan (Audio)', icon: Volume2, desc: isIslamicSubject ? 'Dengarkan suara bacaan ayat lalu tebak surat/ayat di pilihan' : 'Dengarkan suara/soal narasi lalu tebak jawaban yang tepat' },
    { id: 'puzzle-ayat', label: isIslamicSubject ? 'Puzzle Ayat' : 'Puzzle Susun Kalimat', icon: Layers, desc: isIslamicSubject ? 'Menyusun urutan acak kata dalam ayat' : 'Menyusun urutan acak kata menjadi kalimat yang benar' },
    { id: 'memory-card', label: 'Memory Card', icon: Grid, desc: isIslamicSubject ? 'Mencocokkan pasangan kartu Arab & Arti' : 'Mencocokkan pasangan kartu Soal & Jawaban' },
    { id: 'ular-tangga-islami', label: isIslamicSubject ? 'Ular Tangga Islami' : 'Ular Tangga Edukasi', icon: Dice6, desc: 'Papan ular tangga interaktif dengan kuis' },
    { id: 'export-game', label: 'Export Game', icon: Download, desc: 'Ekspor game ke file HTML/JSON offline' },
  ].filter((item) => !isStudentOrUmum || item.id !== 'export-game');

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER BAR */}
      {!isStudentOrUmum ? (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Pembuat Game Soal
                </h1>
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-400">
                  Platform Game Edukasi Islami, Tahfizh Al-Qur'an & Pembuat Permainan Digital
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Sound Toggle, Shuffle Questions & Quick Reset */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Suara Voice Feedback"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Suara ON' : 'Suara Mute'}</span>
            </button>

            {!isStudentOrUmum && (
              <button
                onClick={handleResetGame}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Reset Game</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/90 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Permainan Soal Edukasi Interaktif</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-300">
                  Pilih jenis mata pelajaran yang ingin kamu mainkan:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundEnabled ? 'Suara ON' : 'Mute'}</span>
              </button>
            </div>
          </div>

          {/* Subject Selector Bar */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center gap-3">
            <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5 shrink-0">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Mata Pelajaran:</span>
            </label>

            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full max-w-md px-3.5 py-2 bg-slate-950 border border-indigo-500/40 rounded-xl text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-inner"
            >
              {subjectOptions.length === 0 ? (
                <option value="">-- Belum ada Mata Pelajaran (Tambah di Menu Mata Pelajaran) --</option>
              ) : (
                subjectOptions.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}

      {/* NAVIGATION TABS MENU (Required Structure) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
        {menuList.map((item) => {
          const Icon = item.icon;
          const isActive = activeMode === item.id;
          const count = (gameDataMap[item.id] || []).filter((it) => it.subject_name === selectedSubject).length;
          return (
            <button
              key={item.id}
              onClick={() => handleSwitchMode(item.id as GameMode)}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-105 font-bold'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="relative mb-1.5 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-300' : 'text-indigo-400'}`} />
                {item.id !== 'export-game' && count > 0 && (
                  <span
                    className={`absolute -top-2 -right-3 text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-800 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold leading-tight line-clamp-2">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* DYNAMIC INTEGRATED AI GENERATOR FORM FOR ACTIVE TAB */}
      {!isStudentOrUmum && activeMode !== 'export-game' && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden">
          {/* Header Banner with Dynamic Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 shrink-0">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white flex flex-wrap items-center gap-2">
                  <span>Generate Soal Khusus:</span>
                  <span className="text-amber-300 underline decoration-amber-400/50">
                    {menuList.find((m) => m.id === activeMode)?.label}
                  </span>
                  <span className="text-indigo-300">- Tingkat {difficulty}</span>
                </h2>
                <p className="text-[11px] text-slate-300">
                  Soal yang dihasilkan <strong className="text-amber-300">HANYA dimasukkan khusus</strong> ke dalam jenis game <span className="text-indigo-200 font-bold">{menuList.find((m) => m.id === activeMode)?.label}</span>.
                </p>
              </div>
            </div>

            <div className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 flex items-center gap-2 shrink-0">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
              <span>Game Aktif: {menuList.find((m) => m.id === activeMode)?.label}</span>
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs">
            {/* Jenis Mata Pelajaran */}
            <div className="space-y-1">
              <label className="block text-slate-200 font-bold flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Jenis Mata Pelajaran:</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/90 border border-indigo-500/30 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-400 cursor-pointer font-medium"
              >
                {subjectOptions.length === 0 ? (
                  <option value="">-- Belum ada Mata Pelajaran --</option>
                ) : (
                  subjectOptions.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Topik / Surat */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-slate-200 font-bold">
                Materi / Surat / Topik Soal:
              </label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Contoh: Surat Al-Fatihah, Tajwid Nun Mati, Juz 30"
                className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-indigo-500/30 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-medium"
              />
            </div>

            {/* Jenjang */}
            <div className="space-y-1">
              <label className="block text-slate-200 font-bold">Jenjang Sekolah:</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/90 border border-indigo-500/30 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-400 cursor-pointer font-medium"
              >
                <option value="SD / MI">SD / MI</option>
                <option value="SMP / MTs">SMP / MTs</option>
                <option value="SMA / MA">SMA / MA</option>
                <option value="Umum">Umum / Tahfizh</option>
              </select>
            </div>

            {/* Jumlah Soal */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-slate-200 font-bold">Jumlah Soal AI:</label>
                <div className="flex items-center gap-1">
                  {['5', '10', '15', '20', '30'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setItemCountText(num)}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                        itemCountText === num
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={itemCountText}
                onChange={(e) => setItemCountText(e.target.value)}
                placeholder="Contoh: 5, 10, 20, 50"
                className="w-full px-3 py-2 bg-slate-950/90 border border-indigo-500/30 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-400 font-mono font-bold text-xs"
              />
            </div>
          </div>

          {/* Difficulty Radio Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-slate-200 font-bold text-xs flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Tingkat Kesulitan Game:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDifficulty('Mudah')}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  difficulty === 'Mudah'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md ring-2 ring-emerald-400/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>🟢 Mudah</span>
                  {difficulty === 'Mudah' && <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-black">AKTIF</span>}
                </div>
                <span className="text-[10px] text-slate-300 mt-1 leading-tight">
                  Pertanyaan lugas dan langsung menguji pemahaman dasar/definisi dengan pilihan jawaban yang jelas.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDifficulty('Sedang')}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  difficulty === 'Sedang'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>🟡 Sedang</span>
                  {difficulty === 'Sedang' && <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">AKTIF</span>}
                </div>
                <span className="text-[10px] text-slate-300 mt-1 leading-tight">
                  Menguji pemahaman konsep, hukum kaidah, dan korelasi antar komponen materi.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDifficulty('Sulit')}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  difficulty === 'Sulit'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-200 shadow-md ring-2 ring-rose-400/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span>🔴 Sulit (HOTS)</span>
                  {difficulty === 'Sulit' && <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-black">AKTIF</span>}
                </div>
                <span className="text-[10px] text-slate-300 mt-1 leading-tight">
                  Soal penalaran analitis (HOTS), evaluasi kasus kritis, dan studi pemecahan masalah.
                </span>
              </button>
            </div>
          </div>

          {aiError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold">
              {aiError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleGenerateAiGame(false)}
              disabled={isGenerating}
              className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>Sedang Menghasilkan Soal AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>🤖 AI Online ({menuList.find((m) => m.id === activeMode)?.label})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenAddManualModal}
              className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>✍️ Buat Soal Manual</span>
            </button>

            <button
              type="button"
              onClick={handleSyncToBankSoal}
              className="w-full sm:w-auto py-3 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-indigo-600/20"
              title={`Sinkronkan soal game ke Bank Soal ${selectedSubject}`}
            >
              <Database className="w-4 h-4 text-amber-300" />
              <span>Sync ke Bank Soal ({selectedSubject})</span>
            </button>

            <button
              type="button"
              onClick={handleResetGame}
              className="w-full sm:w-auto py-3 px-3 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Reset Soal</span>
            </button>
          </div>
        </div>
      )}

      {/* CLASSIFICATION & DISTRIBUTION SUCCESS NOTIFICATION BANNER */}
      {lastGenMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{lastGenMessage}</span>
          </div>
          <button
            onClick={() => setLastGenMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN GAME DISPLAY CONTAINER */}
      <div className={isStudentOrUmum ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
        
        {/* LEFT / CENTER PANEL: ACTIVE GAME AREA */}
        <div className={isStudentOrUmum ? "space-y-6" : "lg:col-span-2 space-y-6"}>

          {/* EXPORT GAME MODE SCREEN */}
          {activeMode === 'export-game' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Download className="w-6 h-6 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">Ekspor Game Soal Offline</h2>
                  <p className="text-xs text-slate-400">
                    Unduh paket game mandiri yang dapat dibuka langsung tanpa internet
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <FileCode className="w-5 h-5" />
                    <span>Single-File HTML Game</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Paket file HTML tunggal yang berisi kuis dan logikanya. Bisa dibuka di browser HP / Laptop siswa kapan saja.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleDownloadExportHtml}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh HTML</span>
                    </button>
                    <button
                      onClick={handleCopyExportHtml}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedHtml ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                      <span>{copiedHtml ? 'Tersalin' : 'Salin Code'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Award className="w-5 h-5" />
                    <span>Format JSON Paket Game</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Format data game mentah JSON untuk disalin atau diintegrasikan ke platform eLearning lainnya.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(gameItems, null, 2));
                      alert('Data JSON Game berhasil disalin ke clipboard!');
                    }}
                    className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Salin Paket JSON Game</span>
                  </button>
                </div>
              </div>
            </div>
          ) : gameFinished ? (
            /* GAME FINISHED SCREEN - ISOLATED PER 1 MAPEL & 1 LEVEL */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-2xl max-w-xl mx-auto">
              <div className={`w-16 h-16 rounded-3xl border flex items-center justify-center mx-auto shadow-inner animate-bounce ${
                lives <= 0
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                {lives <= 0 ? <Heart className="w-8 h-8 text-rose-500 fill-rose-500" /> : <Trophy className="w-8 h-8 text-amber-400" />}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">
                  {lives <= 0 ? '💔 Nyawa Habis - Permainan Selesai!' : 'Level Permainan Selesai! 🎉'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  {lives <= 0
                    ? 'Kesempatan 3 nyawa Anda telah habis. Poin dan seluruh jawaban benar yang berhasil Anda jawab tetap dihitung dan tersimpan:'
                    : 'Hasil pencapaian nilai & skor murni untuk 1 Mapel dan 1 Level ini:'}
                </p>
              </div>

              {/* Session Detail Breakdown Card */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 text-left space-y-4 shadow-inner">
                {/* Highlight Grade Box */}
                <div className={`flex items-center justify-between p-4 border rounded-2xl ${
                  lives <= 0
                    ? 'bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border-rose-500/30'
                    : 'bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 border-amber-500/30'
                }`}>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Nilai Akhir Level Ini</span>
                    <h4 className="text-3xl font-black text-white font-mono">
                      {Math.round((correctAnswersCount / (activePlayItems.length || 1)) * 100)}
                      <span className="text-sm font-bold text-slate-400 font-sans"> / 100</span>
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Jawaban Benar</span>
                    <p className="text-lg font-black text-emerald-300 font-mono">
                      {correctAnswersCount} <span className="text-xs font-normal text-slate-400">dari {activePlayItems.length} Soal</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mata Pelajaran</span>
                    <p className="font-extrabold text-slate-200 truncate">{selectedSubject || 'Umum / Agama Islam'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mode Game</span>
                    <p className="font-extrabold text-amber-400 truncate">{menuList.find((m) => m.id === activeMode)?.label || activeMode}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tingkat Level Selesai</span>
                    <p className="font-extrabold text-emerald-400 flex items-center gap-1">
                      {selectedDifficultyFilter === 'Mudah'
                        ? '🟢 Level 1 (Mudah)'
                        : selectedDifficultyFilter === 'Sedang'
                        ? '🟡 Level 2 (Sedang)'
                        : selectedDifficultyFilter === 'Sulit'
                        ? '🔴 Level 3 (Sulit)'
                        : '✨ Semua Level'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Skor Poin Level</span>
                    <p className="font-black text-amber-400 text-base font-mono">{score} Poin</p>
                  </div>
                </div>

                {/* Status Sisa Nyawa */}
                <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                  <span className="text-slate-400 font-semibold">Sisa Nyawa:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {Array.from({ length: maxLives }).map((_, i) => (
                        <Heart
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[11px] font-bold ${lives <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {lives <= 0 ? `(0/${maxLives} Nyawa Habis)` : `(${lives}/${maxLives} Sisa Nyawa)`}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Point dan Nilai ini murni diambil dari <strong>{selectedSubject}</strong> pada level <strong>{selectedDifficultyFilter}</strong> ({score} Poin dari {correctAnswersCount} soal benar).
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Skor level ini telah otomatis tercatat di Riwayat & Rekap Game</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => resetGameStates()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{lives <= 0 ? `🔄 Main Ulang (Isi ${maxLives} Nyawa)` : 'Ulangi Level Ini'}</span>
                </button>

                {selectedDifficultyFilter === 'Mudah' && (
                  <button
                    onClick={() => {
                      setSelectedDifficultyFilter('Sedang');
                      resetGameStates();
                    }}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <span>Lanjut ke Level Sedang (Poin Baru)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {selectedDifficultyFilter === 'Sedang' && (
                  <button
                    onClick={() => {
                      setSelectedDifficultyFilter('Sulit');
                      resetGameStates();
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 transition-all"
                  >
                    <span>Lanjut ke Level Sulit (Poin Baru)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {!isStudentOrUmum && (
                  <button
                    onClick={handleResetGame}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-rose-950/40 text-rose-300 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer border border-slate-700 transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Reset & Hapus Soal</span>
                  </button>
                )}
              </div>
            </div>
          ) : activeMode === 'ular-tangga-islami' ? (
            /* ULAR TANGGA ISLAMI GAME BOARD */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Dice6 className="w-6 h-6 text-amber-400 animate-bounce" />
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {isIslamicSubject ? 'Papan Ular Tangga Islami' : 'Papan Ular Tangga Edukasi'}
                    </h2>
                    <p className="text-xs text-slate-400">Lempar dadu dan kumpulkan poin jawaban benar!</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Hearts / Lives */}
                  <div className="flex items-center gap-1 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 flex-wrap">
                    {Array.from({ length: maxLives }).map((_, i) => (
                      <Heart
                        key={i}
                        className={`w-4 h-4 ${
                          i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] font-bold text-rose-400 ml-1">
                      {lives}/{maxLives}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 font-mono">
                    Skor: {score}
                  </div>

                  <button
                    onClick={handleRollDice}
                    disabled={isRolling || gameFinished}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Dice5 className="w-5 h-5 animate-spin" />
                    <span>{isRolling ? 'Mengocok...' : 'Kocok Dadu 🎲'}</span>
                  </button>
                </div>
              </div>

              {/* Event Alert */}
              {currentBoardEvent && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold text-center animate-pulse">
                  {currentBoardEvent}
                </div>
              )}

              {/* Board Grid 30 Cells */}
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 30 }, (_, i) => 30 - i).map((num) => {
                  const isPlayerHere = playerPos === num;
                  const isLadder = num === 3 || num === 10;
                  const isSnake = num === 17 || num === 27;

                  return (
                    <div
                      key={num}
                      className={`h-14 sm:h-16 rounded-xl border flex flex-col items-center justify-between p-1.5 relative transition-all ${
                        isPlayerHere
                          ? 'bg-indigo-600 border-indigo-400 ring-4 ring-indigo-400/50 scale-105 z-10'
                          : isLadder
                          ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                          : isSnake
                          ? 'bg-rose-950/50 border-rose-700/60 text-rose-300'
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold self-start opacity-70">{num}</span>
                      
                      {isPlayerHere && (
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-lg animate-bounce">
                          🚶🏻‍♂️
                        </div>
                      )}

                      {isLadder && !isPlayerHere && <span className="text-xs">🚀 Tangga</span>}
                      {isSnake && !isPlayerHere && <span className="text-xs">🐍 Ular</span>}
                      {num === 30 && !isPlayerHere && <span className="text-xs font-bold text-amber-400">🏆 FINISH</span>}
                    </div>
                  );
                })}
              </div>

              {/* POP-UP MODAL SOAL ULAR TANGGA */}
              {boardQuestionModalOpen && currentBoardQuestion && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-sm border border-amber-500/30">
                          #{playerPos}
                        </span>
                        <div>
                          <h3 className="text-base font-extrabold text-white">Soal Kotak Ular Tangga</h3>
                          <p className="text-[11px] text-amber-400 font-semibold">Jawab dengan benar untuk mengamankan posisi!</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                          Dadu: {diceRoll || '-'}
                        </div>
                        {!isStudentOrUmum && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(currentBoardQuestion)}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Edit Soal Ular Tangga"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px]">Edit</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="space-y-3">
                      <p className={`text-sm sm:text-base font-bold text-slate-100 ${isArabicText(currentBoardQuestion.prompt_text) ? 'font-arabic text-xl text-amber-200 dir-rtl text-right leading-loose' : ''}`}>
                        {currentBoardQuestion.prompt_text}
                      </p>

                      {isIslamicSubject && currentBoardQuestion.arabic_text && (
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-1">
                          <p className="text-2xl font-black text-amber-300 font-arabic dir-rtl leading-loose" style={{ fontFamily: "'KFGQPC Uthmanic Script Hafs', 'Amiri Quran', 'Amiri', serif" }}>
                            {currentBoardQuestion.arabic_text}
                          </p>
                          {currentBoardQuestion.translation && (
                            <p className="text-xs text-slate-400 italic">"{currentBoardQuestion.translation}"</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      {currentBoardQuestion.options?.map((opt, oIdx) => {
                        const isSelected = boardModalSelected === opt;
                        const isCorrectOpt = opt === currentBoardQuestion.correct_answer;
                        const optionLetter = String.fromCharCode(65 + oIdx);

                        let btnStyle = 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-amber-500/50';

                        if (boardModalSelected !== null) {
                          if (isCorrectOpt) {
                            btnStyle = 'bg-emerald-600 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/50';
                          } else if (isSelected && !boardModalIsCorrect) {
                            btnStyle = 'bg-rose-600 border-rose-400 text-white font-bold';
                          } else {
                            btnStyle = 'bg-slate-950 border-slate-800 text-slate-600 opacity-40';
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleAnswerBoardQuestion(opt)}
                            disabled={boardModalSelected !== null}
                            className={`p-3.5 rounded-2xl border text-left font-semibold transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <span className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                                {optionLetter}
                              </span>
                              <span className={`text-xs sm:text-sm leading-relaxed ${isArabicText(opt) ? 'font-arabic text-xl text-amber-300 dir-rtl w-full text-center' : ''}`}>
                                {opt}
                              </span>
                            </div>
                            {boardModalSelected !== null && isCorrectOpt && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                            )}
                            {boardModalSelected !== null && isSelected && !isCorrectOpt && (
                              <XCircle className="w-5 h-5 text-rose-300 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Answer Feedback & Explanation */}
                    {boardModalSelected !== null && (
                      <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-extrabold ${boardModalIsCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {boardModalIsCorrect ? '🎉 Alhamdulillah Jawaban Anda Benar!' : '❌ Maaf Jawaban Anda Salah, Silahkan Coba Lagi!'}
                          </span>
                          <button
                            onClick={() => setBoardQuestionModalOpen(false)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-md cursor-pointer hover:opacity-90 transition-all"
                          >
                            Tutup & Lanjut
                          </button>
                        </div>
                        {currentBoardQuestion.explanation && (
                          <p className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 leading-relaxed">
                            <strong className="text-slate-300">Pembahasan:</strong> {currentBoardQuestion.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeMode === 'memory-card' ? (
            /* MEMORY CARD GAME */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Grid className="w-6 h-6 text-purple-400" />
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">Memory Card Match</h2>
                    <p className="text-xs text-slate-400">
                      {isIslamicSubject ? 'Cocokkan kartu teks Arab dengan terjemahannya!' : 'Cocokkan kartu soal/istilah dengan pasangan jawabannya!'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Hearts / Lives */}
                  <div className="flex items-center gap-1 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 flex-wrap">
                    {Array.from({ length: maxLives }).map((_, i) => (
                      <Heart
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] font-bold text-rose-400 ml-1">
                      {lives}/{maxLives}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 font-mono">
                    Skor: {score}
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cards.map((card, idx) => {
                  const isVisible = card.flipped || card.matched;

                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(idx)}
                      disabled={card.matched}
                      className={`h-28 rounded-2xl border p-3 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer ${
                        card.matched
                          ? 'bg-emerald-950/40 border-emerald-500/40 opacity-60'
                          : card.flipped
                          ? 'bg-indigo-900 border-indigo-400 text-white shadow-xl'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-transparent'
                      }`}
                    >
                      {isVisible ? (
                        <div className="space-y-1">
                          <span className={`font-bold ${isIslamicSubject && (card.type === 'arabic' || isArabicText(card.content)) ? 'text-amber-300 text-base sm:text-lg font-arabic leading-loose' : 'text-slate-200 text-xs sm:text-sm font-semibold'}`}>
                            {card.content}
                          </span>
                        </div>
                      ) : (
                        <Brain className="w-8 h-8 text-slate-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* GENERAL QUIZ / SAMBUNG AYAT / MELENGKAPI / PUZZLE / TEBAK SURAT SCREEN */
            <div className="space-y-4">
              {/* DIFFICULTY LEVEL FILTER BAR FOR ACTIVE GAME */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Pilih Level Soal (Dinilai Per-Level Mandiri):</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['Mudah', 'Sedang', 'Sulit', 'Semua'] as const).map((diff) => {
                    const count = diff === 'Semua' 
                      ? gameItems.length 
                      : gameItems.filter(item => (item.difficulty || 'Sedang') === diff).length;
                    
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => {
                          setSelectedDifficultyFilter(diff);
                          resetGameStates();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                          selectedDifficultyFilter === diff
                            ? diff === 'Mudah'
                              ? 'bg-emerald-500 text-slate-950 font-black shadow'
                              : diff === 'Sedang'
                              ? 'bg-amber-400 text-slate-950 font-black shadow'
                              : diff === 'Sulit'
                              ? 'bg-rose-500 text-white font-black shadow'
                              : 'bg-indigo-600 text-white font-black shadow'
                            : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        <span>{diff === 'Mudah' ? '🟢 Level 1: Mudah' : diff === 'Sedang' ? '🟡 Level 2: Sedang' : diff === 'Sulit' ? '🔴 Level 3: Sulit' : '✨ Semua Soal'}</span>
                        <span className="px-1.5 py-0.2 text-[10px] bg-black/40 rounded-full font-mono">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GAME PLAY CARD CONTAINER */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                {activePlayItems.length === 0 ? (
                  <div className="py-8 text-center space-y-4">
                    <Award className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                    <h3 className="text-base font-bold text-white">
                      {gameItems.length === 0
                        ? `Soal game pada Mode ${menuList.find((m) => m.id === activeMode)?.label} sedang Kosong`
                        : `Belum Ada Soal Tingkat Kesulitan "${selectedDifficultyFilter}" pada Mode ${menuList.find((m) => m.id === activeMode)?.label}`}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      {gameItems.length === 0
                        ? 'Seluruh soal pada mode ini sedang kosong. Silakan buat/generate soal baru.'
                        : `Anda dapat menambahkan soal tingkat ${selectedDifficultyFilter} dengan menekan tombol "✍️ Buat Soal Manual", atau tampilkan seluruh soal.`}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      {gameItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDifficultyFilter('Semua');
                            resetGameStates();
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                        >
                          Tampilkan Semua Soal ({gameItems.length})
                        </button>
                      )}

                      {!isStudentOrUmum && (
                        <button
                          type="button"
                          onClick={handleOpenAddManualModal}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                        >
                          <PlusCircle className="w-4 h-4 text-amber-300" />
                          <span>Buat / Input Soal Manual ({selectedDifficultyFilter === 'Semua' ? 'Sedang' : selectedDifficultyFilter})</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* NAVBAR KONTROL CEK SOAL - KHUSUS GURU & ADMIN */}
                    {!isStudentOrUmum && activePlayItems.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-1 bg-slate-800/90 rounded-2xl border border-indigo-500/30 shadow-md">
                        {/* Status Mode Cek Soal */}
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                          <Eye className="w-4 h-4 text-amber-400" />
                          <span className="hidden sm:inline">Mode Review Soal (Guru/Admin)</span>
                          <span className="sm:hidden">Review Soal</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Tombol Mundur (Prev) */}
                          <button
                            type="button"
                            onClick={() => handleJumpQuestion(Math.max(0, currentIdx - 1))}
                            disabled={currentIdx === 0}
                            title="Soal Sebelumnya"
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentIdx === 0
                                ? 'bg-slate-700/40 text-slate-500 cursor-not-allowed border border-slate-700'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95'
                            }`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Mundur</span>
                          </button>

                          {/* Indikator Nomor Soal */}
                          <span className="text-xs font-extrabold text-slate-200 px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-700 font-mono">
                            {currentIdx + 1} / {activePlayItems.length}
                          </span>

                          {/* Tombol Maju (Next) */}
                          <button
                            type="button"
                            onClick={() => handleJumpQuestion(Math.min(activePlayItems.length - 1, currentIdx + 1))}
                            disabled={currentIdx === activePlayItems.length - 1}
                            title="Soal Selanjutnya"
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentIdx === activePlayItems.length - 1
                                ? 'bg-slate-700/40 text-slate-500 cursor-not-allowed border border-slate-700'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95'
                            }`}
                          >
                            <span>Maju</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Game Stats Bar */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 text-xs sm:text-sm font-bold">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400">Soal {currentIdx + 1}/{activePlayItems.length}</span>
                        {activePlayItems[currentIdx] && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            (activePlayItems[currentIdx]?.difficulty || 'Sedang') === 'Mudah'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : (activePlayItems[currentIdx]?.difficulty || 'Sedang') === 'Sulit'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {(activePlayItems[currentIdx]?.difficulty || 'Sedang') === 'Mudah' ? '🟢 Mudah' : (activePlayItems[currentIdx]?.difficulty || 'Sedang') === 'Sulit' ? '🔴 Sulit' : '🟡 Sedang'}
                          </span>
                        )}
                        {streak > 1 && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                            <Flame className="w-3.5 h-3.5 text-amber-400" />
                            <span>{streak}x Streak! {streak % 2 === 0 ? '(+1 ❤️)' : ''}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Hearts / Lives */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {Array.from({ length: maxLives }).map((_, i) => (
                            <Heart
                              key={i}
                              className={`w-4 h-4 ${
                                i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                              }`}
                            />
                          ))}
                          <span className="text-[11px] font-bold text-rose-400 ml-1">
                            {lives}/{maxLives}
                          </span>
                        </div>

                        {/* Score */}
                        <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full font-mono">
                          Skor: {score}
                        </div>

                        {/* Single Question Edit & Delete Buttons for Teacher/Admin */}
                        {!isStudentOrUmum && activePlayItems[currentIdx] && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(activePlayItems[currentIdx])}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Edit Soal dan Jawaban"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline text-[10px]">Edit Soal</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSingleQuestion(activePlayItems[currentIdx].id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Hapus Soal Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[10px]">Hapus</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QUESTION CONTENT ITEM */}
                    {activePlayItems[currentIdx] && (
                      <div className="space-y-6">
                        {/* Prompt Title */}
                        <p className={`text-xs sm:text-sm text-slate-300 font-semibold ${isArabicText(activePlayItems[currentIdx].prompt_text) ? 'font-arabic text-lg text-amber-200 dir-rtl text-right leading-loose' : ''}`}>
                          {activePlayItems[currentIdx].prompt_text}
                        </p>

                        {/* AUDIO PLAYER CARD FOR TEBAK-AUDIO MODE & ALL AUDIO QUESTIONS */}
                        {(activeMode === 'tebak-audio' || activePlayItems[currentIdx].category === 'tebak-audio' || activePlayItems[currentIdx].audio_text) && (
                          <div className="p-6 sm:p-7 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-950 border-2 border-indigo-500/40 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                            {/* Decorative Background Glows */}
                            <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

                            {/* Header Badge & Qari/Voice Selection & Speed Control */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-3 border-b border-indigo-500/20 relative z-10">
                              <div className="flex items-center gap-2">
                                <span className="px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                  <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                                  <span>Audio Murottal & Narasi Bahasa Indonesia</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center justify-center gap-3">
                                {/* Speed Rate Selector */}
                                <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 gap-1">
                                  {[0.75, 1, 1.25].map((spd) => (
                                    <button
                                      key={spd}
                                      type="button"
                                      onClick={() => {
                                        setPlaybackSpeed(spd);
                                        if (audioRef.current) audioRef.current.playbackRate = spd;
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                        playbackSpeed === spd
                                          ? 'bg-amber-500 text-slate-950 shadow-md'
                                          : 'text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {spd}x
                                    </button>
                                  ))}
                                </div>

                                {/* Qari / Suara Selector Dropdown */}
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-slate-400 font-semibold">Suara / Qari:</label>
                                  <select
                                    value={selectedQari}
                                    onChange={(e) => setSelectedQari(e.target.value)}
                                    className="bg-slate-950 border border-indigo-500/40 text-indigo-200 text-xs rounded-xl px-3 py-1.5 font-medium outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-inner"
                                  >
                                    {QARI_LIST.map((qari) => (
                                      <option key={qari.id} value={qari.id}>
                                        {qari.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Active Audio Source Badge Indicator */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-medium text-slate-300 shadow-inner">
                              {audioSourceType === 'qari_mp3' ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                  <span className="text-emerald-300 font-semibold">🎙️ Murottal Qari Asli (Suara Halus & High Quality MP3)</span>
                                </>
                              ) : audioSourceType === 'tts_indonesia' ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                                  <span className="text-amber-300 font-semibold">🇮🇩 Suara Narasi Indonesia (Jelas, Lembut & Halus)</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                                  <span className="text-indigo-300 font-semibold">🕌 Pelafalan Bahasa Arab Sintetis</span>
                                </>
                              )}
                            </div>

                            {/* Main Play Audio Button & Visualizer */}
                            <div className="py-2 flex flex-col items-center justify-center gap-5 relative z-10">
                              {audioLoading ? (
                                <div className="px-8 py-4 bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 font-bold text-sm rounded-2xl flex items-center justify-center gap-3 animate-pulse shadow-xl">
                                  <span className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                                  <span>Memuat Suara Rekaman Qari Asli (Murottal MP3)...</span>
                                </div>
                              ) : isPlayingAudio ? (
                                <button
                                  type="button"
                                  onClick={stopVerseAudio}
                                  className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-base rounded-2xl shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3 cursor-pointer transition-all animate-pulse"
                                >
                                  <VolumeX className="w-6 h-6" />
                                  <span>Hentikan Suara ⏹️</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => playVerseAudio()}
                                  className="px-8 py-4 bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-600 hover:scale-105 active:scale-95 transition-all text-slate-950 font-black text-base rounded-2xl shadow-2xl shadow-amber-500/20 flex items-center justify-center gap-3 cursor-pointer"
                                >
                                  <Volume2 className="w-6 h-6 animate-bounce" />
                                  <span>Putar Bacaan Ayat (Murottal Qari) 🔊</span>
                                </button>
                              )}

                              {/* Interactive Audio Scrubber & Equalizer Animation */}
                              {isPlayingAudio && (
                                <div className="w-full max-w-md space-y-3 px-4 pt-1">
                                  {/* Multi-Bar Soundwave Equalizer */}
                                  <div className="flex items-center justify-center gap-1.5 h-10">
                                    <span className="w-1.5 bg-amber-400 rounded-full h-full animate-bounce [animation-delay:-0.4s]"></span>
                                    <span className="w-1.5 bg-emerald-400 rounded-full h-full animate-bounce [animation-delay:-0.2s]"></span>
                                    <span className="w-1.5 bg-indigo-400 rounded-full h-full animate-bounce"></span>
                                    <span className="w-1.5 bg-amber-300 rounded-full h-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 bg-emerald-300 rounded-full h-full animate-bounce [animation-delay:-0.35s]"></span>
                                    <span className="w-1.5 bg-indigo-300 rounded-full h-full animate-bounce [animation-delay:-0.25s]"></span>
                                    <span className="w-1.5 bg-amber-400 rounded-full h-full animate-bounce [animation-delay:-0.1s]"></span>
                                  </div>

                                  {/* Scrubber Range Input */}
                                  {audioSourceType === 'qari_mp3' && audioProgress.duration > 0 && (
                                    <div className="space-y-1">
                                      <input
                                        type="range"
                                        min={0}
                                        max={audioProgress.duration}
                                        value={audioProgress.current}
                                        onChange={(e) => seekAudio(Number(e.target.value))}
                                        className="w-full accent-amber-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
                                      />
                                      <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300">
                                        <span>{String(Math.floor(audioProgress.current / 60)).padStart(2, '0')}:{String(audioProgress.current % 60).padStart(2, '0')}</span>
                                        <span>{String(Math.floor(audioProgress.duration / 60)).padStart(2, '0')}:{String(audioProgress.duration % 60).padStart(2, '0')}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Action Buttons: Play Prompt Audio (Indonesia), Translation Audio & Hint */}
                              <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-indigo-500/20 w-full">
                                <button
                                  type="button"
                                  onClick={() => playVerseAudio()}
                                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-amber-500/50 transition-all"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Ulangi Suara Qari 🔁</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={playPromptAudio}
                                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-amber-500/50 transition-all"
                                >
                                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Putar Soal / Pertanyaan (Suara Indonesia Lembut) 🇮🇩</span>
                                </button>

                                {activePlayItems[currentIdx].translation && (
                                  <button
                                    type="button"
                                    onClick={playTranslationAudio}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-300 text-xs font-bold rounded-xl border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-emerald-500/50 transition-all"
                                  >
                                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Putar Terjemahan Bahasa Indonesia 🇮🇩</span>
                                  </button>
                                )}

                                {activePlayItems[currentIdx].translation && (
                                  <button
                                    type="button"
                                    onClick={() => setShowTranslationHint(!showTranslationHint)}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-indigo-300 text-xs font-bold rounded-xl border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-indigo-500/50 transition-all"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>{showTranslationHint ? 'Sembunyikan Terjemahan' : 'Petunjuk Teks Terjemahan 💡'}</span>
                                  </button>
                                )}
                              </div>

                              {/* Translation Text Hint Box */}
                              {showTranslationHint && activePlayItems[currentIdx].translation && (
                                <div className="mt-2 p-4 bg-slate-950/95 border border-amber-500/40 rounded-2xl text-xs text-amber-200 italic max-w-md mx-auto animate-fade-in shadow-2xl leading-relaxed">
                                  "{activePlayItems[currentIdx].translation}"
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Big Arabic Text Display if present and NOT tebak-audio */}
                        {isIslamicSubject && activePlayItems[currentIdx].arabic_text && activeMode !== 'tebak-audio' && activePlayItems[currentIdx].category !== 'tebak-audio' && (
                          <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2">
                            <p className="text-2xl sm:text-3xl font-black text-amber-300 leading-loose font-arabic dir-rtl" style={{ fontFamily: "'KFGQPC Uthmanic Script Hafs', 'Amiri Quran', 'Amiri', 'Scheherazade New', 'Noto Naskh Arabic', serif" }}>
                              {activePlayItems[currentIdx].arabic_text}
                            </p>
                            {activePlayItems[currentIdx].translation && (
                              <p className="text-xs text-slate-400 italic">
                                "{activePlayItems[currentIdx].translation}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* PUZZLE AYAT INTERACTIVE MODE */}
                        {activeMode === 'puzzle-ayat' && activePlayItems[currentIdx].puzzle_pieces && (
                          <div className="space-y-4">
                            {/* Selected puzzle area */}
                            <div className="p-4 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl min-h-[70px] flex flex-wrap items-center justify-center gap-2 dir-rtl">
                              {puzzleSelected.length === 0 ? (
                                <span className="text-xs text-slate-500">Klik kata-kata di bawah untuk menyusun urutan ayat...</span>
                              ) : (
                                puzzleSelected.map((word, wIdx) => (
                                  <button
                                    key={wIdx}
                                    type="button"
                                    onClick={() => handlePuzzleWordClick(word)}
                                    className={`px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-xl border border-indigo-400 shadow cursor-pointer hover:bg-indigo-500 ${isArabicText(word) ? 'font-arabic text-xl text-amber-200 leading-relaxed' : 'text-base'}`}
                                  >
                                    {word}
                                  </button>
                                ))
                              )}
                            </div>

                            {/* Unselected words bank */}
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                              {activePlayItems[currentIdx].puzzle_pieces
                                ?.filter((word) => !puzzleSelected.includes(word))
                                .map((word, wIdx) => (
                                  <button
                                    key={wIdx}
                                    type="button"
                                    onClick={() => handlePuzzleWordClick(word)}
                                    className={`px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 cursor-pointer ${isArabicText(word) ? 'font-arabic text-xl text-amber-300 leading-relaxed' : 'text-sm'}`}
                                  >
                                    {word}
                                  </button>
                                ))}
                            </div>

                            <div className="pt-2 flex justify-center">
                              <button
                                type="button"
                                onClick={handleCheckPuzzle}
                                disabled={puzzleSelected.length === 0}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg disabled:opacity-50 cursor-pointer"
                              >
                                Cek Jawaban Puzzle
                              </button>
                            </div>
                          </div>
                        )}

                        {/* MULTIPLE CHOICE OPTIONS */}
                        {activePlayItems[currentIdx].options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activePlayItems[currentIdx].options?.map((opt, oIdx) => {
                              const isSelected = selectedAnswer === opt;
                              const isCorrectOption = opt === activePlayItems[currentIdx].correct_answer;
                              const isArabicOpt = isArabicText(opt);

                              let btnClass = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700';

                              if (selectedAnswer !== null) {
                                if (isCorrectOption) {
                                  btnClass = 'bg-emerald-600 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/50';
                                } else if (isSelected && !isAnswerCorrect) {
                                  btnClass = 'bg-rose-600 border-rose-400 text-white font-bold';
                                } else {
                                  btnClass = 'bg-slate-900 border-slate-800 text-slate-600 opacity-50';
                                }
                              }

                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => handleAnswerClick(opt)}
                                  disabled={selectedAnswer !== null}
                                  className={`p-4 rounded-2xl border text-left font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${btnClass}`}
                                >
                                  <span className={`leading-relaxed ${isArabicOpt ? 'font-arabic text-xl sm:text-2xl text-amber-300 font-bold w-full text-center dir-rtl leading-loose' : 'text-sm'}`}>
                                    {opt}
                                  </span>
                                  {selectedAnswer !== null && isCorrectOption && (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                                  )}
                                  {selectedAnswer !== null && isSelected && !isCorrectOption && (
                                    <XCircle className="w-5 h-5 text-rose-300 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* EXPLANATION & NEXT BUTTON */}
                        {selectedAnswer !== null && (
                          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isAnswerCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isAnswerCorrect ? '🎉 Tepat Sekali!' : '❌ Jawaban Kurang Tepat'}
                              </span>

                              <button
                                type="button"
                                onClick={handleNextQuestion}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                              >
                                <span>Lanjut</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>

                            {activePlayItems[currentIdx].explanation && (
                              <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2">
                                <strong className="text-slate-300">Pembahasan:</strong> {activePlayItems[currentIdx].explanation}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: AI GENERATOR CONTROLS & GAME PRESETS */}
        {!isStudentOrUmum && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Ringkasan Game Aktif</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Jenis Game:</span>
                    <span className="text-amber-300 font-bold">
                      {menuList.find((m) => m.id === activeMode)?.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Jumlah Soal Tersedia:</span>
                    <span className="text-indigo-300 font-mono font-bold text-sm">
                      {gameItems.length} Soal
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Tingkat Kesulitan:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        difficulty === 'Mudah'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : difficulty === 'Sulit'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {difficulty}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-2xl text-indigo-300 space-y-1">
                  <span className="font-bold block text-indigo-200">Petunjuk Mode:</span>
                  <p className="leading-relaxed">
                    {menuList.find((m) => m.id === activeMode)?.desc ||
                      'Selesaikan kuis untuk mengumpulkan skor & reputasi.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Offline Info */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Dukungan Mode Offline</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Game edukasi ini dapat dimainkan secara langsung tanpa internet menggunakan database lokal.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Resetting Game Data */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b132b] border border-rose-500/40 rounded-3xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-500/30">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Hapus & Reset Soal Game</h3>
                <p className="text-xs text-slate-400">Pilih spesifikasi mapel & level yang akan dihapus</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Selector Mata Pelajaran */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Mata Pelajaran Target:</label>
                <select
                  value={resetTargetSubject}
                  onChange={(e) => setResetTargetSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="Semua">-- Semua Mata Pelajaran --</option>
                  {subjectOptions.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector Level Kesulitan */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Tingkat Kesulitan / Level:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Semua', 'Mudah', 'Sedang', 'Sulit'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setResetTargetDifficulty(diff)}
                      className={`py-2 rounded-xl font-bold text-center border transition-all cursor-pointer text-xs ${
                        resetTargetDifficulty === diff
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector Scope Mode */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Cakupan Mode Permainan:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResetTargetModeScope('all')}
                    className={`py-2 px-3 rounded-xl font-bold text-left border transition-all cursor-pointer ${
                      resetTargetModeScope === 'all'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-[11px] text-indigo-300">Semua 9 Mode Game</span>
                    <span className="text-[10px] text-slate-400">Hapus di seluruh mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetTargetModeScope('current')}
                    className={`py-2 px-3 rounded-xl font-bold text-left border transition-all cursor-pointer ${
                      resetTargetModeScope === 'current'
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500 shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-[11px] text-indigo-300">Mode Saat Ini</span>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {menuList.find((m) => m.id === activeMode)?.label}
                    </span>
                  </button>
                </div>
              </div>

              {/* Dynamic Count Preview Banner */}
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  matchingQuestionCount > 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {matchingQuestionCount > 0 ? (
                  <p>
                    Ditemukan <strong className="text-white underline">{matchingQuestionCount} soal</strong> yang akan dihapus untuk Mapel <strong className="text-amber-300">"{resetTargetSubject}"</strong> level <strong className="text-amber-300">"{resetTargetDifficulty}"</strong>. Soal mapel dan level lain tidak akan ikut terhapus.
                  </p>
                ) : (
                  <p className="text-slate-400">
                    Tidak ditemukan soal tersimpan untuk Mapel <strong className="text-slate-200">"{resetTargetSubject}"</strong> dengan level <strong className="text-slate-200">"{resetTargetDifficulty}"</strong>.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={matchingQuestionCount === 0}
                onClick={executeResetGame}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  matchingQuestionCount > 0
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Hapus {matchingQuestionCount} Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL EDIT SOAL DAN JAWABAN */}
      {isEditModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0f172a] border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full space-y-4 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Edit Soal & Jawaban</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Perbarui Teks Soal, Pilihan Jawaban, atau Kunci Jawaban</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditQuestion} className="space-y-4 text-xs">
              {/* Teks Soal */}
              <div>
                <label className="block text-slate-200 font-bold mb-1">
                  Pertanyaan / Teks Soal <span className="text-rose-400">*</span>:
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingQuestion.prompt_text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, prompt_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                  placeholder="Ketikkan pertanyaan soal..."
                />
              </div>

              {/* Teks Arab / Ayat (Optional) */}
              <div>
                <label className="block text-slate-200 font-bold mb-1">
                  Teks Arab / Ayat (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.arabic_text || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, arabic_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-200 font-arabic text-base dir-rtl focus:outline-none focus:border-amber-400"
                  placeholder="Ketikkan ayat atau teks bahasa Arab..."
                />
              </div>

              {/* Terjemahan (Optional) */}
              <div>
                <label className="block text-slate-200 font-bold mb-1">
                  Terjemahan / Teks Latin (Opsional):
                </label>
                <input
                  type="text"
                  value={editingQuestion.translation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, translation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-medium focus:outline-none focus:border-amber-400"
                  placeholder="Terjemahan atau teks latin..."
                />
              </div>

              {/* Pilihan Jawaban (A, B, C, D) */}
              <div className="space-y-2">
                <label className="block text-slate-200 font-bold">Pilihan Jawaban (A, B, C, D):</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['A', 'B', 'C', 'D'].map((label, idx) => {
                    const currentVal = (editingQuestion.options && editingQuestion.options[idx]) || '';
                    const isCorrect = editingQuestion.correct_answer === currentVal && currentVal !== '';

                    return (
                      <div key={label} className="relative flex items-center gap-1.5">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {label}
                        </span>
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => {
                            const newOpts = [...(editingQuestion.options || ['', '', '', ''])];
                            const oldVal = newOpts[idx];
                            newOpts[idx] = e.target.value;

                            let newCorrect = editingQuestion.correct_answer;
                            if (editingQuestion.correct_answer === oldVal) {
                              newCorrect = e.target.value;
                            }

                            setEditingQuestion({
                              ...editingQuestion,
                              options: newOpts,
                              correct_answer: newCorrect,
                            });
                          }}
                          className={`w-full px-3 py-1.5 bg-slate-950 border rounded-xl text-slate-100 text-xs focus:outline-none ${
                            isCorrect ? 'border-emerald-500/80 ring-1 ring-emerald-500' : 'border-slate-700 focus:border-indigo-400'
                          }`}
                          placeholder={`Pilihan ${label}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Jawaban Benar Dropdown */}
              <div>
                <label className="block text-slate-200 font-bold mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Kunci Jawaban Benar:</span>
                </label>
                <select
                  value={editingQuestion.correct_answer || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, correct_answer: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-emerald-300 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                >
                  {editingQuestion.options?.map((opt, i) => (
                    <option key={i} value={opt} className="bg-slate-900 text-white">
                      Pilihan {['A', 'B', 'C', 'D'][i]}: {opt || `(Kosong ${i + 1})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pembahasan / Penjelasan */}
              <div>
                <label className="block text-slate-200 font-bold mb-1">Pembahasan / Penjelasan (Opsional):</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-300 font-medium focus:outline-none focus:border-amber-400"
                  placeholder="Penjelasan ringkas jawaban yang benar..."
                />
              </div>

              {/* Tingkat Kesulitan */}
              <div>
                <label className="block text-slate-200 font-bold mb-1">Tingkat Kesulitan:</label>
                <select
                  value={editingQuestion.difficulty || 'Sedang'}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      difficulty: e.target.value as 'Mudah' | 'Sedang' | 'Sulit',
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="Mudah">Mudah</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Sulit">Sulit</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL INPUT SOAL MANUAL */}
      {isAddManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#0f172a] border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full space-y-4 shadow-2xl relative my-8 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-extrabold text-white">Input / Buat Soal Manual (Guru/Admin)</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Pilih tempel dokumen sekaligus atau ketik soal per-soal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddManualModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs inside Modal */}
            <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setManualInputMode('paste')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  manualInputMode === 'paste'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-amber-300" />
                <span>📋 Tempel (Paste) Teks Dokumen Word</span>
              </button>

              <button
                type="button"
                onClick={() => setManualInputMode('form')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  manualInputMode === 'form'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-300" />
                <span>✍️ Form Per-Soal</span>
              </button>
            </div>

            {/* MODE 1: TEMPEL TEKS DOKUMEN WORD (SEKALIGUS) */}
            {manualInputMode === 'paste' ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-200 font-bold mb-1 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-emerald-400" />
                    Tempel (Paste) Isi Dokumen Soal di Sini:
                  </label>
                  <textarea
                    rows={10}
                    value={manualPastedDocText}
                    onChange={(e) => setManualPastedDocText(e.target.value)}
                    placeholder="Buka file Word dokumen Anda, tekan Ctrl+A lalu Ctrl+C, dan tempelkan (Ctrl+V) isi seluruh teks soal ke sini..."
                    className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-slate-100 placeholder-slate-500 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Ketentuan Format Box */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Ketentuan Format Teks Dokumen:</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Pastikan struktur soal di dokumen Anda memuat baris pertanyaan, diikuti pilihan <strong className="text-amber-200">A.</strong> sampai <strong className="text-amber-200">D.</strong> (atau <strong className="text-amber-200">E.</strong>), dan ditutup baris kata kunci (Contoh: <strong className="text-amber-200">Kunci: C</strong> atau <strong className="text-amber-200">Jawaban: C</strong>).
                  </p>
                  <p className="text-amber-400/90 italic text-[11px] font-medium">
                    *Sistem akan membaca otomatis tiap ada kata kunci.
                  </p>
                </div>

                {/* Action Process Button */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddManualModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessManualPasteText}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Rocket className="w-4 h-4 text-amber-300" />
                    <span>PROSES & BUAT FORM</span>
                  </button>
                </div>
              </div>
            ) : (
              /* MODE 2: FORM INPUT PER-SOAL */
              <form onSubmit={handleSaveManualQuestion} className="space-y-4 text-xs">
                {/* Teks Soal */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1">
                    Pertanyaan / Teks Soal <span className="text-rose-400">*</span>:
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={manualPromptText}
                    onChange={(e) => setManualPromptText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                    placeholder="Ketikkan teks pertanyaan soal di sini..."
                  />
                </div>

                {/* Teks Arab / Ayat (Opsional) */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1">
                    Teks Arab / Ayat (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={manualArabicText}
                    onChange={(e) => setManualArabicText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-200 font-arabic text-base dir-rtl focus:outline-none focus:border-indigo-500"
                    placeholder="Ayat Al-Qur'an atau teks bahasa Arab..."
                  />
                </div>

                {/* Pilihan Jawaban (A, B, C, D) & Kunci Jawaban */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1">
                    Pilihan Jawaban & Klik Radio / Tombol Kunci untuk Memilih Jawaban Benar <span className="text-rose-400">*</span>:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {manualOptions.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx);
                      const isCorrect = manualCorrectAnswer !== '' && manualCorrectAnswer === opt && opt !== '';

                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                              : 'bg-slate-950 border-slate-700 text-slate-200'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {label}
                          </span>

                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...manualOptions];
                              const oldVal = newOpts[idx];
                              newOpts[idx] = e.target.value;
                              setManualOptions(newOpts);
                              if (manualCorrectAnswer === oldVal) {
                                setManualCorrectAnswer(e.target.value);
                              }
                            }}
                            placeholder={`Pilihan ${label}`}
                            className="flex-1 bg-transparent text-xs text-slate-100 focus:outline-none"
                            required
                          />

                          <button
                            type="button"
                            onClick={() => setManualCorrectAnswer(opt)}
                            disabled={!opt.trim()}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              isCorrect
                                ? 'bg-emerald-500 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            } ${!opt.trim() ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isCorrect ? 'KUNCI' : 'Pilih'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tingkat Kesulitan */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-200 font-bold mb-1">
                      Tingkat Kesulitan:
                    </label>
                    <select
                      value={manualDifficulty}
                      onChange={(e) => setManualDifficulty(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-medium cursor-pointer"
                    >
                      <option value="Mudah">Mudah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Sulit">Sulit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-200 font-bold mb-1">
                      Mata Pelajaran:
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedSubject}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Pembahasan */}
                <div>
                  <label className="block text-slate-200 font-bold mb-1">
                    Pembahasan / Alasan Jawaban (Opsional):
                  </label>
                  <input
                    type="text"
                    value={manualExplanation}
                    onChange={(e) => setManualExplanation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                    placeholder="Penjelasan ringkas kunci jawaban..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddManualModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Soal Manual</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
