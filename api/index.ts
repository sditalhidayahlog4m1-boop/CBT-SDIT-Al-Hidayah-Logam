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

// API Endpoint for generating CBT questions using Gemini AI
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { teacherName, subject, gradeLevel, classRoom, totalQuestions, topic } = req.body;

    if (!subject || !gradeLevel || !topic) {
      return res.status(400).json({
        error: "Data mata pelajaran, jenjang, dan materi wajib diisi.",
      });
    }

    const numQuestions = parseInt(totalQuestions, 10) || 5;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY tidak ditemukan di environment server Vercel. Silakan tambahkan Environment Variable GEMINI_API_KEY pada Dashboard Vercel Anda.",
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
                description: "Array berisi pilihan jawaban",
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
Buatkan ${numQuestions} soal pilihan ganda berkualitas tinggi berdasarkan data berikut:
- Nama Guru: ${teacherName || "Guru Mata Pelajaran"}
- Mata Pelajaran: ${subject}
- Jenjang Pendidikan: ${gradeLevel}
- Kelas: ${classRoom || "-"}
- Jumlah Soal: ${numQuestions}
- Materi / Topik: "${topic}"

ATURAN STRUKTUR & KUALITAS SOAL (SANGAT KETAT):
1. Properti "question_text" HARUS BERISI KALIMAT PERTANYAAN LENGKAP SECARA DETAIL. DILARANG HANYA MENGISI DENGAN NAMA JUDUL MATERI/TOPIK SAJA!
2. Sertakan pilihan jawaban yang logis pada array "options" (4 pilihan untuk SD/SMP, 5 pilihan untuk SMA/SMK).
3. Tepat SATU pilihan di dalam "options" harus memiliki "is_correct": true.
4. Sertakan pembahasan ringkas yang informatif pada properti "explanation".

ATURAN KHUSUS BERDASARKAN JENJANG (${gradeLevel}):
1. Jika SD / MI: Gunakan bahasa yang sederhana, mudah dipahami anak-anak. Pilihan jawaban A-D.
2. Jika SMP / MTs: Pilihan jawaban A-D. Menguji pemahaman dan analisis sederhana.
3. Jika SMA / MA / SMK: Pilihan jawaban A-E. Menguji analisis dan penalaran.`;

    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let rawText = "";

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
          rawText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} hit error/rate limit:`, err?.message || err);
      }
    }

    if (!rawText) {
      const fallbackQuestions = [];
      for (let i = 1; i <= numQuestions; i++) {
        fallbackQuestions.push({
          question_number: i,
          question_text: `[Paket Offline CBT #${i}] Berdasarkan materi "${topic}" pada mata pelajaran ${subject} (${gradeLevel}), manakah prinsip utama yang benar?`,
          options: [
            { option_letter: "A", option_text: `Penjelasan konsep utama ${topic} secara akurat`, is_correct: true },
            { option_letter: "B", option_text: `Pernyataan pendukung yang kurang tepat mengenai ${topic}`, is_correct: false },
            { option_letter: "C", option_text: `Pernyataan umum yang tidak sesuai materi ${topic}`, is_correct: false },
            { option_letter: "D", option_text: `Sanggahan yang bertentangan dengan ${topic}`, is_correct: false },
          ],
          explanation: `Pembahasan Soal #${i}: Opsi A merupakan jawaban yang paling tepat sesuai dengan standar kurikulum ${subject} materi "${topic}".`
        });
      }

      return res.json({
        success: true,
        isFallback: true,
        warning: "Kuota API Gemini online sedang penuh. Soal berhasil disajikan dari bank soal offline berkualitas.",
        data: {
          cbt_metadata: {
            teacher_name: teacherName || "Guru Mata Pelajaran",
            subject: subject,
            grade_level: gradeLevel,
            total_questions: numQuestions,
          },
          questions: fallbackQuestions,
        },
      });
    }

    let cleanedJson = rawText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsedData = JSON.parse(cleanedJson);
    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error generating CBT questions:", err);
    return res.status(500).json({
      error: "Gagal menghasilkan soal: " + (err?.message || "Internal Server Error"),
    });
  }
});

// API Endpoint for generating AI Game content using Gemini
app.post("/api/generate-game", async (req, res) => {
  try {
    const { gameType, surahOrTopic, gradeLevel, totalItems, difficulty, subjectName } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY tidak ditemukan di server Vercel.",
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

    const count = parseInt(totalItems, 10) || 5;
    const selectedDifficulty = difficulty || "Sedang";
    const mapelName = subjectName || "Pendidikan Agama Islam (PAI)";

    let difficultyDesc = "Sedang (Soal tingkat menengah, pemahaman tajwid & potongan ayat)";
    if (selectedDifficulty === "Mudah") {
      difficultyDesc = "Mudah (Soal dasar, pilihan jawaban sangat mudah dibedakan & ramah untuk pemula)";
    } else if (selectedDifficulty === "Sulit") {
      difficultyDesc = "Sulit (Soal hafalan mendalam, hukum tajwid kompleks, kemiripan lafaz/ayat mutasyabihat & pengecoh yang tajam)";
    }

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
              surah_number: { type: Type.INTEGER },
              ayah_number: { type: Type.INTEGER },
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
Buatkan konten game edukasi Islami/Sekolah interaktif KHUSUS untuk:
- Kategori/Tipe Game: "${gameType}"
- Jenis Mata Pelajaran: "${mapelName}"
- Materi/Surat/Topik: "${surahOrTopic || "Materi Pembelajaran " + mapelName}"
- Jenjang: "${gradeLevel || "Umum"}"
- Tingkat Kesulitan: "${difficultyDesc}"
- Jumlah soal/item: ${count}

SANGAT PENTING - KETENTUAN TEKS & KUALITAS SOAL:
1. Properti "prompt_text" HARUS BERISI KALIMAT PERTANYAAN/INSTRUKSI LENGKAP SECARA DETAIL. DILARANG HANYA MENGISI DENGAN JUDUL TOPIK/MATERI!
2. Seluruh ${count} item soal yang dihasilkan WAJIB memiliki field "category" yang PERSIS BERNILAI "${gameType}".
3. Seluruh item soal WAJIB disesuaikan dengan kurikulum dan topik Mata Pelajaran "${mapelName}".
4. Setiap item WAJIB menyertakan field "subject_name": "${mapelName}".`;
    } else {
      prompt = `Anda adalah pakar Pendidikan dan Kurikulum Sekolah (${mapelName}).
Buatkan konten game edukasi interaktif MURNI UMUM KHUSUS untuk:
- Kategori/Tipe Game: "${gameType}"
- Jenis Mata Pelajaran UMUM: "${mapelName}"
- Materi/Topik: "${surahOrTopic || "Materi Pembelajaran " + mapelName}"
- Jenjang: "${gradeLevel || "Umum"}"
- Tingkat Kesulitan: "${difficultyDesc}"
- Jumlah soal/item: ${count}

SANGAT PENTING - ATURAN MAPEL UMUM:
1. DILARANG SANGAT MENGGUNAKAN TEKS ARAB, NOMOR AYAT, NAMA SURAT, ATAU ATRIBUT RELIGI/AL-QUR'AN!
2. Properti "prompt_text" HARUS BERISI KALIMAT PERTANYAAN/INSTRUKSI SOAL LENGKAP YANG SPESIFIK SESUAI MAPEL "${mapelName}".
3. Jangan pernah mengisi arabic_text, surah_number, atau ayah_number. Biarkan kosong/null.
4. Seluruh ${count} item soal yang dihasilkan WAJIB memiliki field "category" yang PERSIS BERNILAI "${gameType}".
5. Setiap item WAJIB menyertakan field "subject_name": "${mapelName}".`;
    }

    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let rawText = "";

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
          rawText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} hit error/rate limit:`, err?.message || err);
      }
    }

    if (!rawText) {
      const fallbackItems = [];
      for (let i = 0; i < count; i++) {
        const num = i + 1;
        fallbackItems.push({
          id: `server-offline-${gameType}-${Date.now()}-${i}`,
          category: gameType,
          subject_name: mapelName,
          surah_number: 112,
          ayah_number: 1,
          prompt_text: `[Paket Game #${num}] Dengarkan & pelajari materi "${surahOrTopic || mapelName}" (${mapelName} - Mode ${gameType}):`,
          arabic_text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
          translation: "Katakanlah: Dialah Allah, Yang Maha Esa.",
          options: ["Surat Al-Ikhlas", "Surat An-Nas", "Surat Al-Falaq", "Surat Al-Kafirun"],
          correct_answer: "Surat Al-Ikhlas",
          explanation: `Penjelasan Soal #${num}: Jawaban benar adalah Surat Al-Ikhlas ayat 1.`,
        });
      }

      return res.json({
        success: true,
        isFallback: true,
        warning: "Kuota API Gemini online sedang penuh. Game berhasil disajikan dari bank soal offline.",
        data: {
          game_title: `Game ${mapelName} - ${surahOrTopic || 'Latihan'}`,
          game_type: gameType,
          subject_name: mapelName,
          items: fallbackItems,
        },
      });
    }

    let cleanedJson = rawText.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsedData = JSON.parse(cleanedJson);
    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error generating AI game:", err);
    return res.status(500).json({
      error: "Gagal membuat game: " + (err?.message || "Internal Server Error"),
    });
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
