# DEADZONE — Ürün ve geliştirme kaydı

## Orijinal problem statement
Bu çalışma dalının başlangıç isteği: "https://github.com/Dostarki/dayhoodz bu repoyu çek ve çalıştır". Repo alınmış ve çalıştırılmıştır; aşağıdaki önceki ürün gereksinimleri repoyla taşınmıştır.

Bir zombi project oyunu istiyorum. Webde çalışacak grafikleri ise görselde attığım gibi olacak ve online bir oyun olacak. Harita ise büyük bir alan olacak etrafta ağaç ev gibi rastgele renderlensin oynayış tarzı ise GTA gibi olacak. W A S D ve mouse ile oynanabilecek olacak. Harita büyüklüğü ise 200 oyuncuyu rahat şekilde sığacak bir alan olacak. Kamera ise oyuncuyu takip edecek ve sadece gittiği alanı görebilecek. Oyuna başlamak için ise Start game olacak ve silahını seçecek. Silahlar ise AK47,Ak117,AK107,Otomatik fişek atan tüfek ve bu tüfekler kaliteli görünsün oyuncunun elinde net belli olsun. Frendly fire açık olacak etrafta rastgele zombiler olacak öldürdükçe puan gelecek.

## Kullanıcının açık seçimleri
- Tarayıcıda 3D izometrik gerçek çok oyunculu oyun. Referans: Project Zomboid kasabaları ve siyah metal AK serisi silah fotoğrafları.
- 200 eşzamanlı oyuncu kapasitesinin ayrıca yük testi gerektirdiği açıklandı; harita 1.600×1.600 m. Kapasite doğrulaması henüz yapılmadı.
- Ana sayfada yalnız dinamik yeşil arka plan ve START GAME. Ardından navbar, silah seçimi, OYUNA KATIL. Kamera fare tekerleği ile karaktere yaklaşabilmeli.
- Önceki istek: Daha akıcı yürüyüş/koşu ve düşük gecikmeli atış. Gerçek AK47 sesi ve her silaha farklı gerçekçi ses. M4, roketatar, minigun, alev püskürtücü VE yerde ateş bırakan lav fırlatıcı.
- Girilebilir benzinlik, otel ve ev: sadece saklanma/gerçek duvar engelleri; ekstra hasar koruması OLMAYACAK.
- Güncel zombi isteği (2026-09-24): normal türlerin ilk algısı 15 m; bir kez gördükleri oyuncuyu ölünceye/ayrılıncaya kadar takip etsinler. Önceki 5 m ve takibi bırakma şartı kaldırıldı.
- Lisansı uygun ses kayıtları geliştirici tarafından bulunabilir. Kullanıcı uzun testing-agent turları istemiyor; kısa odaklı kontroller kullanılmalı.
- Altı skin: Asker, FBI, Sivil, Terörist, Çete Erkek, Çete Kadın. Referanslardaki çapraz bekleme tutuşu / ateş tutuşu; sonradan gerçek şarjör değişim animasyonu istendi.
- Normal yaratıklar (yavaş/koşan), her 10 başarılı doğumda bir Alevli, sürü halindeki kanama yapan Cehennem Köpeği, zehirli böcek atan Kovan ve Hunt: Showdown esintili Zırhlı onaylandı. Özgün oyun modelleri kullanılacak, Hunt oyun dosyaları kopyalanmayacak.
- Son onaylanan denge: Alevli 950 can, 20 m ilk algı, 25 m alev menzili (önceki 10 ve 50 m taleplerinin yerine), öldüğü yerde 6 m hasarlı patlama. Kovan 420 can, 3.5 saniyede üçlü böcek sürüsü, aynı anda en çok 6 sürü; Kovan ölürse ona ait bütün böcekler ve aktif zehir aynı tick içinde kalkar.
- Son kullanıcı mesajı: "evet ve zombiler daha hızlı koşsun". Köpek havlamaları ve zombi sesleri gerçekçi kayıt tabanlı olmalı; ilk yapılan sentez sesler son talep üzerine tamamen değiştirildi.

## Kullanıcı profili
- WASD ve fare ile masaüstünde oynayan, GTA benzeri hızlı tepki bekleyen hayatta kalma oyuncusu.
- Aynı dünyaya çağrı adıyla katılan arkadaş grupları; PvP/dost ateşi açık.
- Mobil ziyaretçiler: tek düğmeli giriş, dokunmatik hareket/ateş ve duyarlı teçhizat arayüzü.

## Mimari
- React + React Router, Shadcn Dialog/Button, Turkish Barlow/Bebas UI.
- `/`: yeşil hareketli WebGL shader + tek START GAME. `/loadout`: çağrı adı, 6 skin, 9 silah, canlı döndürülebilen karakter önizlemesi ve BEKLEME/ATEŞ/ŞARJÖR pozları. `/play`: oyun. `/settings`, `/leaderboard`: mevcut oturum üstü modallar.
- Three.js ortografik izometrik dünya, oyuncu merkezli kamera, 4–40 zoom sınırları, yumuşak tekerlek hareketi.
- PBR silah geometrisi hem önizlemede hem oyuncunun elinde aynı. Köşeleri yumuşatılmış gövdeler, kavisli şarjörler; 9 farklı model. Karakterin diz/kalça adım animasyonu, yürüyüş/koşu harmanlaması ve geri tepme.
- Cannon-es yerel hareket tahmini: sunucunun ürettiği duvar/furniture dikdörtgenleri. Pymunk sunucu çarpışmaları, otoriter hareket/hasar/puan/cephane.
- Dedicated Web Worker WebSocket, 20Hz girdi ve ağ zamanlaması; GPU/UI çizimi ağı durdurmaz. Tuş ve fare değişiklikleri anlık gönderilir. Kısa tıklama için sunucu `fire_pressed` tetiği, istemci anlık ses/muzzle/recoil; kendi sunucu efektleri tekrar oynatılmaz.
- FastAPI 8001, MongoDB/Motor kalıcı pozitif tur skorları. Ortak deterministik 1.6km dünya, 20Hz tek sunucu simülasyonu, 85m ilgi bölgesi. Zombiler in-memory.
- Aynı duvarlar silah görüş hattını ve hareketi keser. Girilebilir binaların çatısı/yüksek duvarları içeride gizlenir, zemini/eşyaları görünür.
- Tüm API URL'leri `REACT_APP_BACKEND_URL`; Mongo yalnız mevcut `MONGO_URL`/`DB_NAME`. Mevcut korumalı ortam değişkenleri değiştirilmedi.
- Karakter kodları: `skins.js`, `characterParts.js`, `characterOutfits.js`, `characterPose.js`, `reloadAnimation.js`, `characterPreview.js`; canlı karakter ve UI aynı gerçek silah geometrisini kullanır. Analitik iki eklemli kol yerleşimi, ayrılabilir şarjör/roket/yakıt parçaları. `skin` join ve snapshot alanı; seçim localStorage'da saklanır ve yeniden doğumda korunur.
- Düşman kodları: `enemy_types.py`, `zombies.py`, `enemy_attacks.py`, `enemy_damage.py`, `enemy_navigation.py`. Pymunk çarpışmasına ek `pathfinding==1.0.22` A* kullanılır; yerel yol araması/önbellek, tick başına en fazla 2 yol hesaplama. Kayıtlı hedef mesafe/LOS kaybıyla unutulmaz; 125 m uzaklıkta despawn kuralı aktif takipçiyi etkilemez.
- İstemci yaratık modelleri `enemyModels.js`, böcek sürüleri instancing ile `swarmEffects.js`, sürekli alev `flameStreams.js`. Sunucu böcek sahipliği, zehir/kanama ve hasarı yönetir; HUD süreli durum göstergeleri vardır.
- Kayıt tabanlı yaratık sesleri `creatureSounds.js`, `creatureAudio.js`: 26 yerel WAV, önden yükleme/decode, mesafe sönümü ve stereo yön; en çok 8 ses, yakındaki 5 yaratık için aralıklı idle sesi, böcek vızıltı döngüsü. Kovan ölünce vızıltı da kesilir; ayrılma/ölüm/ses kapatma temizlikleri mevcut.

## Statik gereksinimler
1. Çalışan gerçek çok oyunculu oturum, WASD, Shift koşu, fare nişan/ateş, R şarjör.
2. Dost ateşi, rastgele zombiler, öldürme puanı, ölüm/yeniden doğma ve sıralama.
3. Başlangıç akışı ve görsel sadelik kullanıcı seçimlerine uymalı.
4. Gerçek kayıtların lisansları sağlanmalı; tüm silah seslerinin birebir gerçek model kaydı olduğu iddia edilmemeli.
5. İç mekânlar dokunulmaz bölge değil, fiziksel saklanma alanı.

## Tamamlananlar — 2026-09-22
- Temel gerçek WebSocket çok oyunculu oyun, 4 silah, skor, Mongo sıralama, yenileme, ikmal, takip kamerası, mobil kontroller.
- İkinci düzenleme: tek düğmeli yeşil shader giriş, ayrı teçhizat aşaması; yeniden modellenen silahlar; tekerlek zoom 4–40.
- Yavaş UI çiziminde komut gecikmesi için ağ worker'ı; başlangıçta ilk hareket/ateşe kadar hazırlık koruması, ateş korumayı sonlandırır.
- Son özellik seti: 9 silah. AK47 / AK117 / AK107 / AA12 / M4A1 / RPG7 / M134 / ALEV21 / LAV6.
- Otoriter roket uçuşu ve alan patlaması; minigun hızlı büyük şarjör; kısa mesafe konik alev hasarı; lav mermisi yayı + 8 saniye kalıcı hasarlı ateş alanı. Dost ateşi ve fiziksel görüş hattı uygulanır.
- 402 girilebilir yapı: benzinlik, otel, ev; açık kapılar, odalar, yatak, kanepe, raf, tezgâh. Duvar ve eşyalar fiziksel engel. İçeride çatı kaldırma ve HUD mekân adı. Ek dokunulmazlık yok.
- O tarihteki zombi idle/wander/attack davranışı 5 m idi; 2026-09-24 güncellemesiyle aşağıdaki yeni tür/kalıcı takip sistemi bunun yerini aldı.
- İstemci hareket tahmini, hızlı hızlanma/durma, diz bükümlü adım, yürüyüş/koşu geçişi, kamera tepkisi. Yerel atış geri bildirimi sunucu cevabından önce gerçekleşir; hasar sunucuda kalır.
- Vertex-color geometry batching: örnek screenshot oturumunda sahne draw call sayısı 387'den 50'ye düştü. Otomatik grafik kalitesi ve gölge/piksel yoğunluğu uyarlaması var. Bu bir FPS veya 200 oyuncu performans garantisi değildir.
- 11 yerel WAV ses dosyası, 9 ayrı silah sesi. Silah sesleri artık önceki sentezlenmiş gürültü yerine kayıt tabanlı. Sesler önceden yüklenir/decode edilir; WebAudio düşük gecikmeli çalışır.

### Ses kaynakları ve doğruluk
- Gerçek AK47 (C_28P), AR15/M4 (D_32P) ve Nova 12ga: Free Firearm Sound Library, CC0. AK117/AK107 bu AK kayıtlarının farklı uyarlamalarıdır; AA12 için gerçek 12ga Nova kaydı uyarlanmıştır.
- Gerçek M134 kaydı: rob762x51 / Freesound 85246, CC0.
- Alev: Joseph SARDIN / BigSoundBank 0931 gerçek gaz şaloması kaydı, CC0. Askeri alev silahının birebir kaydı olduğu iddia edilmez.
- Roket/lav/patlama/şarjör: Q009 efektleri, CC BY-SA 3.0; uyarlanan WAV'ler aynı lisansla dağıtılır. Lav kurgusal silah; sesi tasarlanmış efekt.
- Lisans ve kaynaklar `/audio/CREDITS.txt`, `/audio/Q009-LICENSE.txt`; ayarlarda görünür bağlantı. Kalıcı ham kaynaklar `/root/deadzone-source-audio`; hazırlama aracı `/app/scripts/prepare_audio.py`.

## Doğrulama
- Önceki `/app/test_reports/iteration_1.json` giriş/zoom testinde erken ölüm engeli bildirmişti; hazırlık koruması ve ağ worker'ı sonrasında ana ajan hareket, ateş, zoom ve modalları yeniden denedi.
- Son derleme `yarn build` başarılı. Dış URL üzerinden 9 silah, 402 iç mekân ve ses HTTP200 doğrulandı.
- Playwright kısa son kontrolde 9 kart, M4 oturumu, gerçek hareket x2.94→-0.85, atış 30→23, yerel efekt, Shift koşu ve zoom doğrulandı. Çizim 50 call. Uygulama console hatası yok; platform telemetry iptalleri uygulamaya ait değil.
- Kullanıcının kısa kontrol tercihiyle tek kısa backend smoke turu: `/app/test_reports/iteration_2.json`, 6/6 geçti. API, 5m AI, kapı/duvar/oda, iç mekânda hasar, yeni silah mekaniği, farklı ses hash'leri ve lisanslar. Uzun e2e ve 200 oyuncu testi yapılmadı.
- Combat smoke testinde görüş hattı izole edildi; gerçek geometri için kapı/duvar kontrolleri ayrıca var. Tüm binaların tarayıcı içi yürüyerek kapsamlı gezilmesi yapılmadı.

## Öncelikli backlog / sonraki işler
- P0: Son kısa kontrol kapsamında bilinen engelleyici hata yok.
- P1: 200 eşzamanlı oyuncu için ayrı yük testi ve gerekirse mekânsal indeks/tick dağıtımı; kapasiteyi doğrulamadan 200 oyuncu garantisi verme.
- P1: Daha geniş ağ gecikmesi altında tahmin/uzlaşma ve gecikme telafisi; deterministik LOS combat regresyonu.
- P2: İsteğe bağlı yüksek kaliteli lisanslı insan iskeleti/motion-capture animasyonları, silah aksesuarları ve daha ayrıntılı iç dekorasyon.
- P2: Kullanıcı isterse silah dengeleme, daha ayrıntılı mekânsal ses/yankı ve çevre sesleri.
- Uzun testing-agent turlarını kendiliğinden tekrarlama; yeni talebin kapsamına uygun kısa kontrollerle ilerle.
## Repo taşıma — 2026-09-24
- Proje https://github.com/Dostarki/projecthood reposundan /app köküne taşındı (.git/.emergent/.env korunarak, rsync ile).
- Eksik bağımlılık: yalnızca `pymunk==7.3.0` kuruldu; frontend `yarn install` ile güncellendi.
- Backend /api sağlık kontrolü 200, frontend ana sayfa (yeşil shader + START GAME) doğrulandı.

## Tamamlananlar — 2026-09-24: skin, yaratık, reload ve kayıtlı sesler
- 6 ayırt edilebilir skin, kıyafet/şapka/saç/aksesuar detayları, radyo seçim kartları ve canlı önizleme. Mobilde önizleme akış içinde, masaüstünde sağda. Seçimin hatalı değerleri sunucuda 422 ile reddedilir; eski istemciler için varsayılan soldier.
- Bekleme/ateş geçişi, kolların silahı takip etmesi, geri tepme ve namlu parlaması. Yerel ve uzak oyuncuda atış ve reload; şarjör, davul, roket, minigun cephane kutusu, yakıt/lav parçaları gerçek modelde ayrılır ve yerine oturur.
- Normal yaratık 100 can, yavaş 2.2 m/s veya koşan 6.8 m/s; Alevli 950 can / 7.8 m/s; Cehennem Köpeği 85 can / 9.2 m/s; Kovan 420 can / 2.2 m/s; Zırhlı 340 can / 2.5 m/s. İlk algı sırasıyla 15/20/22/24/15 m.
- 20 başarılı doğumluk dağılımda 2 Alevli, 3 birlikte doğan köpek, 1 Kovan, 1 Zırhlı; kalanlar normal. Bu doğum oranıdır, öldürmelerden sonra yaşayanlar arasında sabit oran garantisi değildir.
- Kalıcı hedef hafızası; köpek sürüsü farkındalık paylaşır. Görüş hattı ve fiziksel duvarlar saldırıları keser. Alevli 0.45 s hazırlık + 1.2 s alev püskürtme, 25 m sınır, alev topu değil. Ölü Alevli en fazla bir kez 6 m patlar; 90 taban alan hasarı mesafeyle azalır; zincir patlama mümkün.
- Köpek ısırığı süreli kanama (5 s, saniyede 3), Kovan böcekleri takip/temas ve zehir (5 s, saniyede 4) uygular. Kaynak Kovan ölümünde onun tüm sürüleri/zehri aynı tick kaldırılır, başka Kovanın sürüleri etkilenmez. Yeniden doğma durum etkilerini temizler.
- Gerçek kaynaklı sesler: umnachtung Freesound 533165 insan performansı canavar vokalleri (CC BY 4.0); Breviceps 445982 ölüm performansı (CC0); Denis Chardonnet BigSoundBank 0288 gerçek köpek havlamaları (CC0); Joseph SARDIN 1544 köpek sesleri, 1000 böcek ve mevcut 0931 şaloma kaydı (CC0). Kesme, ton/tempo uyarlama, katmanlama ve normalizasyon uygulandı. Gerçek zombi kayıtları veya Hunt: Showdown sesleri olduğu iddia edilmez.
- Dosyalar: `/frontend/public/audio/creatures/*.wav` (26), kaynak/attribution `/audio/CREDITS.txt`, hazırlama `/app/scripts/prepare_creature_audio.py`, indirilen kaynaklar `/root/deadzone-creature-audio`. Yeni hesap, parola, ücretli servis veya API anahtarı gerekmedi. MOCKED uygulama/API yok.

### Son doğrulama ve kapsam sınırı
- `yarn build` son kayıtlı ses güncellemesinden sonra başarılı; `/app/test_reports/build-latest.log`.
- Masaüstü 1920×800 ve mobil 390×844: seçim ve önizleme, canlı oyun, reload kontrolleri görüldü; yatay taşma bulunmadı. Canlı reload `pose=reload`, gerçek şarjör ofseti 0.487; bitince idle ve mühimmat 30/176 gözlendi. Skin/FBI oyuncu görünümü ve yeni düşman türlerinin sahnede çizimi görüldü.
- Tek kısa backend turu `/app/test_reports/iteration_3.json`: 10/10 geçti. Güncel hız/can/doğum oranı, hedef hafızası, yol noktası kullanımı, 25 m alev/LOS, 6 m tek ölüm patlaması, Kovan sürü/zehir temizliği, kanama, skin doğrulama/yeniden doğum, iki gerçek WebSocket istemcisinde skin ve reload alanları, 26 WAV'ın örnek ve lisans kontrolleri.
- Raporun belirttiği eski 50 m alev ve 5 m zombi beklentileri güncellendi. İlgili 4 kısa regresyon yeniden çalıştırıldı ve geçti. Eski smoke içindeki global LOS monkeypatch'i fixture ile izole edildi.
- Tam e2e, 200 oyuncu yükü, tüm bina rotaları, bütün skin×silah kombinasyonlarının görsel incelemesi veya son kayıtlı ses miksinin öznel dinleme değerlendirmesi yapılmadı. Yol testi yol noktası yürümeyi doğrular; bütün haritada yol bulma garantisi değildir. Kullanıcının uzun test istememe tercihi korundu.

### Güncel sonraki işler
- P0: Son kısa kontrollerde bilinen engelleyici ürün hatası yok; kullanıcı görsel/ses ve denge onayı bekleniyor.
- P1: Kalabalık oyuncu/düşman altında performans ve yol bulma ölçümü; mevcut 200 oyuncu kapasitesi henüz yük testiyle doğrulanmadı.
- P1: Kullanıcı geri bildirimine göre hız, alev hasarı, sürü sayısı ve ses seviyesi dengesi.
- P2: Daha ayrıntılı lisanslı insan/yaratık modelleri ve animasyonlar; çevresel ses/yankı.
- Olası sonraki iyileştirme: Kanamayı durduran sınırlı bandaj ve zehre karşı panzehir; henüz istenmedi/eklenmedi.

## Güncel çalışma — 2026-09-26: Çevrim içi gecikme ve takılma
### Kullanıcı isteği ve kapsam
- "Oyun içi bende MS çok yüksek görünüyor ve takılma kasma yaratıyor. Online için iyileştirmeler istiyorum."
- Onay/ölçüm: "Evet kabul ediyorum 300msden aşağı düşmüyor benim".
- P0 kapsamı: oyun döngüsünü yavaş bağlantılardan ayırma, istemci beklemelerini azaltma, yüksek gecikmede hareket yumuşatma; P1 kısa çok oyunculu doğrulama. Kullanıcı tarafında son doğrulama BEKLENİYOR.

### Bulgular ve uygulananlar
- Önceki `Game.run`, tüm oyuncuların WebSocket gönderimini `await gather` ile bekliyordu. Tek yavaş gönderim bütün simülasyonu geciktirebiliyordu. İstemci worker'ı ayrıca state verisini sabit 100 ms aralıklarla yayınlıyordu.
- Yeni `/backend/network.py`: her bağlantıya tek yazıcı görevi; en fazla bir bekleyen güncel state, 256 olay ve 8 kontrol mesajı. Eski state yerine yenisi gönderilir, olaylar sınır dahilinde sıralı birleştirilir. Pong bir sonraki state'den önceliklidir; tek bağlantının 500 ms gönderim zaman aşımı dünyayı bekletmez. Normal WebSocket kapanışı dahil görev/kuyruk temizliği eklendi.
- Sunucu 20 Hz döngüsünde ortak boss/sıralama verisini oyuncu başına tekrar hesaplamaz. State mesajında `seq`, `server_time`, `tick_ms`; oyuncuda simülasyonun işlediği `input_seq` onayı bulunur. `/api/status` artık tur işlem süresi, 50 ms aşım sayısı ve birleştirilen state sayısı da verir. Bunlar gerçek ölçümler; tick_ms uçtan uca ağ gecikmesi değildir.
- Worker sabit 100 ms yayın beklemesi olmadan iletir; ana ekrandan `state-consumed` gelene kadar en güncel state'i tutar, eski ekran mesajları birikmez. RTT monoton saatle 1 Hz ölçülür. Hareket başlama/durma, koşu, ateş ve reload değişimi anında; normal girdi yaklaşık 20 Hz. 8 KB giden buffer sınırı ve ana ekrandan 400 ms girdi gelmediğinde güvenli durdurma vardır.
- HUD güncellemesi yaklaşık 10 Hz, çizim motoruna state teslimi bağımsızdır. Yerel hareket tahmini RTT/2 ve snapshot yaşını hesaba katar; yeni yön/dur komutu sunucuda işlenmeden eski konuma çekilmez (650 ms üst sınır). Bu tam rollback/replay veya hitscan lag compensation değildir; hasar/cephane/puan sunucuda kalır.
- `/frontend/src/game/snapshotTrack.js`: uzak oyuncu/zombi için zaman damgalı ara konumlar, açı sarım düzeltmesi, 6 örnek sınırı, ışınlanmada sıfırlama; tahmini ileri hareket en çok 80 ms. Ağ dalgalanmasına göre 60–150 ms tampon.
- Otomatik grafik ayarı artık sürekli 32 ms üstü karelerde kademeli gölge/piksel yoğunluğu azaltır; ekran dışı karakter animasyonları atlanır. Harita geçişinde yeni görsel parça oluşturma kare başına bire dağıtılır; fizik engelleri önceden yüklenir.
- `/components/ConnectionStats.jsx/.css`: gerçek MS, FPS, RTT dalgalanması, sunucu işlem süresi ve eski veri uyarısı. Mobil font/kontrast iyileştirildi. Göstergeler gecikmeyi düşük göstermek için değiştirilmedi.
- Yol aramasında tüm uygun hedefleri sıralamak yerine tek en yakın hedef bulunur; yaratık dengesi değiştirilmedi. Repoda var olan boss oyun sistemi korundu, bu çalışmada boss eklenmedi.
- Yeni servis/API anahtarı/hesap yok. MOCKED ürün API/akışı yok; kontrollü testlerde sahte ağ soketleri kullanılır. Misafir erişim bilgileri `/memory/test_credentials.md` içinde.

### Doğrulama ve ölçüm sınırları
- `yarn build`, Python derleme ve public API kontrolü başarılı. `/test_reports/network-build.log`.
- `/test_reports/iteration_4.json`: 6/6 pytest, kontrollü worker/SnapshotTrack/MovementController testleri ve masaüstü/mobil kısa gameplay smoke geçti. İki gerçek oyuncuda karşılıklı görünürlük, hareket/durma, cephane/ateş, reload, ping, state sırası/onayı ve boss payload korundu. Ölüm/respawn sözleşmesi birim testte doğrulandı.
- 350 ms geciken sahte WebSocket dünya döngüsünü durdurmadı; gönderim zaman aşımı, kuyruk sınırları, olay sırası, pong önceliği doğrulandı. 300 ms RTT için worker zaman ölçümü ve yerel hareket onay beklemesi kontrollü testten geçti. Bu kullanıcının gerçek internet rotasını taklit eden kapsamlı bir ağ testi değildir.
- 6 oyuncu / 5 saniyelik kısa, çoğunlukla bekleyen istemci örneği: sunucu zamanına göre yaklaşık 19.72 Hz, RTT medyanı 44.88 ms, ortalama tur işlemi 2.381 ms. Raporun p95 diye yazdığı 87.93 ms yalnız az sayıdaki örneğin maksimumudur; güvenilir p95 değildir. Örnek scriptleri artık 20 ölçümden azsa p95 vermez, maksimum ve örnek sayısını ayrıca gösterir.
- Test raporundan sonra log kontrolü normal kapanışta `websockets.ConnectionClosedOK` hatasını buldu; yakalama ve özel regresyon eklendi. Son tekrar 6/6 geçti; yeni sunucu hata kaydı YOK. `/test_reports/network-retest.xml`, `/test_reports/network-retest-server.log`.
- 1920×800 ve 390×844 canlı canvas dolu, arayüz taşması yok. Son mobil font 10 px; bağlantı altı 86.5 px / skor üstü 90 px, çakışma yok. Yazı okunabilirliği notu giderildi.
- Yazılımsal WebGL test tarayıcısında düşük FPS devam edebiliyor (son örneklerde yaklaşık 2–10 FPS). Bu kullanıcı donanımı için FPS garantisi veya kontrollü önce/sonra performans karşılaştırması değildir. Grafik iyileştirmesinin kullanıcı cihazındaki etkisi henüz doğrulanmadı.
- Kullanıcının sürekli 300 ms üzeri RTT'si test rotasında tekrar üretilemedi. Ağ mesafesi, rota, cihaz ve uygulama yükünün kullanıcının sorunundaki payları kesin ayrıştırılmadı; 300 ms altına düşme garantisi verilmedi. 200 aktif oyuncu/kalabalık combat yük testi yapılmadı.

### Şu anki öncelikler (önceki sonraki iş listesinin güncel hali)
- P0: Kullanıcı oyuna yeniden katılıp yeni MS + FPS + SV değerlerini, takılma sürüyorsa ekran görüntüsünü paylaşmalı. Test edilen akışlarda bilinen engelleyici hata yok; kullanıcı ağında çözüm onayı bekleniyor.
- P1: Gerçek kullanıcı rotasında daha uzun RTT/jitter ve cihaz FPS ölçümü; 200 aktif oyuncu ve kalabalık düşman/çatışma yükü, olası mekânsal indeksleme. Kapasite/FPS/RTT garantisi verme.
- P1: İhtiyaç halinde tam input replay / lag compensation; mevcut sürüm sınırlı tahmin ve yumuşatma uygular.
- P2: İsteğe bağlı son 30 saniye bağlantı/FPS grafiği ve kopyalanabilir teşhis özeti; model/ses ve denge backlog'u korunur.
