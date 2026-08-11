using System.Drawing;

namespace Teknesyum.Theme;

/// Teknesyum Neon — WinForms/konsol paleti. Değerleri değiştirme.
public static class Palette
{
    public static readonly Color NeonBlue   = ColorTranslator.FromHtml("#00F3FF");
    public static readonly Color NeonPink   = ColorTranslator.FromHtml("#FF00EA");
    public static readonly Color NeonPurple = ColorTranslator.FromHtml("#B026FF");
    public static readonly Color Success    = ColorTranslator.FromHtml("#34D399");

    public static readonly Color Surface    = ColorTranslator.FromHtml("#08090A");
    public static readonly Color AppBg      = ColorTranslator.FromHtml("#050507");

    public static readonly Color TextBody   = ColorTranslator.FromHtml("#D1D5DB");
    public static readonly Color TextDim    = ColorTranslator.FromHtml("#9CA3AF");
    public static readonly Color TextLabel  = ColorTranslator.FromHtml("#6B7280");
    public static readonly Color TextHint   = ColorTranslator.FromHtml("#4B5563");

    public static readonly Font  H2         = new("Segoe UI", 13.5f, FontStyle.Bold);
    public static readonly Font  H3         = new("Segoe UI", 10.5f, FontStyle.Bold);
    public static readonly Font  LabelFont  = new("Segoe UI", 7.5f, FontStyle.Bold);
    public static readonly Font  Body       = new("Segoe UI", 10f);
    public static readonly Font  Mono       = new("Consolas", 10.5f, FontStyle.Bold);
    public static readonly Font  Hero       = new("Consolas", 18f, FontStyle.Bold);

    public const string Author     = "Teknesyum";
    public const string GitHubUrl  = "https://github.com/Teknesyum";
    public const string SponsorUrl = "https://github.com/sponsors/Teknesyum";
    public const bool   SponsorActive = false;
}

/// ANSI konsol renkleri (Runly gibi CLI projeleri için).
public static class Ansi
{
    public const string Blue    = "[38;2;0;243;255m";
    public const string Pink    = "[38;2;255;0;234m";
    public const string Purple  = "[38;2;176;38;255m";
    public const string Success = "[38;2;52;211;153m";
    public const string Dim     = "[38;2;107;114;128m";
    public const string Bold    = "[1m";
    public const string Reset   = "[0m";
}
