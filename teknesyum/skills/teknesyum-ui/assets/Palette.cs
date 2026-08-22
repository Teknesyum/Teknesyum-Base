using System.Drawing;

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

    public static readonly Color BorderDefault    = Color.FromArgb(0x80, 0x00, 0xF3, 0xFF);
    public static readonly Color BorderStrong     = Color.FromArgb(0x99, 0x00, 0xF3, 0xFF);
    public static readonly Color BorderDecorative = Color.FromArgb(0x4D, 0x00, 0xF3, 0xFF);

    public static readonly Color FocusRing      = ColorTranslator.FromHtml("#00F3FF");
    public static readonly Color FocusRingInner = ColorTranslator.FromHtml("#000000");

    public static readonly Color TextBody   = ColorTranslator.FromHtml("#FFFFFF");
    public static readonly Color TextDim    = ColorTranslator.FromHtml("#FFFFFF");
    public static readonly Color TextLabel  = ColorTranslator.FromHtml("#00F3FF");
    public static readonly Color Disabled   = ColorTranslator.FromHtml("#71717A");

    public static readonly Font  H2         = new("Segoe UI", 15f, FontStyle.Bold);
    public static readonly Font  H3         = new("Segoe UI", 12f, FontStyle.Bold);
    public static readonly Font  LabelFont  = new("Segoe UI", 10.5f, FontStyle.Bold);
    public static readonly Font  Body       = new("Segoe UI", 12f);
    public static readonly Font  Mono       = new("Consolas", 12f, FontStyle.Bold);
    public static readonly Font  Hero       = new("Consolas", 21f, FontStyle.Bold);

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
