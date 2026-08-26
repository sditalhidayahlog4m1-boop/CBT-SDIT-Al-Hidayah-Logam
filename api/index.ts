import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS headers for Vercel Serverless environment
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Helper function to build intelligent dynamic questions when AI API key is unavailable or rate-limited
function generateDynamicFallbackQuestions(subject: string, gradeLevel: string, topic: string, total: number, teacherName?: string, difficulty: string = "Sedang") {
  const list = [];
  const lowerSub = (subject || "").toLowerCase();
  const isIslamic = lowerSub.includes("pai") || lowerSub.includes("agama") || lowerSub.includes("qur") || lowerSub.includes("hadits") || lowerSub.includes("fiqih") || lowerSub.includes("arab") || lowerSub.includes("ski") || lowerSub.includes("akidah");
  const diff = difficulty || "Sedang";

  const angles = [
    {
      aspect: "Konsep Dasar & Definisi",
      qIslamic: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Berdasarkan materi "${topic}" pada mata pelajaran ${subject} (${gradeLevel}), apakah pengertian dasar yang paling tepat?`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Analisislah konsep filosofis dan hakikat mendasar dari materi "${topic}" pada ${subject} (${gradeLevel}) dalam menyelesaikan problematika ibadah modern!`;
        }
        return `Soal #${num} [Tingkat Sedang]: Dalam mempelajari materi "${topic}" pada mata pelajaran ${subject} (${gradeLevel}), bagaimanakah korelasi hukum dan pemahaman konsep pokoknya?`;
      },
      aIslamic: `Memahami dan meyakini prinsip pokok ${topic} sebagai bagian dari ajaran Islam yang lurus`,
      distIslamic: [
        `Mengabaikan prinsip dasar ${topic} dan hanya mengutamakan adat kebiasaan`,
        `Menganggap materi ${topic} hanya sebatas wacana tanpa landasan ajaran`,
        `Mencampuradukkan kaidah ${topic} dengan hal-hal yang tidak bersumber dari ajaran`,
      ],
      explIslamic: `Inti pokok dari materi ${topic} adalah memahami dan mengamalkan ajaran secara lurus sesuai syariat.`,
      qGeneral: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Berdasarkan materi "${topic}" pada mata pelajaran ${subject} (${gradeLevel}), apa definisi dasar dari konsep tersebut?`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Analisislah implikasi dan evaluasi mendalam dari penerapan teori "${topic}" pada ${subject} (${gradeLevel}) dalam konteks pemecahan masalah kompleks!`;
        }
        return `Soal #${num} [Tingkat Sedang]: Berdasarkan materi "${topic}" pada mata pelajaran ${subject} (${gradeLevel}), manakah pernyataan yang paling tepat mendefinisikan hubungan antar komponennya?`;
      },
      aGeneral: `Prinsip fundamental materi ${topic} dipahami secara sistematis sesuai konsep keilmuan yang valid`,
      distGeneral: [
        `Pernyataan yang bertolak belakang dengan kaidah ilmiah materi ${topic}`,
        `Asumsi perkiraan yang belum terbukti kebenarannya dalam konteks ${topic}`,
        `Penerapan konsep umum yang tidak memiliki kaitan langsung dengan ${topic}`,
      ],
      explGeneral: `Pemahaman konsep pokok yang sistematis dan teruji merupakan landasan utama materi ${topic}.`,
    },
    {
      aspect: "Ciri & Ketentuan Pokok",
      qIslamic: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Ciri utama pelaksanaan materi "${topic}" (${gradeLevel}) yang benar adalah...`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Evaluasilah perbedaan mendasar antara rukun, syarat sah, dan hal-hal yang membatalkan dalam materi "${topic}" (${gradeLevel})!`;
        }
        return `Soal #${num} [Tingkat Sedang]: Berkaitan dengan materi "${topic}" (${gradeLevel}), bagaimanakah keterkaitan kaidah dan ketentuan pelaksanaannya?`;
      },
      aIslamic: `Menjalankan setiap ketentuan ${topic} secara ikhlas, tertib, dan sesuai tuntunan`,
      distIslamic: [
        `Menjalankan ${topic} hanya ketika dilihat oleh orang lain (riya)`,
        `Mengubah tata cara pelaksanaan ${topic} tanpa dasar ilmu`,
        `Meremehkan syarat dan rukun yang berlaku pada ${topic}`,
      ],
      explIslamic: `Ketentuan pokok dalam ${topic} menuntut keikhlasan dan kesesuaian dengan tuntunan yang benar.`,
      qGeneral: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Ciri-ciri utama materi "${topic}" pada mata pelajaran ${subject} (${gradeLevel}) adalah...`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Evaluasilah variabel pembatas dan faktor kritis yang menentukan keberhasilan penerapan materi "${topic}" (${gradeLevel})!`;
        }
        return `Soal #${num} [Tingkat Sedang]: Karakteristik atau kaidah operasional yang menghubungkan komponen materi "${topic}" pada ${subject} (${gradeLevel}) adalah...`;
      },
      aGeneral: `Memiliki kaidah terukur dan komponen yang saling mendukung dalam materi ${topic}`,
      distGeneral: [
        `Tidak memiliki aturan baku dan sifatnya berubah-ubah secara acak`,
        `Hanya berlaku pada kasus terisolasi tanpa konsistensi konsep`,
        `Bertentangan dengan tujuan utama pembahasan ${topic}`,
      ],
      explGeneral: `Karakteristik utama materi ${topic} didasarkan pada kaidah yang konsisten dan terukur.`,
    },
    {
      aspect: "Penerapan & Contoh Kasus",
      qIslamic: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Contoh perbuatan yang sesuai dengan materi "${topic}" dalam kehidupan sehari-hari adalah...`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Jika dihadapkan pada dilema moral modern, bagaimanakah sintesis solusi berlandaskan materi "${topic}" (${gradeLevel})?`;
        }
        return `Soal #${num} [Tingkat Sedang]: Contoh penerapan hukum dan kaidah materi "${topic}" dalam menyelesaikan permasalahan sosial adalah...`;
      },
      aIslamic: `Menerapkan nilai-nilai luhur materi ${topic} dengan penuh tanggung jawab dan kejujuran`,
      distIslamic: [
        `Mengetahui teori ${topic} namun bersikap acuh tak acuh dalam perbuatan`,
        `Memanfaatkan pemahaman ${topic} untuk kepentingan pribadi yang merugikan sesama`,
        `Menolak penerapan ${topic} karena dianggap memberatkan`,
      ],
      explIslamic: `Penerapan nyata materi ${topic} tercermin dari akhlak mulia dan kejujuran dalam berbuat.`,
      qGeneral: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Contoh langsung penerapan materi "${topic}" dalam kehidupan nyata adalah...`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Suatu sistem mengalami anomali pada elemen "${topic}". Langkah pemecahan masalah (troubleshooting) analitis yang paling tepat adalah...`;
        }
        return `Soal #${num} [Tingkat Sedang]: Dalam penerapan praktis materi "${topic}" pada pembelajaran ${subject}, langkah analisis yang tepat adalah...`;
      },
      aGeneral: `Menganalisis data permasalahan secara teliti sesuai kaidah ${topic} sebelum mengambil keputusan`,
      distGeneral: [
        `Mengambil kesimpulan tergesa-gesa tanpa memperhatikan data konsep ${topic}`,
        `Mengabaikan variabel penting yang mempengaruhi hasil dalam ${topic}`,
        `Mengganti metode baku dengan perkiraan tanpa pengujian`,
      ],
      explGeneral: `Penerapan praktis ${topic} memerlukan analisis terstruktur agar hasil yang diperoleh akurat.`,
    },
    {
      aspect: "Manfaat & Hikmah",
      qIslamic: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Apa manfaat utama mempelajari materi "${topic}" bagi seorang muslim?`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Analisislah korelasi mendalam antara penghayatan materi "${topic}" dengan pembentukan peradaban masyarakat madani!`;
        }
        return `Soal #${num} [Tingkat Sedang]: Hikmah dan dampak positif dari penerapan konsisten materi "${topic}" dalam kehidupan adalah...`;
      },
      aIslamic: `Meningkatkan ketakwaan kepada Allah SWT serta mempererat ukhuwah dan kebaikan sesama`,
      distIslamic: [
        `Menumbuhkan rasa sombong dan merasa lebih mulia dari orang lain`,
        `Mendapatkan pujian dari manusia tanpa mengharap ridha Allah SWT`,
        `Mengabaikan kewajiban lain demi mencari keuntungan duniawi semata`,
      ],
      explIslamic: `Hikmah utama dari mempelajari ${topic} adalah meningkatkan ketakwaan dan memperkuat kebaikan hidup.`,
      qGeneral: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Keuntungan utama memahami materi "${topic}" adalah...`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Evaluasilah signifikansi penguasaan materi "${topic}" terhadap inovasi dan pengambilan keputusan strategis!`;
        }
        return `Soal #${num} [Tingkat Sedang]: Manfaat utama dari penguasaan konsep dan hukum kaidah materi "${topic}" adalah...`;
      },
      aGeneral: `Mampu memecahkan persoalan secara logis, kritis, dan solutif berdasarkan prinsip ${topic}`,
      distGeneral: [
        `Menghindari proses berpikir kritis dan mengandalkan hafalan semata`,
        `Membatasi kemampuan eksplorasi dalam menyelesaikan masalah terkait ${topic}`,
        `Menghasilkan kesimpulan yang rancu dan tidak dapat dipertanggungjawabkan`,
      ],
      explGeneral: `Penguasaan materi ${topic} melatih daya nalar logis dan pemecahan masalah secara terstruktur.`,
    },
    {
      aspect: "Evaluasi & Analisis",
      qIslamic: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Bagaimana sikap yang baik saat mempelajari materi "${topic}"?`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Kritisi dan analisislah berbagai pandangan fikih/ijtihad seputar persoalan kontemporer pada materi "${topic}"!`;
        }
        return `Soal #${num} [Tingkat Sedang]: Jika terjadi perbedaan pandangan dalam memahami materi "${topic}", sikap terbaik yang dikedepankan adalah...`;
      },
      aIslamic: `Merujuk kembali pada Al-Qur'an, Hadits, serta bimbingan para ulama yang terpercaya dengan lapang dada`,
      distIslamic: [
        `Memaksakan pendapat pribadi dan mencela pendapat pihak lain`,
        `Meninggalkan pembelajaran ${topic} karena merasa rumit`,
        `Mengikuti opini yang paling populer tanpa memeriksa keabsahan dalilnya`,
      ],
      explIslamic: `Sikap bijak dalam ${topic} adalah mengembalikan persoalan pada sumber rujukan utama dengan tasamuh.`,
      qGeneral: (num: number) => {
        if (diff === "Mudah") {
          return `Soal #${num} [Tingkat Mudah]: Tanda siswa telah memahami materi "${topic}" dengan baik adalah...`;
        } else if (diff === "Sulit") {
          return `Soal #${num} [Tingkat Sulit - HOTS]: Dari data pengujian atau eksperimen materi "${topic}", manakah kesimpulan evaluatif yang paling valid dan reliabel?`;
        }
        return `Soal #${num} [Tingkat Sedang]: Berdasarkan evaluasi pembelajaran pada materi "${topic}", indikator ketercapaian pemahaman siswa ditunjukkan oleh...`;
      },
      aGeneral: `Kemampuan menjelaskan kembali prinsip inti ${topic} serta menyelesaikan soal analisis dengan benar`,
      distGeneral: [
        `Hanya mampu menghafal istilah tanpa memahami makna konsep ${topic}`,
        `Ketidakmampuan menghubungkan konsep ${topic} dengan fenomena yang relevan`,
        `Sering membuat kekeliruan mendasar dalam mengidentifikasi komponen ${topic}`,
      ],
      explGeneral: `Ketercapaian materi ${topic} dibuktikan oleh pemahaman konseptual yang kokoh dan kemampuan analisis.`,
    },
  ];

  for (let i = 1; i <= total; i++) {
    const angle = angles[(i - 1) % angles.length];
    const qText = isIslamic ? angle.qIslamic(i) : angle.qGeneral(i);
    const correctAns = isIslamic ? angle.aIslamic : angle.aGeneral;
    const rawDistractors = isIslamic ? angle.distIslamic : angle.distGeneral;
    const expl = isIslamic ? angle.explIslamic : angle.explGeneral;

    // Create shuffled 4 options
    const allOptTexts = [correctAns, ...rawDistractors].sort(() => Math.random() - 0.5);
    const options = allOptTexts.map((txt, idx) => ({
      option_letter: String.fromCharCode(65 + idx),
      option_text: txt,
      is_correct: txt === correctAns,
    }));

    list.push({
      question_number: i,
      question_text: qText,
      options: options,
      explanation: expl,
    });
  }

  return {
    cbt_metadata: {
      teacher_name: teacherName || "Guru Mata Pelajaran",
      subject: subject,
      grade_level: gradeLevel,
      total_questions: total,
    },
    questions: list,
  };
}

  // Comprehensive Quran Surahs database for accurate synchronization across all game modes
  const QURAN_VERSES_DB: Record<string, { surahNum: number; surahName: string; verses: { ayah: number; ar: string; id: string; next?: string }[] }> = {
    "al-fatihah": {
      surahNum: 1,
      surahName: "Al-Fatihah",
      verses: [
        { ayah: 1, ar: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", id: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.", next: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
        { ayah: 2, ar: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", id: "Segala puji bagi Allah, Tuhan seluruh alam.", next: "الرَّحْمَٰنِ الرَّحِيمِ" },
        { ayah: 3, ar: "الرَّحْمَٰنِ الرَّحِيمِ", id: "Yang Maha Pengasih, Maha Penyayang.", next: "مَالِكِ يَوْمِ الدِّينِ" },
        { ayah: 4, ar: "مَالِكِ يَوْمِ الدِّينِ", id: "Pemilik hari pembalasan.", next: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
        { ayah: 5, ar: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", id: "Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami memohon pertolongan.", next: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
        { ayah: 6, ar: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", id: "Tunjukilah kami jalan yang lurus.", next: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ" },
        { ayah: 7, ar: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", id: "(yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat." }
      ]
    },
    "an-nas": {
      surahNum: 114,
      surahName: "An-Nas",
      verses: [
        { ayah: 1, ar: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ", id: "Katakanlah: Aku berlindung kepada Tuhannya manusia.", next: "مَلِكِ النَّاسِ" },
        { ayah: 2, ar: "مَلِكِ النَّاسِ", id: "Raja manusia.", next: "إِلَٰهِ النَّاسِ" },
        { ayah: 3, ar: "إِلَٰهِ النَّاسِ", id: "Sembahan manusia.", next: "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ" },
        { ayah: 4, ar: "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ", id: "Dari kejahatan (bisikan) setan yang bersembunyi.", next: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ" },
        { ayah: 5, ar: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ", id: "Yang membisikkan (kejahatan) ke dalam dada manusia.", next: "مِنَ الْجِنَّةِ وَالنَّاسِ" },
        { ayah: 6, ar: "مِنَ الْجِنَّةِ وَالنَّاسِ", id: "Dari (golongan) jin dan manusia." }
      ]
    },
    "al-falaq": {
      surahNum: 113,
      surahName: "Al-Falaq",
      verses: [
        { ayah: 1, ar: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", id: "Katakanlah: Aku berlindung kepada Tuhan yang menguasai subuh (fajar).", next: "مِنْ شَرِّ مَا خَلَقَ" },
        { ayah: 2, ar: "مِنْ شَرِّ مَا خَلَقَ", id: "Dari kejahatan makhluk yang Dia ciptakan.", next: "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
        { ayah: 3, ar: "وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ", id: "Dan dari kejahatan malam apabila telah gelap gulita.", next: "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ" },
        { ayah: 4, ar: "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ", id: "Dan dari kejahatan wanita-wanita penyihir yang meniup pada buhul-buhul (talinya).", next: "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ" },
        { ayah: 5, ar: "وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ", id: "Dan dari kejahatan orang yang dengki apabila dia dengki." }
      ]
    },
    "al-ikhlas": {
      surahNum: 112,
      surahName: "Al-Ikhlas",
      verses: [
        { ayah: 1, ar: "قُلْ هُوَ اللَّهُ أَحَدٌ", id: "Katakanlah (Muhammad): Dialah Allah, Yang Maha Esa.", next: "اللَّهُ الصَّمَدُ" },
        { ayah: 2, ar: "اللَّهُ الصَّمَدُ", id: "Allah tempat meminta segala sesuatu.", next: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
        { ayah: 3, ar: "لَمْ يَلِدْ وَلَمْ يُولَدْ", id: "Dia tidak beranak dan tidak pula diperanakkan.", next: "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ" },
        { ayah: 4, ar: "وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ", id: "Dan tidak ada seorang pun yang setara dengan Dia." }
      ]
    },
    "al-lahab": {
      surahNum: 111,
      surahName: "Al-Lahab",
      verses: [
        { ayah: 1, ar: "تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ", id: "Binasalah kedua tangan Abu Lahab dan benar-benar binasa dia.", next: "مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ" },
        { ayah: 2, ar: "مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ", id: "Tidaklah berguna baginya hartanya dan apa yang dia usahakan.", next: "سَيَصْلَىٰ نَارًا ذَاتَ لَهَبٍ" },
        { ayah: 3, ar: "سَيَصْلَىٰ نَارًا ذَاتَ لَهَبٍ", id: "Kelak dia akan masuk ke dalam api yang bergejolak (neraka).", next: "وَامْرَأَتُهُ حَمَّالَةَ الْحَطَبِ" }
      ]
    },
    "an-nasr": {
      surahNum: 110,
      surahName: "An-Nasr",
      verses: [
        { ayah: 1, ar: "إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ", id: "Apabila telah datang pertolongan Allah dan kemenangan.", next: "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا" },
        { ayah: 2, ar: "وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا", id: "Dan engkau melihat manusia berbondong-bondong masuk agama Allah.", next: "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ" },
        { ayah: 3, ar: "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ ۚ إِنَّهُ كَانَ تَوَّابًا", id: "Maka bertasbihlah dengan memuji Tuhanmu dan mohonlah ampunan kepada-Nya." }
      ]
    },
    "al-kafirun": {
      surahNum: 109,
      surahName: "Al-Kafirun",
      verses: [
        { ayah: 1, ar: "قُلْ يَا أَيُّهَا الْكَافِرُونَ", id: "Katakanlah (Muhammad): Wahai orang-orang kafir!", next: "لَا أَعْبُدُ مَا تَعْبُدُونَ" },
        { ayah: 2, ar: "لَا أَعْبُدُ مَا تَعْبُدُونَ", id: "Aku tidak akan menyembah apa yang kamu sembah.", next: "وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ" },
        { ayah: 3, ar: "وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ", id: "Dan kamu bukan penyembah apa yang aku sembah.", next: "وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ" },
        { ayah: 6, ar: "لَكُمْ دِينُكُمْ وَلِيَ دِينِ", id: "Untukmu agamamu, dan untukku agamaku." }
      ]
    },
    "al-kautsar": {
      surahNum: 108,
      surahName: "Al-Kautsar",
      verses: [
        { ayah: 1, ar: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ", id: "Sungguh, Kami telah memberimu (Muhammad) nikmat yang banyak.", next: "فَصَلِّ لِرَبِّكَ وَانْحَرْ" },
        { ayah: 2, ar: "فَصَلِّ لِرَبِّكَ وَانْحَرْ", id: "Maka laksanakanlah sholat karena Tuhanmu, dan berkurbanlah.", next: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ" },
        { ayah: 3, ar: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ", id: "Sungguh, orang yang membencimu dialah yang terputus (dari rahmat Allah)." }
      ]
    },
    "al-maun": {
      surahNum: 107,
      surahName: "Al-Ma'un",
      verses: [
        { ayah: 1, ar: "أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ", id: "Tahukah kamu (orang) yang mendustakan agama?", next: "فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ" },
        { ayah: 2, ar: "فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ", id: "Maka itulah orang yang menghardik anak yatim.", next: "وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ" },
        { ayah: 3, ar: "وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ", id: "Dan tidak mendorong memberi makan orang miskin." }
      ]
    },
    "quraisy": {
      surahNum: 106,
      surahName: "Quraisy",
      verses: [
        { ayah: 1, ar: "لِإِيلَافِ قُرَيْشٍ", id: "Karena kebiasaan orang-orang Quraisy.", next: "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ" },
        { ayah: 2, ar: "إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ", id: "(yaitu) kebiasaan mereka bepergian pada musim dingin dan musim panas.", next: "فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ" },
        { ayah: 3, ar: "فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ", id: "Maka hendaklah mereka menyembah Tuhan (pemilik) rumah ini (Ka'bah).", next: "الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ" }
      ]
    },
    "al-fil": {
      surahNum: 105,
      surahName: "Al-Fil",
      verses: [
        { ayah: 1, ar: "أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ", id: "Tidakkah engkau perhatikan bagaimana Tuhanmu telah bertindak terhadap pasukan bergajah?", next: "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ" },
        { ayah: 2, ar: "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ", id: "Bukankah Dia telah menjadikan tipu daya mereka itu sia-sia?", next: "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ" },
        { ayah: 3, ar: "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ", id: "Dan Dia mengirimkan kepada mereka burung yang berbondong-bondong." }
      ]
    },
    "al-asr": {
      surahNum: 103,
      surahName: "Al-'Asr",
      verses: [
        { ayah: 1, ar: "وَالْعَصْرِ", id: "Demi masa.", next: "إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ" },
        { ayah: 2, ar: "إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ", id: "Sungguh, manusia berada dalam kerugian.", next: "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ" },
        { ayah: 3, ar: "إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ", id: "Kecuali orang-orang yang beriman dan mengerjakan kebajikan serta saling menasihati untuk kebenaran dan kesabaran." }
      ]
    },
    "al-qadr": {
      surahNum: 97,
      surahName: "Al-Qadr",
      verses: [
        { ayah: 1, ar: "إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ", id: "Sesungguhnya Kami telah menurunkannya (Al-Qur'an) pada malam kemuliaan.", next: "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ" },
        { ayah: 2, ar: "وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ", id: "Dan tahukah kamu apakah malam kemuliaan itu?", next: "لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ" },
        { ayah: 3, ar: "لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ", id: "Malam kemuliaan itu lebih baik daripada seribu bulan." }
      ]
    },
    "at-tin": {
      surahNum: 95,
      surahName: "At-Tin",
      verses: [
        { ayah: 1, ar: "وَالتِّينِ وَالزَّيْتُونِ", id: "Demi buah Tin dan buah Zaitun.", next: "وَطُورِ سِينِينَ" },
        { ayah: 2, ar: "وَطُورِ سِينِينَ", id: "Dan demi bukit Sinai.", next: "وَهَٰذَا الْبَلَدِ الْأَمِينِ" },
        { ayah: 4, ar: "لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي أَحْسَنِ تَقْوِيمٍ", id: "Sungguh, Kami telah menciptakan manusia dalam bentuk yang sebaik-baiknya." }
      ]
    },
    "al-insyirah": {
      surahNum: 94,
      surahName: "Al-Insyirah",
      verses: [
        { ayah: 1, ar: "أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ", id: "Bukankah Kami telah melapangkan dadamu (Muhammad)?", next: "وَوَضَعْنَا عَنْكَ وِزْرَكَ" },
        { ayah: 5, ar: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", id: "Maka sesungguhnya beserta kesulitan ada kemudahan.", next: "إِنَّ مَعَ الْعُسْرِ يُسْرًا" },
        { ayah: 6, ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", id: "Sesungguhnya beserta kesulitan itu ada kemudahan." }
      ]
    },
    "ad-duha": {
      surahNum: 93,
      surahName: "Ad-Duha",
      verses: [
        { ayah: 1, ar: "وَالضُّحَىٰ", id: "Demi waktu duha (ketika matahari naik sepenggalah).", next: "وَاللَّيْلِ إِذَا سَجَىٰ" },
        { ayah: 2, ar: "وَاللَّيْلِ إِذَا سَجَىٰ", id: "Dan demi malam apabila telah sunyi.", next: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ" }
      ]
    }
  };

  function findQuranSurah(topicText: string) {
    const lower = (topicText || "").toLowerCase();
    for (const key of Object.keys(QURAN_VERSES_DB)) {
      const s = QURAN_VERSES_DB[key];
      const cleanKey = key.replace(/-/g, "").replace(/'/g, "");
      const cleanSub = lower.replace(/-/g, "").replace(/'/g, "");
      if (cleanSub.includes(cleanKey) || cleanSub.includes(s.surahName.toLowerCase())) {
        return s;
      }
    }
    return QURAN_VERSES_DB["al-ikhlas"];
  }

  // Helper function to build intelligent dynamic game items
  function generateDynamicFallbackGameItems(gameType: string, mapelName: string, surahOrTopic: string, gradeLevel: string, count: number, difficultyDesc: string, difficulty: string = "Sedang") {
    const items = [];
    const topic = (surahOrTopic || mapelName).trim();
    const lowerSub = mapelName.toLowerCase();
    const isIslamic = lowerSub.includes("pai") || lowerSub.includes("agama") || lowerSub.includes("qur") || lowerSub.includes("hadits") || lowerSub.includes("fiqih") || lowerSub.includes("arab") || lowerSub.includes("ski") || lowerSub.includes("akidah");

    const activeSurah = isIslamic ? findQuranSurah(topic) : null;

    for (let i = 0; i < count; i++) {
      const num = i + 1;
      const itemId = `server-game-${gameType}-${Date.now()}-${i}`;

      if (isIslamic && activeSurah) {
        const verseIdx = i % activeSurah.verses.length;
        const currentVerse = activeSurah.verses[verseIdx];
        const nextVerseAr = currentVerse.next || activeSurah.verses[(verseIdx + 1) % activeSurah.verses.length].ar;

        if (gameType === "sambung-ayat") {
          const prompt = `Lanjutkan potongan ayat berikut dari Surat ${activeSurah.surahName} (Soal #${num}):`;
          const correct = nextVerseAr;
          const distractors = [
            "مِنْ شَرِّ مَا خَلَقَ",
            "اللَّهُ الصَّمَدُ",
            "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ"
          ].filter(d => d !== correct).slice(0, 3);
          const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            surah_number: activeSurah.surahNum,
            ayah_number: currentVerse.ayah,
            prompt_text: prompt,
            arabic_text: currentVerse.ar,
            translation: currentVerse.id,
            options: allOpts,
            correct_answer: correct,
            explanation: `Lanjutan bacaan yang benar setelah ayat ke-${currentVerse.ayah} ("${currentVerse.ar}") adalah "${correct}".`,
          });
        } else if (gameType === "melengkapi-ayat") {
          const words = currentVerse.ar.split(" ");
          const missingWord = words.length > 1 ? words[words.length - 1] : currentVerse.ar;
          const maskedVerse = words.length > 1 ? words.slice(0, -1).join(" ") + " (...)" : "(...)";
          const correct = missingWord;
          const distractors = ["الْعَالَمِينَ", "نَسْتَعِينُ", "الْمُسْتَقِيمَ", "الصَّمَدُ"].filter(w => w !== correct).slice(0, 3);
          const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            surah_number: activeSurah.surahNum,
            ayah_number: currentVerse.ayah,
            prompt_text: `Lengkapi kata yang rumpang (...) pada ayat berikut dari Surat ${activeSurah.surahName} (Soal #${num}):`,
            arabic_text: maskedVerse,
            translation: currentVerse.id,
            options: allOpts,
            correct_answer: correct,
            explanation: `Lafaz penyempurna ayat ke-${currentVerse.ayah} Surat ${activeSurah.surahName} adalah "${correct}".`,
          });
        } else if (gameType === "tebak-surat") {
          const prompt = `Tentukan nama surat dari lafaz ayat berikut (Soal #${num}):`;
          const correct = `Surat ${activeSurah.surahName}`;
          const allSurahNames = Object.values(QURAN_VERSES_DB).map(s => `Surat ${s.surahName}`).filter(n => n !== correct);
          const distractors = allSurahNames.sort(() => Math.random() - 0.5).slice(0, 3);
          const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            surah_number: activeSurah.surahNum,
            ayah_number: currentVerse.ayah,
            prompt_text: prompt,
            arabic_text: currentVerse.ar,
            translation: currentVerse.id,
            options: allOpts,
            correct_answer: correct,
            explanation: `Lafaz "${currentVerse.ar}" merupakan ayat ke-${currentVerse.ayah} dari ${correct}.`,
          });
        } else if (gameType === "tebak-nomor-ayat") {
          const prompt = `Ayat ke berapakah lafaz berikut dalam Surat ${activeSurah.surahName}? (Soal #${num}):`;
          const correct = `Ayat ke-${currentVerse.ayah}`;
          const distractors = [
            `Ayat ke-${currentVerse.ayah + 1}`,
            `Ayat ke-${Math.max(1, currentVerse.ayah - 1)}`,
            `Ayat ke-${currentVerse.ayah + 2}`
          ].filter(d => d !== correct).slice(0, 3);
          const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            surah_number: activeSurah.surahNum,
            ayah_number: currentVerse.ayah,
            prompt_text: prompt,
            arabic_text: currentVerse.ar,
            options: allOpts,
            correct_answer: correct,
            explanation: `Lafaz "${currentVerse.ar}" adalah ayat ke-${currentVerse.ayah} dari Surat ${activeSurah.surahName}.`,
          });
        } else if (gameType === "tebak-audio") {
          // 100% Guaranteed Audio & Question & Answer Synchronization
          const questionSubtype = i % 4;
          let prompt = "";
          let correct = "";
          let distractors: string[] = [];

          if (questionSubtype === 0) {
            prompt = `Dengarkan lantunan audio murottal berikut! Tentukan surat dan nomor ayat dari bacaan tersebut (Soal #${num}):`;
            correct = `Surat ${activeSurah.surahName} ayat ${currentVerse.ayah}`;
            distractors = [
              `Surat ${activeSurah.surahName} ayat ${currentVerse.ayah + 1}`,
              `Surat Al-Falaq ayat ${currentVerse.ayah}`,
              `Surat An-Nas ayat ${currentVerse.ayah}`
            ].filter(d => d !== correct).slice(0, 3);
          } else if (questionSubtype === 1) {
            prompt = `Dengarkan audio bacaan ayat berikut! Apakah arti terjemahan dari ayat yang dilantunkan tersebut? (Soal #${num}):`;
            correct = currentVerse.id;
            distractors = [
              "Hanya kepada Engkaulah kami menyembah dan memohon pertolongan",
              "Katakanlah: Dialah Allah, Yang Maha Esa",
              "Binasalah kedua tangan Abu Lahab dan benar-benar binasa",
              "Katakanlah: Aku berlindung kepada Tuhan yang menguasai subuh"
            ].filter(d => d !== correct).slice(0, 3);
          } else if (questionSubtype === 2) {
            prompt = `Dengarkan audio potongan ayat berikut! Manakah lafaz yang menjadi sambungan dari bacaan tersebut? (Soal #${num}):`;
            correct = nextVerseAr;
            distractors = [
              "مِنْ شَرِّ مَا خَلَقَ",
              "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
              "اللَّهُ الصَّمَدُ",
              "مَلِكِ النَّاسِ"
            ].filter(d => d !== correct).slice(0, 3);
          } else {
            prompt = `Dengarkan lantunan ayat berikut dari Surat ${activeSurah.surahName}! Ayat ke berapakah bacaan tersebut? (Soal #${num}):`;
            correct = `Ayat ke-${currentVerse.ayah}`;
            distractors = [
              `Ayat ke-${currentVerse.ayah + 1}`,
              `Ayat ke-${Math.max(1, currentVerse.ayah - 1)}`,
              `Ayat ke-${currentVerse.ayah + 2}`
            ].filter(d => d !== correct).slice(0, 3);
          }

          const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            surah_number: activeSurah.surahNum,
            ayah_number: currentVerse.ayah,
            prompt_text: prompt,
            arabic_text: currentVerse.ar,
            audio_text: currentVerse.ar,
            translation: currentVerse.id,
            options: allOpts,
            correct_answer: correct,
            explanation: `Audio melantunkan Surat ${activeSurah.surahName} ayat ke-${currentVerse.ayah}: "${currentVerse.ar}" yang artinya: "${currentVerse.id}".`,
          });
        } else if (gameType === "puzzle-ayat") {
          const pieces = currentVerse.ar.split(" ").filter(Boolean);
          const shuffledPieces = [...pieces].sort(() => Math.random() - 0.5);

          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            surah_number: activeSurah.surahNum,
            ayah_number: currentVerse.ayah,
            prompt_text: `Susunlah potongan kata berikut menjadi ayat yang benar dari Surat ${activeSurah.surahName} ayat ke-${currentVerse.ayah} (Soal #${num}):`,
            arabic_text: currentVerse.ar,
            translation: currentVerse.id,
            puzzle_pieces: shuffledPieces,
            correct_order: pieces,
            options: [currentVerse.ar, "Opsi Susunan Pengecoh A", "Opsi Susunan Pengecoh B", "Opsi Susunan Pengecoh C"].sort(() => Math.random() - 0.5),
            correct_answer: currentVerse.ar,
            explanation: `Susunan ayat yang benar adalah: ${currentVerse.ar}.`,
          });
        } else {
          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            surah_number: activeSurah.surahNum,
            ayah_number: currentVerse.ayah,
            prompt_text: `Berdasarkan Surat ${activeSurah.surahName} ayat ke-${currentVerse.ayah}, apakah makna pokok dari bacaan "${currentVerse.ar}"?`,
            arabic_text: currentVerse.ar,
            translation: currentVerse.id,
            options: [currentVerse.id, "Pernyataan yang kurang tepat A", "Pernyataan yang kurang tepat B", "Pernyataan yang kurang tepat C"].sort(() => Math.random() - 0.5),
            correct_answer: currentVerse.id,
            explanation: `Arti ayat ke-${currentVerse.ayah} Surat ${activeSurah.surahName} adalah "${currentVerse.id}".`,
          });
        }
      } else {
        // GENERAL SUBJECTS (Mapel Umum: IPA, IPS, MTK, B. Indo, B. Inggris, dll.)
        if (gameType === "tebak-audio") {
          const audioNarratives = [
            {
              audio: `Materi pokok ${topic} memiliki prinsip dasar bahwa setiap komponen saling berhubungan untuk mencapai fungsi optimal dan terstruktur.`,
              q: `Dengarkan rekaman narasi audio berikut dengan teliti! Berdasarkan narasi audio yang Anda dengarkan, bagaimanakah hubungan antar komponen pada materi "${topic}"?`,
              ans: `Setiap komponen saling berhubungan untuk mencapai fungsi optimal dan terstruktur`,
              dist: [
                `Komponen berdiri sendiri tanpa ada kaitan fungsional`,
                `Hubungan antar komponen bersifat acak dan tidak teratur`,
                `Tidak memerlukan keterikatan antar elemen materi`
              ]
            },
            {
              audio: `Dalam penerapan ${topic}, langkah identifikasi data dan pengujian kaidah secara teliti merupakan kunci utama untuk menghasilkan analisis yang akurat.`,
              q: `Simak audio rekaman berikut! Berdasarkan narasi yang diperdengarkan, apa kunci utama untuk menghasilkan analisis yang akurat pada "${topic}"?`,
              ans: `Identifikasi data dan pengujian kaidah secara teliti`,
              dist: [
                `Mengabaikan data sekunder dalam pengujian`,
                `Mengambil kesimpulan cepat tanpa verifikasi kaidah`,
                `Menghindari proses analisis data secara bertahap`
              ]
            },
            {
              audio: `Ciri utama yang membedakan konsep ${topic} adalah adanya keteraturan pola dan mekanisme kerja terstandarisasi yang dapat diuji kebenarannya.`,
              q: `Dengarkan narasi audio berikut! Menurut audio tersebut, apa karakteristik utama yang membedakan konsep "${topic}"?`,
              ans: `Adanya keteraturan pola dan mekanisme kerja terstandarisasi yang dapat diuji`,
              dist: [
                `Ketiadaan standar operasional baku`,
                `Sifatnya yang selalu berubah tanpa pola yang jelas`,
                `Hanya bergantung pada perkiraan intuitif semata`
              ]
            },
            {
              audio: `Penguasaan materi ${topic} memberikan manfaat penting dalam melatih kemampuan pemecahan masalah kritis dan pengambilan keputusan ilmiah.`,
              q: `Dengarkan rekaman audio berikut! Apa manfaat utama dari penguasaan materi "${topic}" menurut isi audio?`,
              ans: `Melatih kemampuan pemecahan masalah kritis dan pengambilan keputusan ilmiah`,
              dist: [
                `Membatasi wawasan berpikir logis peserta didik`,
                `Menghindari keterlibatan dalam proses pemikiran kritis`,
                `Mengutamakan hafalan tanpa memahami makna materi`
              ]
            }
          ];

          const currentNarration = audioNarratives[i % audioNarratives.length];
          const allOpts = [currentNarration.ans, ...currentNarration.dist].sort(() => Math.random() - 0.5);

          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            prompt_text: currentNarration.q,
            audio_text: currentNarration.audio,
            options: allOpts,
            correct_answer: currentNarration.ans,
            explanation: `Berdasarkan narasi audio yang didengar, jawaban yang tepat adalah: "${currentNarration.ans}".`,
          });
        } else {
          const qText = `Berdasarkan materi "${topic}" (${gradeLevel}), manakah pernyataan yang paling tepat mendefinisikan konsep pokoknya? (Soal #${num}):`;
          const correct = `Prinsip fundamental materi ${topic} dipahami secara sistematis sesuai konsep keilmuan yang valid`;
          const distractors = [
            `Pernyataan yang bertolak belakang dengan kaidah ilmiah materi ${topic}`,
            `Asumsi yang belum terbukti kebenarannya dalam konteks ${topic}`,
            `Pendapat umum yang tidak memiliki dasar konsep ${topic}`
          ];
          const allOpts = [correct, ...distractors].sort(() => Math.random() - 0.5);

          items.push({
            id: itemId,
            category: gameType,
            subject_name: mapelName,
            difficulty: difficulty,
            prompt_text: qText,
            options: allOpts,
            correct_answer: correct,
            explanation: `Konsep pokok materi ${topic} didasarkan pada prinsip keilmuan yang teruji.`,
          });
        }
      }
    }

    return {
      game_title: `Game Edukasi: ${topic} (${mapelName})`,
      game_type: gameType,
      subject_name: mapelName,
      items: items,
    };
  }

// API Endpoint for generating CBT questions using Gemini AI
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { teacherName, subject, gradeLevel, classRoom, totalQuestions, topic, difficulty } = req.body;

    if (!subject || !gradeLevel || !topic) {
      return res.status(400).json({
        error: "Data mata pelajaran, jenjang, dan materi wajib diisi.",
      });
    }

    const selectedDifficulty = (difficulty === "Mudah" || difficulty === "Sulit") ? difficulty : "Sedang";
    const numQuestions = Math.max(1, Math.min(100, parseInt(totalQuestions, 10) || 5));
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY tidak ada di server. Menggunakan generator cerdas.");
      const fallbackData = generateDynamicFallbackQuestions(subject, gradeLevel, topic, numQuestions, teacherName, selectedDifficulty);
      return res.json({
        success: true,
        isFallback: true,
        data: fallbackData,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const cbtResponseSchema = {
      type: Type.OBJECT,
      properties: {
        cbt_metadata: {
          type: Type.OBJECT,
          properties: {
            teacher_name: { type: Type.STRING },
            subject: { type: Type.STRING },
            grade_level: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            total_questions: { type: Type.INTEGER },
          },
          required: ["subject", "grade_level", "total_questions"],
        },
        questions: {
          type: Type.ARRAY,
          description: "Daftar soal kuis pilihan ganda lengkap",
          items: {
            type: Type.OBJECT,
            properties: {
              question_number: { type: Type.INTEGER },
              question_text: {
                type: Type.STRING,
                description: "Teks pertanyaan lengkap secara detail. DILARANG HANYA MENGISI DENGAN NAMA JUDUL MATERI!",
              },
              options: {
                type: Type.ARRAY,
                description: "Array berisi 4 pilihan jawaban",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    option_letter: { type: Type.STRING },
                    option_text: { type: Type.STRING },
                    is_correct: { type: Type.BOOLEAN },
                  },
                  required: ["option_letter", "option_text", "is_correct"],
                },
              },
              explanation: {
                type: Type.STRING,
                description: "Penjelasan atau pembahasan singkat mengenai alasan jawaban yang benar",
              },
            },
            required: ["question_number", "question_text", "options", "explanation"],
          },
        },
      },
      required: ["cbt_metadata", "questions"],
    };

    const prompt = `Anda adalah pakar pembuat soal ujian CBT (Computer-Based Test) sekolah di Indonesia.
Buatkan ${numQuestions} butir soal pilihan ganda berkualitas tinggi, orisinil, dan sangat mendidik berdasarkan parameter berikut:
- Nama Guru: ${teacherName || "Guru Mata Pelajaran"}
- Mata Pelajaran: ${subject}
- Jenjang Pendidikan: ${gradeLevel} (SD / MI / SMP / MTs / SMA / MA / SMK)
- Kelas: ${classRoom || "-"}
- Tingkat Kesulitan: ${selectedDifficulty}
- Jumlah Soal: ${numQuestions} butir
- Materi / Topik Soal: "${topic}"

MATRIKS SINKRONISASI TINGKATAN / JENJANG PENDIDIKAN & KESULITAN (WAJIB DITERAPKAN DENGAN KETAT):
1. JIKA TINGKAT KESULITAN = "Mudah" (Untuk Jenjang ${gradeLevel}):
   - Soal disusun berupa pertanyaan lugas dan langsung menguji pemahaman dasar/definisi dengan pilihan jawaban yang jelas.
   - Menggunakan bahasa yang ringkas, jelas, dan fokus pada fakta kunci atau istilah dasar dari materi "${topic}".
2. JIKA TINGKAT KESULITAN = "Sedang" (Untuk Jenjang ${gradeLevel}):
   - Soal menguji pemahaman konsep, hukum kaidah, aturan tata cara, dan korelasi antar komponen materi "${topic}".
   - Pilihan pengecoh logis dan menuntut penalaran prosedural atau pemahaman sebab-akibat.
3. JIKA TINGKAT KESULITAN = "Sulit" (Untuk Jenjang ${gradeLevel}):
   - Soal penalaran analitis (HOTS), evaluasi kasus kritis, pemecahan masalah (problem solving), dan sintesis konsep materi "${topic}".
   - Menghadirkan studi kasus atau skenario kontekstual yang menantang daya nalar tinggi peserta didik.

ATURAN STRUKTUR & KUALITAS SOAL (SANGAT KETAT & WAJIB DIPATUHI):
1. FOKUS 100% PADA MATERI/TOPIK: Seluruh ${numQuestions} pertanyaan, pilihan jawaban (A-D), dan penjelasan WAJIB MURNI MEMBAHAS materi "${topic}". Dilarang keras keluar konteks atau mencampuradukkan materi yang tidak relevan!
2. SINKRONISASI PERTANYAAN DENGAN PILIHAN JAWABAN:
   - "question_text" HARUS BERUPA KALIMAT PERTANYAAN/KASUS LENGKAP SECARA TUNTAS. DILARANG HANYA MENULIS JUDUL TOPIK!
   - 4 Opsi Jawaban (A, B, C, D) harus memiliki struktur gramatikal yang setara, logis, dan secara langsung menjawab pertanyaan yang diajukan.
   - Tepat SATU pilihan yang benar ("is_correct": true). 3 pilihan lainnya ("is_correct": false) harus merupakan opsi pengecoh yang masuk akal dan relevan dengan materi "${topic}".
3. ISOLASI MATA PELAJARAN:
   - Jika mata pelajaran adalah Mapel Agama/PAI/Al-Qur'an: Fokuskan pada dalil, ayat, tajwid, arti, asbabun nuzul, dan pengamalan materi "${topic}".
   - Jika mata pelajaran adalah Mapel Umum (Matematika, IPA, Bahasa Indonesia, Bahasa Inggris, IPS, PKn, PJOK, dll.): DILARANG KERAS menyisipkan teks Arab, ayat Al-Qur'an, atau nama surat.
4. PEMBAHASAN: Sertakan uraian penjelasan singkat, mendidik, dan informatif pada field "explanation".`;

    // Official supported Gemini models in high-availability order
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];
    let parsedData: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: cbtResponseSchema,
            temperature: 0.7,
          },
        });
        if (response && response.text) {
          let cleanedJson = response.text.trim();
          if (cleanedJson.startsWith("```json")) {
            cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "").trim();
          } else if (cleanedJson.startsWith("```")) {
            cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "").trim();
          }
          parsedData = JSON.parse(cleanedJson);
          if (parsedData && Array.isArray(parsedData.questions) && parsedData.questions.length > 0) {
            break;
          }
        }
      } catch {
        // Model temporarily unavailable (503/429) - seamlessly failover to next candidate
      }
    }

    if (!parsedData) {
      const fallbackData = generateDynamicFallbackQuestions(subject, gradeLevel, topic, numQuestions, teacherName, selectedDifficulty);
      return res.json({
        success: true,
        isFallback: true,
        data: fallbackData,
      });
    }

    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error generating CBT questions:", err);
    const selectedDifficulty = (req.body?.difficulty === "Mudah" || req.body?.difficulty === "Sulit") ? req.body.difficulty : "Sedang";
    const fallbackData = generateDynamicFallbackQuestions(
      req.body?.subject || "Umum",
      req.body?.gradeLevel || "SD / MI",
      req.body?.topic || "Latihan",
      parseInt(req.body?.totalQuestions, 10) || 5,
      req.body?.teacherName,
      selectedDifficulty
    );
    return res.json({ success: true, isFallback: true, data: fallbackData });
  }
});

// API Endpoint for generating AI Game content using Gemini
app.post("/api/generate-game", async (req, res) => {
  try {
    const { gameType, surahOrTopic, gradeLevel, totalItems, difficulty, subjectName } = req.body;
    const count = Math.max(1, Math.min(100, parseInt(totalItems, 10) || 5));
    const selectedDifficulty = difficulty || "Sedang";
    const mapelName = subjectName || "Pendidikan Agama Islam (PAI)";
    const apiKey = process.env.GEMINI_API_KEY;

    let difficultyDesc = "Sedang (Soal tingkat menengah, pemahaman materi & konsep)";
    if (selectedDifficulty === "Mudah") {
      difficultyDesc = "Mudah (Soal dasar, pilihan jawaban sangat mudah dibedakan & ramah untuk pemula)";
    } else if (selectedDifficulty === "Sulit") {
      difficultyDesc = "Sulit (Soal penalaran mendalam, analisis komprehensif & pengecoh yang tajam)";
    }

    if (!apiKey) {
      console.warn("GEMINI_API_KEY tidak ada di server Vercel. Menggunakan generator cerdas internal.");
      const fallbackGame = generateDynamicFallbackGameItems(gameType, mapelName, surahOrTopic, gradeLevel, count, difficultyDesc);
      return res.json({
        success: true,
        isFallback: true,
        data: fallbackGame,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const gameResponseSchema = {
      type: Type.OBJECT,
      properties: {
        game_title: { type: Type.STRING },
        game_type: { type: Type.STRING },
        subject_name: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          description: "Daftar item soal game edukasi",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              category: { type: Type.STRING },
              subject_name: { type: Type.STRING },
              difficulty: {
                type: Type.STRING,
                description: "Tingkat kesulitan soal (Mudah, Sedang, atau Sulit)",
              },
              surah_number: { type: Type.INTEGER },
              ayah_number: { type: Type.INTEGER },
              audio_text: {
                type: Type.STRING,
                description: "Teks lengkap yang akan dibacakan/dilantunkan oleh audio player (untuk PAI: lafaz ayat Arab yang dilantunkan; untuk Mapel Umum: narasi deskriptif informatif yang diperdengarkan).",
              },
              prompt_text: {
                type: Type.STRING,
                description: "Teks pertanyaan atau instruksi soal lengkap secara detail. DILARANG HANYA MENGISI DENGAN NAMA MATERI!",
              },
              arabic_text: { type: Type.STRING },
              translation: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                description: "Array 4 pilihan jawaban",
                items: { type: Type.STRING },
              },
              correct_answer: {
                type: Type.STRING,
                description: "Jawaban benar (wajib sama persis dengan salah satu isi opsi)",
              },
              puzzle_pieces: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correct_order: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              explanation: {
                type: Type.STRING,
                description: "Penjelasan ringkas pembahasan jawaban",
              },
            },
            required: ["id", "category", "prompt_text", "options", "correct_answer", "explanation"],
          },
        },
      },
      required: ["game_title", "game_type", "items"],
    };

    const islamicKeywords = ["pai", "agama", "al-qur'an", "al-quran", "quran", "tahfizh", "tahfidz", "hadits", "hadis", "fiqih", "fiqh", "ski", "akidah", "aqidah", "bahasa arab", "arab"];
    const isIslamicSubject = islamicKeywords.some(kw => mapelName.toLowerCase().includes(kw));

    let prompt = "";
    if (isIslamicSubject) {
      prompt = `Anda adalah pakar Pendidikan Agama Islam, Al-Qur'an, dan Kurikulum Sekolah (${mapelName}).
Buatkan konten game edukasi Islami interaktif berkualitas tinggi yang SINKRON dan FOKUS berdasarkan parameter berikut:
- Kategori/Tipe Game: "${gameType}"
- Mata Pelajaran: "${mapelName}"
- Materi/Surat/Topik Khusus: "${surahOrTopic || "Materi Pembelajaran " + mapelName}"
- Jenjang Pendidikan: "${gradeLevel || "Umum"}"
- Tingkat Kesulitan: "${difficultyDesc}"
- Jumlah Soal: ${count} butir

ATURAN STRUKTUR & SINKRONISASI SOAL (SANGAT KETAT):
1. FOKUS 100% PADA MATERI / SURAT "${surahOrTopic}":
   - Seluruh ${count} item soal, pilihan jawaban, potongan ayat, dan pembahasannya HARUS MURNI membahas "${surahOrTopic}".
   - Dilarang keras beralih ke surat atau topik lain yang tidak diminta!
2. SINKRONISASI TINGKAT KESULITAN (${selectedDifficulty}):
   - Level Mudah: Pertanyaan dasar/langsung seputar topik "${surahOrTopic}", kosakata jelas, pilihan jawaban mudah dibedakan.
   - Level Sedang: Pertanyaan pemahaman hukum bacaan, terjemahan kata penting, atau kelanjutan potongan ayat materi "${surahOrTopic}".
   - Level Sulit: Pertanyaan analisis hafalan mendalam, asbabun nuzul spesifik, atau kemiripan lafaz yang menuntut ketelitian tinggi.
3. SINKRONISASI PERTANYAAN & JAWABAN:
   - "prompt_text" HARUS BERISI INSTRUKSI/PERTANYAAN LENGKAP SECARA TUNTAS. DILARANG HANYA MENULISKAN JUDUL!
   - "correct_answer" HARUS BERNILAI SAMA PERSIS dengan salah satu teks di dalam "options".
   - Sediakan 4 pilihan jawaban yang masuk akal dan relevan.
4. ATRIBUT DATA:
   - Setiap item wajib memiliki "category": "${gameType}", "subject_name": "${mapelName}", dan "difficulty": "${selectedDifficulty}".

PETUNJUK FORMAT SPESIFIK SESUAI TIPE GAME:
- Jika gameType = "pilihan-ganda": Soal kuis pilihan ganda umum dengan 4 opsi.
- Jika gameType = "sambung-ayat": Soal menyambung potongan ayat berikutnya dari "${surahOrTopic}".
- Jika gameType = "melengkapi-ayat": Soal melengkapi kata/lafaz yang rumpang (...) pada "${surahOrTopic}".
- Jika gameType = "tebak-surat": Soal menebak nama surat dari potongan ayat/terjemahan "${surahOrTopic}".
- Jika gameType = "tebak-nomor-ayat": Soal menebak urutan nomor ayat dari surat "${surahOrTopic}".
- Jika gameType = "tebak-audio": Soal audio bacaan ayat Al-Qur'an untuk ditebak surat/maknanya. WAJIB MENGISI "surah_number", "ayah_number", "arabic_text" (lafaz ayat lengkap), "translation" (arti ayat), dan "audio_text" (lafaz ayat Arab). Pastikan "prompt_text" menanyakan isi/arti/surat ayat yang dilantunkan, dan "correct_answer" 100% SINKRON dengan ayat tersebut.
- Jika gameType = "puzzle-ayat": Field "puzzle_pieces" (kata acak) dan "correct_order" (urutan benar) dari ayat "${surahOrTopic}".
- Jika gameType = "memory-card": Pasangan kartu Arab & Terjemahan dari "${surahOrTopic}".
- Jika gameType = "ular-tangga-islami": Soal kuis tantangan singkat dan menarik tentang "${surahOrTopic}".`;
    } else {
      prompt = `Anda adalah pakar Pendidikan dan Kurikulum Sekolah (${mapelName}).
Buatkan konten game edukasi interaktif MURNI UMUM yang SINKRON dan FOKUS berdasarkan parameter berikut:
- Kategori/Tipe Game: "${gameType}"
- Mata Pelajaran UMUM: "${mapelName}" (Matematika, IPA, Bahasa Indonesia, Bahasa Inggris, IPS, PJOK, SBdP, PKn, Informatika, dll.)
- Materi / Topik Khusus: "${surahOrTopic || "Materi Pembelajaran " + mapelName}"
- Jenjang Pendidikan: "${gradeLevel || "Umum"}"
- Tingkat Kesulitan: "${difficultyDesc}"
- Jumlah Soal: ${count} butir

ATURAN STRUKTUR & SINKRONISASI SOAL (SANGAT KETAT):
1. FOKUS 100% PADA MATERI "${surahOrTopic}":
   - Seluruh ${count} butir pertanyaan dan pilihan jawaban HARUS MURNI MEMBAHAS materi "${surahOrTopic}".
   - Dilarang keras keluar dari pokok bahasan "${surahOrTopic}"!
2. ISOLASI TOTAL MAPEL UMUM:
   - DILARANG KERAS MENGGUNAKAN TEKS ARAB, NOMOR AYAT, NAMA SURAT, ATAU ATRIBUT KEAGAMAAN!
   - arabic_text, surah_number, dan ayah_number biarkan null/kosong.
3. SINKRONISASI TINGKAT KESULITAN (${selectedDifficulty}):
   - Level Mudah: Soal definisi dasar, fakta langsung, rumus pokok materi "${surahOrTopic}".
   - Level Sedang: Soal penerapan konsep, pemecahan masalah sederhana, korelasi antar komponen materi "${surahOrTopic}".
   - Level Sulit: Soal analisis kasus kompleks, penalaran kritis (HOTS), dan pengecoh yang menuntut konsentrasi tinggi.
4. SINKRONISASI PERTANYAAN & OPSI JAWABAN:
   - "prompt_text" HARUS BERUPA PERTANYAAN LENGKAP.
   - "correct_answer" HARUS BERNILAI SAMA PERSIS dengan salah satu string pada array "options".
   - Setiap item wajib memiliki "category": "${gameType}", "subject_name": "${mapelName}", dan "difficulty": "${selectedDifficulty}".

PETUNJUK FORMAT SPESIFIK BERDASARKAN TIPE GAME UNTUK MAPEL UMUM:
- Jika gameType = "pilihan-ganda": Kuis pilihan ganda umum materi "${surahOrTopic}" dengan 4 opsi (A, B, C, D).
- Jika gameType = "sambung-ayat" (Menyambung Kalimat): Soal menyambung penggalan konsep/prinsip materi "${surahOrTopic}" yang terpotong.
- Jika gameType = "melengkapi-ayat" (Melengkapi Kalimat / Fill in the blank): Soal melengkapi istilah yang rumpang "___" pada materi "${surahOrTopic}".
- Jika gameType = "tebak-surat" (Tebak Topik / Istilah): Soal mendeskripsikan ciri-ciri konsep pada "${surahOrTopic}" lalu menebak nama istilahnya.
- Jika gameType = "tebak-nomor-ayat" (Tebak Urutan / Angka): Soal menebak urutan langkah, tahun, atau angka hasil kalkulasi materi "${surahOrTopic}".
- Jika gameType = "tebak-audio" (Game Mendengarkan / Listening Comprehension): WAJIB MENGISI field "audio_text" berisi 1-3 kalimat narasi/penjelasan materi "${surahOrTopic}" yang akan disuarakan oleh Audio TTS. "prompt_text" berupa pertanyaan menyimak audio tersebut (contoh: "Dengarkan narasi audio berikut! Berdasarkan audio yang diperdengarkan, apa fungsi utama dari..."), dan "correct_answer" WAJIB 100% SINKRON dengan informasi pada "audio_text".
- Jika gameType = "puzzle-ayat" (Puzzle Susun Kalimat): Menyusun kalimat ilmiah/definisi materi "${surahOrTopic}" yang teracak.
- Jika gameType = "memory-card": Pasangan kartu Konsep & Definisi materi "${surahOrTopic}".
- Jika gameType = "ular-tangga-islami" (Ular Tangga Edukasi): Soal tantangan interaktif seputar "${surahOrTopic}".`;
    }

    // Official supported Gemini models in high-availability order
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];
    let parsedData: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: gameResponseSchema,
            temperature: 0.7,
          },
        });
        if (response && response.text) {
          let cleanedJson = response.text.trim();
          if (cleanedJson.startsWith("```json")) {
            cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "").trim();
          } else if (cleanedJson.startsWith("```")) {
            cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "").trim();
          }
          parsedData = JSON.parse(cleanedJson);
          if (parsedData && Array.isArray(parsedData.items) && parsedData.items.length > 0) {
            break;
          }
        }
      } catch {
        // Model temporarily unavailable (503/429) - seamlessly failover to next candidate
      }
    }

    if (!parsedData) {
      const fallbackGame = generateDynamicFallbackGameItems(gameType, mapelName, surahOrTopic, gradeLevel, count, difficultyDesc);
      return res.json({
        success: true,
        isFallback: true,
        data: fallbackGame,
      });
    }

    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error generating AI game:", err);
    const fallbackGame = generateDynamicFallbackGameItems(
      req.body?.gameType || "pilihan-ganda",
      req.body?.subjectName || "Pendidikan Agama Islam (PAI)",
      req.body?.surahOrTopic || "Latihan",
      req.body?.gradeLevel || "SD / MI",
      parseInt(req.body?.totalItems, 10) || 5,
      "Sedang"
    );
    return res.json({ success: true, isFallback: true, data: fallbackGame });
  }
});

// Status endpoints
app.get("/api/db", (_req, res) => {
  res.json({
    status: "online",
    database: "Firebase Cloud Firestore + Local Storage",
    syncEngine: "realtime",
  });
});

app.get("/api/credentials", (_req, res) => {
  res.json({
    success: true,
    authMode: "centralized",
    roles: ["admin", "guru", "siswa"],
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), platform: "Vercel" });
});

export default app;
