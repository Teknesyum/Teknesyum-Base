# Uygulama testi ekranı ele geçirmesin — durum raporu

22.08.2026 · ölçümler bu makinede yapıldı (Ryzen 7 9700X · 16 iş parçacığı · 64 GB RAM ·
RTX 5070 Ti · C: 343 GB boş · Windows 11 Pro 22631)

## 1. Sorun aslında iki ayrı olay

**a) Ajan masaüstünü sürüyor.** `computer-use` araçları gerçek fare ve klavyeyi kullanır.
Windows'ta tek bir *girdi masaüstü* vardır: aynı anda ya sen yazarsın ya ajan tıklar.
Ajan çalışırken senin tuşların onun penceresine, onun tıklamaları senin pencerene gider.
Bu bir ayar değil, işletim sisteminin girdi modeli.

**b) Uygulama açılıp odağı çalıyor.** Ajan `dotnet run` dediğinde WPF penceresi öne
fırlar. Ekranı sürmese bile yazdığın cümlenin ortasında odak gider.

İkisinin çözümü aynı değil. (b) çoğu zaman tek satırlık bir başlangıç ayarıyla biter,
(a) gerçek bir izolasyon gerektirir.

## 2. İşe yaramayan yollar — ve neden

| Yol | Neden olmuyor |
|---|---|
| **Sanal masaüstü** (Win+Ctrl+D) | Sadece pencere gruplaması. Girdi kuyruğu tek, ön plan tek. Ajan tıkladığında masaüstü sana geri döner. |
| **İkinci kullanıcı oturumu** (hızlı kullanıcı değiştirme) | İstemci Windows'ta aynı anda tek etkileşimli oturum çizilir. Öteki oturum arka planda "bağlantısı kesik" durur, sentetik girdi gitmez. |
| **Kendi makinene RDP** | Bağlanınca konsol oturumu düşer — yani senin ekranın kilitlenir. Çok oturum açan yamalar lisans dışı. |
| **Ayrı masaüstü nesnesi** (Sysinternals Desktops, `CreateDesktop`) | Teoride ayrı girdi kuyruğu var. Ama DWM girdi masaüstü olmayan masaüstünü derlemez; WPF/DirectX pencerelerinin ekran görüntüsü siyah gelir. Üstelik `computer-use` aracında hedef masaüstü seçme diye bir şey yok. |

Kısacası **aynı Windows oturumunda ikinci bir "sanal ekran" kurup ajanı oraya
hapsetmek bugünkü araçlarla mümkün değil.** Ayrılık ancak ayrı bir işletim sistemi
örneğiyle olur.

## 3. İşe yarayan yollar

### 3.1 Ekranı hiç kullanmamak (en ucuz, en kalıcı)

Projelerin zaten başsız doğrulama altyapısına sahip — ölçtüm:

| Proje | Var olan başsız yol |
|---|---|
| VidShrink | `tests/VidShrink.Tests` + `tools/VidShrink.Bench` |
| Runly | `tests/Runly.Core.Tests` |
| ProcWitness | `tests/ProcWitness.Tests` |
| Ghostlist | `Ghostlist.Tests` + `Ghostlist.Cli` (arayüzsüz koşu) |
| CodeXray | `playwright.config.ts` (headless tarayıcı) |

Buradaki açık **arayüzün kendisi**: düğme gerçekten tıklanıyor mu, onay kutusu doğru
kapanıyor mu. Onun için de fare gerekmiyor:

- **FlaUI / UIAutomation.** Kontrolü UIA desenleriyle sürer (`Invoke`, `SetValue`,
  `Toggle`) — imleç kıpırdamaz, çoğu işlem ön plan istemez. WPF ve WinForms'un ikisinde
  de çalışır. Runly, ProcWitness ve VidShrink'in arayüz testleri buraya taşınabilir.
- **Test kipinde pencereyi ekran dışında açmak.** `--test` bayrağıyla
  `WindowStartupLocation=Manual`, `Left=-32000`, `ShowActivated=false`. Pencere var,
  görünmüyor, odağı almıyor.

Bu ikisi (a) ve (b)'nin **büyük kısmını** ortadan kaldırır ve hiçbir sanallaştırma
gerektirmez.

### 3.2 Hyper-V sanal makinesi (gerçek izolasyon)

Ayrı işletim sistemi, ayrı masaüstü, ayrı girdi kuyruğu. Ajan orada istediği kadar
tıklar, senin ekranın hiç sarsılmaz.

Bu makinede durum: **Hyper-V kapalı** — 22.08.2026'da açıldı, aynı gün kullanıcı kararıyla
geri kapatıldı. Arada yeniden başlatma olmadığı için özellik hiç etkinleşmedi, net değişim
sıfır. Windows Sandbox kapalı. Kaynak sıkıntısı yok (63,6 GB RAM, 333 GB boş, 16 iş parçacığı).

**Karar:** bu yol şimdilik rafta. Ekran kapısı (§4.1) odak çalma sorununu zaten kapatıyor;
VM ancak "arayüzü gerçekten tıklatarak görmem gerek" diyen iş kaldığında gerekecek.

Bilmen gerekenler:

- **Hipervizör bedeli zaten ödeniyordu — bu belgenin ilk hâli yanılıyordu.** Ölçüm:
  `HypervisorPresent` daha Hyper-V açılmadan `True`, çünkü **VBS/HVCI (Bellek Bütünlüğü)**
  çalışıyor (`SecurityServicesRunning = 2`). Windows 11'in uygun donanımdaki varsayılanı bu.
  Yani hile korumalarını ve VMware/VirtualBox'ı etkileyen hipervizör zaten devredeydi;
  Hyper-V onun üstüne VM yığınını ekliyor, yeni bir hipervizör bedeli getirmiyor.
  Karar yine de geri alınabilir ve makinenin tamamını ilgilendiriyor — ama sanılandan ucuz.
- **GPU:** NVENC testleri sanal makinede güvenilir değil. Tüketici kartlarında GPU-P
  (bölümleme) resmî desteklenmiyor, sürücü dosyalarını konuğa elle kopyalamak gerekiyor.
  VidShrink'in donanım kodlayıcı yolu **host'ta** test edilmeye devam etmeli; sanal
  makineye giden yalnızca arayüz ve CPU yolu olur.
- Ajanı sanal makinede nasıl çalıştırırsın: **içine Claude Code kurmaya gerek yok.**
  `Invoke-Command -VMName` (PowerShell Direct) host'taki ajanın konuk içinde komut
  çalıştırmasını sağlar — VMBus üzerinden, ağsız, konsolsuz, penceresiz. VM'in arayüzü
  vardır ama kullanıcının monitörüne hiç çizilmez. `VMConnect` çizerdi; kullanılmaz.
  Ekran görüntüsü konuğun içinde alınıp paylaşılan klasöre yazılır, ajan dosyayı okur.
  Bu, belgenin ilk hâlindeki "VM'e Claude Code kur, `/rc` ile izle" adımını ve onunla
  gelen tarayıcı girişini tümden kaldırır.
- PowerShell Direct konuk hesabı kimlik doğrular; atılabilir bir test VM'i için bile bir
  parola gerekir ve o parolayı kullanıcı belirler.

### 3.3 Windows Sandbox (hafif, tek kullanımlık)

Aynı hipervizör bedeli, ama saniyeler içinde açılıp kapanan temiz bir Windows. `.wsb`
dosyasıyla klasör bağlanır, açılışta komut çalıştırılır. "Kurulum temiz makinede çalışıyor
mu, program ilk açılışta ne yapıyor" sorusu için biçilmiş kaftan. Kalıcı durum tutmaz —
her koşuda .NET çalışma zamanını kurmak gerekir; sürekli arayüz testi için uygun değil.
vGPU açılabiliyor ama NVENC'e güvenme.

### 3.4 İkinci makine

Elinde ikinci bir Windows makinesi varsa en temiz yol budur: Claude Code oraya kurulur,
`/rc` ile uzak denetim açılır, testler orada koşar. Hipervizör bedeli yok, GPU gerçek.
Yoksa 3.1 + 3.2 birlikte aynı kapıya çıkar.

## 4. Base tarafında ne yapılabilir

Ajanın ekranı **istemesi** engellenemez ama **habersiz alması** engellenebilir:

1. **Ekran kapısı (kanca).** `mcp__computer-use__*` çağrıları `PreToolUse`'ta durdurulur.
   Ajan ne yapmak istediğini yazar, iş kuyruğa alınır, tek satır bildirim düşer:
   *"ekranı isteyen bir iş var"*. Sen hazır olduğunda `/ekran` dersin, kapı bir tur açılır.
   Odak bozulması ortadan kalkar; karar sende kalır.

   **Uygulandı** — `teknesyum/hooks/ekran-kapisi.js`. İki kolu var: ekranı süren araç
   çağrıları (`mcp__computer-use__*`, `mcp__Windows-MCP__*` — `Screenshot`, `Snapshot`,
   `Scrape`, `PowerShell`, `FileSystem`, `Registry`, `Process`, `Wait`, `Clipboard` muaf)
   ve masaüstü penceresi açan kabuk komutları (`dotnet run`, electron başlatma,
   `bin/Debug|Release/**.exe`, `Start-Process ... .exe`). `dotnet test`, `dotnet build`
   ve `--headless`/`--test` gibi açık başsızlık bayrağı taşıyan komutlar hiç engellenmez.
   Engelleme mesajı §3.1'deki başsız alternatifi ve ekran dışı pencere reçetesini verir.

   **Kapatmak:** `~/.claude/teknesyum.json` içine `"ekran_kapisi": false`. Kanca hiçbir
   şey yapmadan çıkar; anahtar yoksa kapı açıktır.

   **Tümden sökmek:** `teknesyum/hooks/ekran-kapisi.js` dosyasını sil ve `hooks.json`
   içindeki `PreToolUse` bloğundan `matcher: "Bash|mcp__computer-use__.*|mcp__Windows-MCP__.*"`
   girdisini kaldır. Başka hiçbir dosyaya dokunmaz — `relay-watch.js` kapıdan habersizdir.
2. **Kural.** `standartlar.md`'ye tek madde: uygulama doğrulaması başsız koşuyla yapılır;
   arayüz gerekiyorsa UIA, ekran sürme son çaredir ve izin ister.
3. **Test kipi maddesi.** Her masaüstü programına `--test` bayrağı: pencere ekran dışında,
   odak almadan açılır. Yeni projelerde varsayılan, mevcut üç projede birer sözleşme.
4. **(İsteğe bağlı) `/vm`.** Hyper-V test makinesini kuran, açan ve içine Claude Code
   yerleştiren komut. Ancak hipervizör kararını sen verdikten sonra anlamlı.

## 5. Öneri

Sırayla: **1 → 3 → 2**, sanallaştırma en sona.

Ekran kapısı bugün yazılır, odak sorununu bugün bitirir. Test kipi ve UIA, ekranı isteme
ihtiyacının çoğunu ortadan kaldırır. Hyper-V ancak "arayüzü gerçekten tıklatarak görmem
gerek" dediğin iş kaldığında gerekir — ve o zaman bile NVENC ölçümü host'ta kalır.
