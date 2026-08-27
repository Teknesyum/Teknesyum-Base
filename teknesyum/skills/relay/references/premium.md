# Premium doktrini — bağlamdaki sekiz emrin gerekçesi ve ayrıntısı

Premium profil açıkken bağlama her oturumda kısa bir not düşer: emirler orada, gerekçe
burada. Notu okuyup ne yapacağını biliyorsan bu dosyayı açmana gerek yok. Nedenini merak
ettiğinde, bir emri esnetmek üzereyken ya da konseyin/görüşün biçimini yazarken oku.

Bağlamdaki not (`dil.js` · `premiumNotu`) şudur:

> Premium mode is on. Agents: opus; scribe and the first scout pass run sonnet, never
> haiku. Independent contracts run at
> once: 20 parallel, worktree past 3. Parallel is default; one agent needs a reason. Open
> agents without asking. Tokens are not a reason. Deterministic tool before model. New
> project: fable+opus plan council before PLAN.md. Second opinion: advisor (fable).
> Why: relay/references/premium.md

Profil Max 20x aboneliğini varsayar — notun eski hali bunu açıkça yazardı
("Premium mode is on (Max 20x).") — ve aşağıdaki her madde o kapasitenin karşılığıdır.

---

## 1. Model — opus esas, angarya işte sonnet, haiku hiç

Premium modda ajan modeli iş ağırlığına göre serbestçe seçilmez: esas model opus'tur ve
haiku hiçbir rolde koşmaz. Ucuz modele düşmek çoğu işte tasarruf değil kalite kaybıdır —
işi ikinci turda düzeltmek, ilk turda opus koşmaktan pahalıdır.

Tek sapma angarya iştedir: `scribe` sonnet koşar, `scout` ilk tarama tabakasında sonnet
koşar. Gerekçe: angarya iş modelin en pahalısını hak etmiyor — isim değiştirme, biçim
düzeltme, elli deponun ilk sığ elemesi karar üretmez, kalıp uygular. Ölçüt rolde yazılıdır,
sözleşmede değil: rolde yazılan kural kimlik kancasıyla ölçülür, sözleşmede yazılan
temenni olur.

Düşmeyen roller ve nedeni: `auditor` — denetçi işçiden zayıf olamaz · `planner` — konsey
tanımı fable+opus · `advisor` — zaten fable · `builder` ve `ui-builder` — kod üreten iş
angarya değildir.

> Run opus; scribe and the first scout pass run sonnet because that work is drudgery, and
> haiku never runs.

## 2. Paralellik — sıraya alma, aynı anda koş

Bağımsız sözleşmeler birbirini beklemez. Tavan yirmi ajandır; üçten sonrası worktree
yalıtımıyla açılır, böylece aynı dosyaya yazan iki ajan birbirini ezmez.

> Do not queue independent contracts, run them at once — up to twenty agents in parallel,
> with worktree isolation past three.

## 3. Paralel varsayılan, tek ajan gerekçe ister

Bölünebilen işi bölmemek açıklama gerektirir. Beş on el birden çalışır, iş biter, sonraki
adıma geçilir. Tek ajan yalnız iş gerçekten küçükse doğrudur.

> Going parallel is the default here and going with a single agent needs a reason: split
> the work when it can be split, get it done five or ten hands at a time, then move to the
> next step. A single agent is right only when the job really is small.

## 4. Ajan açmak için izin beklenmez

Karar senindir, kendi ölçünle verirsin. Kullanıcı ayrıca istediğinde de açarsın; istemesi
şart değildir.

> Do not wait for the user to authorise opening an agent — the call is yours to make on
> your own measure, and when the user does ask you open one anyway.

## 5. Token tasarrufu burada gerekçe değil

Okumak grep'lemekten daha iyi cevap veriyorsa oku. Aramayı geniş tut. Denetimi her
sözleşmede koş. Düşünme seviyesini işe göre ayarla: mekanik, kalıbı belli işte uğraşma;
karar ve hata ayıklamada sonuna kadar in.

> Saving tokens is not a reason here — read the file when reading answers better than
> grepping, keep the search wide, run the audit on every contract. Match thinking to the
> work: do not labour over mechanical, pattern-fixed tasks; go all the way down on
> decisions and debugging.

## 6. Deterministik alet model çağrısından önce gelir

Bu seçim tokenla ilgili değil, doğrulukla ilgilidir: sed, prettier, rg ve IDE refactor
aynı işi hatasız yapar.

> A deterministic tool still comes before a model call — that choice is about correctness,
> not tokens.

## 7. Plan konseyi

Sıfırdan bir projede PLAN.md yazılmadan önce iki planner ajanı aynı brifingle açılır: biri
fable, biri opus. İkisi de işi yapmaz, yalnız öneri döner. İkisinin anlaştığı şey
doğrulanmış sayılır; her ayrışma PLAN.md içinde **Konsey ayrışması** başlığı altına kendi
gerekçenle yazılır.

> The plan council is on: before writing PLAN.md on a from-scratch project, open two
> planner agents with the same briefing — one fable, one opus. Neither does the work, they
> only return proposals; treat what both agree on as confirmed and record every
> disagreement under a Konsey ayrışması heading in PLAN.md with your reasoning.

## 8. İkinci görüş — advisor

Doğru kararı bilmediğin bir düğümde advisor ajanını aç; fable kısa cevap verir, en fazla
üç başlık.

**Ne zaman açılır:** geri dönüşü pahalı bir seçimde, üç turdur çözülmemiş hatada, bir
kuralı çiğnemek üzereyken, iki türlü okunan bir istekte ve kullanıcı her plan
istediğinde. Mekanik işte açılmaz. Sorabildiğin her yerde önce kullanıcıya sor.

**Konseyle karıştırma:** konsey sıfırdan projede PLAN.md için iki üyeyle açılır; plan
kontrolü kullanıcı "plan yap" dediğinde tek üyedir.

Görüş bağlayıcı değildir — katılmıyorsan gerekçeni yaz. Görüş aldığını
`Teknesyum ▸ Görüş ▸ …` satırıyla bildir (İngilizce oturumda `Teknesyum ▸ Opinion ▸ …`).

> The second opinion is on as well: at a node where you do not know the right call, open
> the advisor agent and fable answers short, under three headings. Open it for a choice
> that is expensive to undo, a bug unsolved for three rounds, a rule you are about to
> break, a request that reads two ways, and every time the user asks for a plan; not for
> mechanical work, and ask the user first whenever you are allowed to ask. Do not confuse
> the plan check with the council: the council opens with two members for PLAN.md on a
> from-scratch project, the check is one member whenever the user says make a plan. The
> opinion is not binding — write your reasoning when you disagree, and report that you
> took one with a `Teknesyum ▸ Görüş ▸ …` line.

## 9. Ön araştırma — elli depo

Premium modda scout'un tarayacağı depo sayısı elli sayılır.

> Prior art in this mode means 50 repositories.
