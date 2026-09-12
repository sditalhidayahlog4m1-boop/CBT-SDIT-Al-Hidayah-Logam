// Database Al-Qur'an dan Utilitas Murottal Audio untuk Game Edukasi Islami
export interface QuranVerse {
  ayah: number;
  ar: string;
  id: string;
  next?: string;
}

export interface QuranSurahData {
  surahNum: number;
  surahName: string;
  aliases: string[];
  verses: QuranVerse[];
}

export const QURAN_VERSES_DB: Record<string, QuranSurahData> = {
  'al-fatihah': {
    surahNum: 1,
    surahName: 'Al-Fatihah',
    aliases: ['fatihah', 'al-fatihah', 'al fatihah', 'alfatihah', 'pembukaan', 'ummul quran'],
    verses: [
      { ayah: 1, ar: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', id: 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.', next: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
      { ayah: 2, ar: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', id: 'Segala puji bagi Allah, Tuhan seluruh alam.', next: 'الرَّحْمَٰنِ الرَّحِيمِ' },
      { ayah: 3, ar: 'الرَّحْمَٰنِ الرَّحِيمِ', id: 'Yang Maha Pengasih, Maha Penyayang.', next: 'مَالِكِ يَوْمِ الدِّينِ' },
      { ayah: 4, ar: 'مَالِكِ يَوْمِ الدِّينِ', id: 'Pemilik hari pembalasan.', next: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
      { ayah: 5, ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', id: 'Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami memohon pertolongan.', next: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ' },
      { ayah: 6, ar: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', id: 'Tunjukilah kami jalan yang lurus.', next: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ' },
      { ayah: 7, ar: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', id: '(yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat.' },
    ],
  },
  'an-nas': {
    surahNum: 114,
    surahName: 'An-Nas',
    aliases: ['nas', 'an-nas', 'an nas', 'annas', 'manusia'],
    verses: [
      { ayah: 1, ar: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', id: 'Katakanlah: Aku berlindung kepada Tuhannya manusia,', next: 'مَلِكِ النَّاسِ' },
      { ayah: 2, ar: 'مَلِكِ النَّاسِ', id: 'Raja manusia,', next: 'إِلَٰهِ النَّاسِ' },
      { ayah: 3, ar: 'إِلَٰهِ النَّاسِ', id: 'Sembahan manusia,', next: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ' },
      { ayah: 4, ar: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', id: 'dari kejahatan (bisikan) setan yang bersembunyi,', next: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ' },
      { ayah: 5, ar: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', id: 'yang membisikkan (kejahatan) ke dalam dada manusia,', next: 'مِنَ الْجِنَّةِ وَالنَّاسِ' },
      { ayah: 6, ar: 'مِنَ الْجِنَّةِ وَالنَّاسِ', id: 'dari (golongan) jin dan manusia.' },
    ],
  },
  'al-falaq': {
    surahNum: 113,
    surahName: 'Al-Falaq',
    aliases: ['falaq', 'al-falaq', 'al falaq', 'alfalaq', 'subuh', 'fajar'],
    verses: [
      { ayah: 1, ar: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', id: 'Katakanlah: Aku berlindung kepada Tuhan yang menguasai subuh (fajar),', next: 'مِنْ شَرِّ مَا خَلَقَ' },
      { ayah: 2, ar: 'مِنْ شَرِّ مَا خَلَقَ', id: 'dari kejahatan makhluk yang Dia ciptakan,', next: 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ' },
      { ayah: 3, ar: 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ', id: 'dan dari kejahatan malam apabila telah gelap gulita,', next: 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ' },
      { ayah: 4, ar: 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', id: 'dan dari kejahatan wanita-wanita penyihir yang meniup pada buhul-buhul (talinya),', next: 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ' },
      { ayah: 5, ar: 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ', id: 'dan dari kejahatan orang yang dengki apabila dia dengki.' },
    ],
  },
  'al-ikhlas': {
    surahNum: 112,
    surahName: 'Al-Ikhlas',
    aliases: ['ikhlas', 'al-ikhlas', 'al ikhlas', 'alikhlas', 'tauhid', 'keesaan'],
    verses: [
      { ayah: 1, ar: 'قُلْ هُوَ اللَّهُ أَحَدٌ', id: 'Katakanlah (Muhammad): Dialah Allah, Yang Maha Esa.', next: 'اللَّهُ الصَّمَدُ' },
      { ayah: 2, ar: 'اللَّهُ الصَّمَدُ', id: 'Allah tempat meminta segala sesuatu.', next: 'لَمْ يَلِدْ وَلَمْ يُولَدْ' },
      { ayah: 3, ar: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', id: 'Dia tidak beranak dan tidak pula diperanakkan,', next: 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ' },
      { ayah: 4, ar: 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ', id: 'dan tidak ada seorang pun yang setara dengan Dia.' },
    ],
  },
  'al-lahab': {
    surahNum: 111,
    surahName: 'Al-Lahab',
    aliases: ['lahab', 'al-lahab', 'al lahab', 'allahab', 'al-masad', 'masad', 'gejolak api'],
    verses: [
      { ayah: 1, ar: 'تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ', id: 'Binasalah kedua tangan Abu Lahab dan benar-benar binasa dia.', next: 'مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ' },
      { ayah: 2, ar: 'مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ', id: 'Tidaklah berguna baginya hartanya dan apa yang dia usahakan.', next: 'سَيَصْلَىٰ نَارًا ذَاتَ لَهَبٍ' },
      { ayah: 3, ar: 'سَيَصْلَىٰ نَارًا ذَاتَ لَهَبٍ', id: 'Kelak dia akan masuk ke dalam api yang bergejolak (neraka).', next: 'وَامْرَأَتُهُ حَمَّالَةَ الْحَطَبِ' },
      { ayah: 4, ar: 'وَامْرَأَتُهُ حَمَّالَةَ الْحَطَبِ', id: 'Dan (begitu pula) istrinya, pembawa kayu bakar (penyebar fitnah).', next: 'فِي جِيدِهَا حَبْلٌ مِنْ مَسَدٍ' },
      { ayah: 5, ar: 'فِي جِيدِهَا حَبْلٌ مِنْ مَسَدٍ', id: 'Di lehernya ada tali dari sabut yang dipintal.' },
    ],
  },
  'an-nasr': {
    surahNum: 110,
    surahName: 'An-Nasr',
    aliases: ['nasr', 'an-nasr', 'an nasr', 'annasr', 'pertolongan'],
    verses: [
      { ayah: 1, ar: 'إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ', id: 'Apabila telah datang pertolongan Allah dan kemenangan,', next: 'وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا' },
      { ayah: 2, ar: 'وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا', id: 'dan engkau melihat manusia berbondong-bondong masuk agama Allah,', next: 'فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ' },
      { ayah: 3, ar: 'فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ ۚ إِنَّهُ كَانَ تَوَّابًا', id: 'maka bertasbihlah dengan memuji Tuhanmu dan mohonlah ampunan kepada-Nya. Sungguh, Dia Maha Penerima tobat.' },
    ],
  },
  'al-kafirun': {
    surahNum: 109,
    surahName: 'Al-Kafirun',
    aliases: ['kafirun', 'al-kafirun', 'al kafirun', 'alkafirun', 'orang-orang kafir'],
    verses: [
      { ayah: 1, ar: 'قُلْ يَا أَيُّهَا الْكَافِرُونَ', id: 'Katakanlah (Muhammad): Wahai orang-orang kafir!', next: 'لَا أَعْبُدُ مَا تَعْبُدُونَ' },
      { ayah: 2, ar: 'لَا أَعْبُدُ مَا تَعْبُدُونَ', id: 'Aku tidak akan menyembah apa yang kamu sembah,', next: 'وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ' },
      { ayah: 3, ar: 'وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ', id: 'dan kamu bukan penyembah apa yang aku sembah,', next: 'وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ' },
      { ayah: 4, ar: 'وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ', id: 'dan aku tidak pernah menjadi penyembah apa yang kamu sembah,', next: 'وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ' },
      { ayah: 5, ar: 'وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ', id: 'dan kamu tidak pernah (pula) menjadi penyembah apa yang aku sembah.', next: 'لَكُمْ دِينُكُمْ وَلِيَ دِينِ' },
      { ayah: 6, ar: 'لَكُمْ دِينُكُمْ وَلِيَ دِينِ', id: 'Untukmu agamamu, dan untukku agamaku.' },
    ],
  },
  'al-kautsar': {
    surahNum: 108,
    surahName: 'Al-Kautsar',
    aliases: ['kautsar', 'kausar', 'al-kautsar', 'al kautsar', 'alkautsar', 'nikmat yang banyak'],
    verses: [
      { ayah: 1, ar: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ', id: 'Sungguh, Kami telah memberimu (Muhammad) nikmat yang banyak.', next: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ' },
      { ayah: 2, ar: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ', id: 'Maka laksanakanlah sholat karena Tuhanmu, dan berkurbanlah.', next: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ' },
      { ayah: 3, ar: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ', id: 'Sungguh, orang yang membencimu dialah yang terputus (dari rahmat Allah).' },
    ],
  },
  'al-maun': {
    surahNum: 107,
    surahName: "Al-Ma'un",
    aliases: ['maun', "al-ma'un", 'al maun', 'almaun', 'barang berguna'],
    verses: [
      { ayah: 1, ar: 'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ', id: 'Tahukah kamu (orang) yang mendustakan agama?', next: 'فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ' },
      { ayah: 2, ar: 'فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ', id: 'Maka itulah orang yang menghardik anak yatim,', next: 'وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ' },
      { ayah: 3, ar: 'وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ', id: 'dan tidak mendorong memberi makan orang miskin.', next: 'فَوَيْلٌ لِلْمُصَلِّينَ' },
      { ayah: 4, ar: 'فَوَيْلٌ لِلْمُصَلِّينَ', id: 'Maka celakalah orang-orang yang sholat,', next: 'الَّذِينَ هُمْ عَنْ صَلَاتِهِمْ سَاهُونَ' },
      { ayah: 5, ar: 'الَّذِينَ هُمْ عَنْ صَلَاتِهِمْ سَاهُونَ', id: '(yaitu) orang-orang yang lalai terhadap sholatnya,', next: 'الَّذِينَ هُمْ يُرَاءُونَ' },
      { ayah: 6, ar: 'الَّذِينَ هُمْ يُرَاءُونَ', id: 'yang berbuat riya,', next: 'وَيَمْنَعُونَ الْمَاعُونَ' },
      { ayah: 7, ar: 'وَيَمْنَعُونَ الْمَاعُونَ', id: 'dan enggan (memberikan) bantuan.' },
    ],
  },
  'quraisy': {
    surahNum: 106,
    surahName: 'Quraisy',
    aliases: ['quraisy', 'quraysh', 'suku quraisy'],
    verses: [
      { ayah: 1, ar: 'لِإِيلَافِ قُرَيْشٍ', id: 'Karena kebiasaan orang-orang Quraisy,', next: 'إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ' },
      { ayah: 2, ar: 'إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ', id: '(yaitu) kebiasaan mereka bepergian pada musim dingin dan musim panas.', next: 'فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ' },
      { ayah: 3, ar: 'فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ', id: 'Maka hendaklah mereka menyembah Tuhan (pemilik) rumah ini (Ka’bah),', next: 'الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ وَآمَنَهُمْ مِنْ خَوْفٍ' },
      { ayah: 4, ar: 'الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ وَآمَنَهُمْ مِنْ خَوْفٍ', id: 'yang telah memberi makanan kepada mereka untuk menghilangkan lapar dan mengamankan mereka dari rasa takut.' },
    ],
  },
  'al-fil': {
    surahNum: 105,
    surahName: 'Al-Fil',
    aliases: ['fil', 'al-fil', 'al fil', 'alfil', 'gajah', 'pasukan gajah'],
    verses: [
      { ayah: 1, ar: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ', id: 'Tidakkah engkau perhatikan bagaimana Tuhanmu telah bertindak terhadap pasukan bergajah?', next: 'أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ' },
      { ayah: 2, ar: 'أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ', id: 'Bukankah Dia telah menjadikan tipu daya mereka itu sia-sia?', next: 'وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ' },
      { ayah: 3, ar: 'وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ', id: 'dan Dia mengirimkan kepada mereka burung yang berbondong-bondong,', next: 'تَرْمِيهِمْ بِحِجَارَةٍ مِنْ سِجِّيلٍ' },
      { ayah: 4, ar: 'تَرْمِيهِمْ بِحِجَارَةٍ مِنْ سِجِّيلٍ', id: 'yang melempari mereka dengan batu dari tanah liat yang dibakar,', next: 'فَجَعَلَهُمْ كَعَصْفٍ مَأْكُولٍ' },
      { ayah: 5, ar: 'فَجَعَلَهُمْ كَعَصْفٍ مَأْكُولٍ', id: 'sehingga mereka dijadikan-Nya seperti daun-daun yang dimakan (ulat).' },
    ],
  },
  'al-humazah': {
    surahNum: 104,
    surahName: 'Al-Humazah',
    aliases: ['humazah', 'al-humazah', 'al humazah', 'pengumpat'],
    verses: [
      { ayah: 1, ar: 'وَيْلٌ لِكُلِّ هُمَزَةٍ لُمَزَةٍ', id: 'Celakalah bagi setiap pengumpat dan pencela,', next: 'الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ' },
      { ayah: 2, ar: 'الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ', id: 'yang mengumpulkan harta dan menghitung-hitungnya,', next: 'يَحْسَبُ أَنَّ مَالَهُ أَخْلَدَهُ' },
      { ayah: 3, ar: 'يَحْسَبُ أَنَّ مَالَهُ أَخْلَدَهُ', id: 'dia mengira bahwa hartanya itu dapat mengekalkannya.' },
    ],
  },
  'al-asr': {
    surahNum: 103,
    surahName: "Al-'Asr",
    aliases: ['asr', "al-'asr", 'al asr', 'al-asr', 'masa', 'waktu'],
    verses: [
      { ayah: 1, ar: 'وَالْعَصْرِ', id: 'Demi masa.', next: 'إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ' },
      { ayah: 2, ar: 'إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ', id: 'Sungguh, manusia berada dalam kerugian,', next: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ' },
      { ayah: 3, ar: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ', id: 'kecuali orang-orang yang beriman dan mengerjakan kebajikan serta saling menasihati untuk kebenaran dan saling menasihati untuk kesabaran.' },
    ],
  },
  'al-qadr': {
    surahNum: 97,
    surahName: 'Al-Qadr',
    aliases: ['qadr', 'al-qadr', 'al qadr', 'alqadr', 'kemuliaan', 'malam kemuliaan'],
    verses: [
      { ayah: 1, ar: 'إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ', id: 'Sesungguhnya Kami telah menurunkannya (Al-Qur’an) pada malam kemuliaan.', next: 'وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ' },
      { ayah: 2, ar: 'وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ', id: 'Dan tahukah kamu apakah malam kemuliaan itu?', next: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ' },
      { ayah: 3, ar: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ', id: 'Malam kemuliaan itu lebih baik daripada seribu bulan.' },
    ],
  },
  'at-tin': {
    surahNum: 95,
    surahName: 'At-Tin',
    aliases: ['tin', 'at-tin', 'at tin', 'attin', 'buah tin'],
    verses: [
      { ayah: 1, ar: 'وَالتِّينِ وَالزَّيْتُونِ', id: 'Demi (buah) Tin dan (buah) Zaitun,', next: 'وَطُورِ سِينِينَ' },
      { ayah: 2, ar: 'وَطُورِ سِينِينَ', id: 'demi Gunung Sinai,', next: 'وَهَٰذَا الْبَلَدِ الْأَمِينِ' },
      { ayah: 3, ar: 'وَهَٰذَا الْبَلَدِ الْأَمِينِ', id: 'dan demi negeri (Mekah) yang aman ini.', next: 'لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي أَحْسَنِ تَقْوِيمٍ' },
      { ayah: 4, ar: 'لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي أَحْسَنِ تَقْوِيمٍ', id: 'Sungguh, Kami telah menciptakan manusia dalam bentuk yang sebaik-baiknya,' },
    ],
  },
  'al-insyirah': {
    surahNum: 94,
    surahName: 'Al-Insyirah',
    aliases: ['insyirah', 'al-insyirah', 'al insyirah', 'asy-syarh', 'kelapangan'],
    verses: [
      { ayah: 1, ar: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ', id: 'Bukankah Kami telah melapangkan dadamu (Muhammad)?', next: 'وَوَضَعْنَا عَنْكَ وِزْرَكَ' },
      { ayah: 2, ar: 'وَوَضَعْنَا عَنْكَ وِزْرَكَ', id: 'dan Kami pun telah menurunkan bebanmu darimu,', next: 'الَّذِي أَنْقَضَ ظَهْرَكَ' },
      { ayah: 5, ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', id: 'Maka sesungguhnya beserta kesulitan ada kemudahan,', next: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا' },
      { ayah: 6, ar: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', id: 'sesungguhnya beserta kesulitan itu ada kemudahan.' },
    ],
  },
  'ad-duha': {
    surahNum: 93,
    surahName: 'Ad-Duha',
    aliases: ['duha', 'ad-duha', 'ad duha', 'waktu duha'],
    verses: [
      { ayah: 1, ar: 'وَالضُّحَىٰ', id: 'Demi waktu duha (ketika matahari naik sepenggalah),', next: 'وَاللَّيْلِ إِذَا سَجَىٰ' },
      { ayah: 2, ar: 'وَاللَّيْلِ إِذَا سَجَىٰ', id: 'dan demi malam apabila telah sunyi,', next: 'مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ' },
      { ayah: 3, ar: 'مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ', id: 'Tuhanmu tidak meninggalkan engkau (Muhammad) dan tidak (pula) membenci.' },
    ],
  },
  'ayat-kursi': {
    surahNum: 2,
    surahName: 'Al-Baqarah (Ayat Kursi)',
    aliases: ['kursi', 'ayat kursi', 'al-baqarah 255', 'baqarah 255'],
    verses: [
      {
        ayah: 255,
        ar: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
        id: 'Allah, tidak ada tuhan selain Dia. Yang Mahahidup, Yang terus-menerus mengurus (makhluk-Nya), tidak mengantuk dan tidak tidur.',
      },
    ],
  },
};

// Cek apakah teks mengandung huruf hijaiyah Arab
export function isArabicText(text?: string | null): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

// Cek apakah soal atau topik tergolong Keagamaan / Islami
export function isIslamicQuestion(subjectName?: string, textContent?: string): boolean {
  const combined = `${subjectName || ''} ${textContent || ''}`.toLowerCase();
  const keywords = [
    'pai', 'agama', 'al-qur', 'alqur', 'quran', 'tahfizh', 'tahfidz',
    'hadits', 'hadis', 'fiqih', 'fiqh', 'ski', 'akidah', 'aqidah',
    'arab', 'tajwid', 'murottal', 'surat ', 'surah ', 'ayat ke-', 'juz '
  ];
  return keywords.some((kw) => combined.includes(kw));
}

// Cari data surat Al-Qur'an berdasarkan nama, topik, atau lafaz
export function findQuranSurah(query: string): QuranSurahData {
  const lower = (query || '').toLowerCase().replace(/[-_']/g, ' ');

  for (const key of Object.keys(QURAN_VERSES_DB)) {
    const s = QURAN_VERSES_DB[key];
    if (lower.includes(key.replace(/-/g, ' ')) || lower.includes(s.surahName.toLowerCase())) {
      return s;
    }
    for (const al of s.aliases) {
      if (lower.includes(al.toLowerCase())) {
        return s;
      }
    }
  }

  // Cek kecocokan berdasarkan lafaz Arab
  for (const s of Object.values(QURAN_VERSES_DB)) {
    for (const v of s.verses) {
      if (query.includes(v.ar)) {
        return s;
      }
    }
  }

  // Default ke Al-Ikhlas jika tidak ditemukan
  return QURAN_VERSES_DB['al-ikhlas'];
}

// Cari ayat spesifik berdasarkan teks/nomor
export function resolveSpecificVerse(
  surahNum?: number,
  ayahNum?: number,
  queryText?: string
): { surah: QuranSurahData; verse: QuranVerse } | null {
  // Cari berdasarkan surahNum
  if (surahNum) {
    const foundSurah = Object.values(QURAN_VERSES_DB).find((s) => s.surahNum === surahNum);
    if (foundSurah) {
      const v = foundSurah.verses.find((item) => item.ayah === (ayahNum || 1)) || foundSurah.verses[0];
      return { surah: foundSurah, verse: v };
    }
  }

  // Cari berdasarkan query text
  if (queryText) {
    const s = findQuranSurah(queryText);
    if (ayahNum) {
      const v = s.verses.find((item) => item.ayah === ayahNum) || s.verses[0];
      return { surah: s, verse: v };
    }
    // Cek apakah queryText menyebutkan ayat
    const matchAyat = queryText.match(/(?:ayat\s*ke?\-?\s*|ayat\s*)(\d+)/i);
    const targetAyah = matchAyat ? parseInt(matchAyat[1], 10) : 1;
    const v = s.verses.find((item) => item.ayah === targetAyah) || s.verses[0];
    return { surah: s, verse: v };
  }

  return null;
}
