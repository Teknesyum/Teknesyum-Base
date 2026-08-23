using System.Drawing;
using System.Drawing.Text;
using System.Linq;

namespace Teknesyum.Theme;

/// Teknesyum Neon — WinForms/konsol paleti. Değerleri değiştirme.
public static class Palette
{
    public static readonly Color NeonBlue   = ColorTranslator.FromHtml("#00F3FF");
    public static readonly Color NeonPink   = ColorTranslator.FromHtml("#FF00EA");
    public static readonly Color NeonPurple = ColorTranslator.FromHtml("#B026FF");
    public static readonly Color Success    = ColorTranslator.FromHtml("#34D399");

    public static readonly Color PinkText   = ColorTranslator.FromHtml("#FF54EB");
    public static readonly Color PurpleText = ColorTranslator.FromHtml("#C67EFF");

    public static readonly Color Surface    = ColorTranslator.FromHtml("#08090A");
    public static readonly Color AppBg      = ColorTranslator.FromHtml("#000000");
    public static readonly Color AppBgFrom  = ColorTranslator.FromHtml("#000000");
    public static readonly Color AppBgTo    = ColorTranslator.FromHtml("#08090A");

    public static readonly Color BorderDefault    = Color.FromArgb(0x80, 0x00, 0xF3, 0xFF);
    public static readonly Color BorderStrong     = Color.FromArgb(0x99, 0x00, 0xF3, 0xFF);
    public static readonly Color BorderDecorative = Color.FromArgb(0x4D, 0x00, 0xF3, 0xFF);

    public static readonly Color FocusRing      = ColorTranslator.FromHtml("#00F3FF");
    public static readonly Color FocusRingInner = ColorTranslator.FromHtml("#000000");

    public static readonly Color TextBody   = ColorTranslator.FromHtml("#FFFFFF");
    public static readonly Color TextLabel  = ColorTranslator.FromHtml("#00F3FF");

    /// Devre dışı kontrol 7:1'den muaftır (SKILL §2) ve bedeli vardır: renk körü
    /// kullanıcı griyi göremez. Bu renk tek başına kullanılmaz — devre dışı her
    /// kontrol griliğe ek bir işaret taşır: `ToolTip` metni ZORUNLU, yanında
    /// `Cursor = Cursors.No` ve mümkünse bir ikon. Yalnız soluklaştırılmış kontrol
    /// eksik teslimdir.
    ///
    /// "Soluk metin" rolü 23.08.2026'da tamamen silindi: `TextBody` ile birebir aynı
    /// değeri taşıyordu ve iki adı olan tek değer er geç ayrışır. İkincil metin için
    /// çözüm gri vermek değil, metni silmektir (SKILL §2, "ara gri yok").
    public static readonly Color Disabled   = ColorTranslator.FromHtml("#71717A");

    /// Yarıçap tektir: 6 DIP (SKILL §5, `layout.md` §5.1). Kart, panel, düğme ve
    /// hücre aynı değeri alır. Tek istisna dairedir: `?` rozeti, slider thumb,
    /// durum noktası.
    public const int Radius = 6;

    /// Zincirin tek kaynağı SKILL §3'tür. WinForms `Font` yedek zincir almaz, bu
    /// yüzden kurulu olan ilk aile seçilir. Atkinson Hyperlegible Next varsayılandır
    /// ve projeye gömülür (`PrivateFontCollection`); gömülmediyse Segoe UI'ye düşer —
    /// bu bir kabul değil, eksik teslimdir.
    public static string Aile(params string[] adaylar)
    {
        using var kurulu = new InstalledFontCollection();
        var adlar = kurulu.Families.Select(f => f.Name).ToHashSet();
        return adaylar.FirstOrDefault(adlar.Contains) ?? adaylar[^1];
    }

    public static readonly string SansAdi = Aile("Atkinson Hyperlegible Next", "Segoe UI");
    public static readonly string MonoAdi = Aile("Cascadia Mono", "Consolas");

    // Ölçek 1.25 major third — 14 / 16 / 20 / 24 / 30 DIP. Punto karşılığı 96 dpi'de
    // DIP × 0.75'tir: 10.5 / 12 / 15 / 18 / 22.5.
    //
    // AĞIRLIK TELAFİSİ: SKILL §3 başlık ve etikette 600 (SemiBold) istiyor;
    // `FontStyle` yalnız Regular ve Bold tanıyor, ara ağırlık yok. Başlıklar burada
    // Bold kalır ve fark boyutla kurulur (h2 18pt, h3 15pt, etiket 10.5pt) — üç
    // seviye boyutla ayrıştığı için ağırlığın tek başına hiyerarşi taşıması
    // gerekmiyor. Gerçek 600 isteniyorsa `GDI+` yerine `PrivateFontCollection` ile
    // variable font'un SemiBold kesiti yüklenir; o zaman bu telafi kalkar.
    //
    // Satır yüksekliği de WinForms `Font` üzerinden verilemez; `TextRenderer` çizim
    // yaparken satır aralığı elle 1.5 (gövde) / 1.2 (başlık) katsayısıyla kurulur.
    public static readonly Font  H2         = new(SansAdi, 18f, FontStyle.Bold);
    public static readonly Font  H3         = new(SansAdi, 15f, FontStyle.Bold);
    public static readonly Font  LabelFont  = new(SansAdi, 10.5f, FontStyle.Bold);
    public static readonly Font  Body       = new(SansAdi, 12f);
    public static readonly Font  Hint       = new(SansAdi, 10.5f);
    public static readonly Font  Mono       = new(MonoAdi, 12f, FontStyle.Bold);
    public static readonly Font  Hero       = new(MonoAdi, 22.5f, FontStyle.Bold);

    public const string Author     = "Teknesyum";
    public const string GitHubUrl  = "https://github.com/Teknesyum";
    public const string SponsorUrl = "https://github.com/sponsors/Teknesyum";
    public const bool   SponsorActive = true;
}

/// ANSI konsol renkleri (Runly gibi CLI projeleri için).
public static class Ansi
{
    public const string Blue       = "[38;2;0;243;255m";
    public const string Pink       = "[38;2;255;0;234m";
    public const string Purple     = "[38;2;176;38;255m";
    public const string PinkText   = "[38;2;255;84;235m";
    public const string PurpleText = "[38;2;198;126;255m";
    public const string Success    = "[38;2;52;211;153m";
    public const string Disabled   = "[38;2;113;113;122m";
    public const string Bold       = "[1m";
    public const string Reset      = "[0m";
}
