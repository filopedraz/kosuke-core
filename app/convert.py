#!/usr/bin/env python3
"""
oklch_to_hex_hsl.py
Parse CSS, find variables with oklch(...) values, and convert them to HEX and HSL(A).

Usage:
  python oklch_to_hex_hsl.py design.css
  cat design.css | python oklch_to_hex_hsl.py
"""

import math
import re
import sys
from typing import Dict, List, Optional, Tuple

# --- OKLCH → sRGB helpers (no external libs) ---------------------------------


def oklch_to_oklab(L: float, C: float, h_deg: float) -> Tuple[float, float, float]:
    # When C == 0 hue is undefined; we can treat a=b=0
    if C == 0 or math.isnan(C):
        return L, 0.0, 0.0
    h = math.radians(h_deg % 360.0)
    a = C * math.cos(h)
    b = C * math.sin(h)
    return L, a, b


def oklab_to_linear_srgb(L: float, a: float, b: float) -> Tuple[float, float, float]:
    # OKLab → LMS'
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b

    # Nonlinear to linear (cube)
    l = l_**3
    m = m_**3
    s = s_**3

    # LMS → linear sRGB
    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return r, g, b


def linear_to_srgb(u: float) -> float:
    # gamma encode
    if u <= 0.0031308:
        return 12.92 * u
    return 1.055 * (abs(u) ** (1 / 2.4)) * (1 if u >= 0 else -1) - 0.055


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def oklch_to_srgb(L: float, C: float, h_deg: float) -> Tuple[float, float, float]:
    L = float(L)
    C = float(C)
    h_deg = float(h_deg)
    L = max(0.0, min(1.0, L))
    L_, a, b = oklch_to_oklab(L, C, h_deg)
    r_lin, g_lin, b_lin = oklab_to_linear_srgb(L_, a, b)
    # encode + clip to gamut by clamping (simple, but robust)
    r = clamp01(linear_to_srgb(r_lin))
    g = clamp01(linear_to_srgb(g_lin))
    b = clamp01(linear_to_srgb(b_lin))
    return r, g, b


# --- sRGB → HEX / HSL helpers -------------------------------------------------


def srgb_to_hex(r: float, g: float, b: float, alpha: Optional[float] = None) -> str:
    ri = int(round(clamp01(r) * 255))
    gi = int(round(clamp01(g) * 255))
    bi = int(round(clamp01(b) * 255))
    if alpha is None or alpha >= 1.0:
        return f"#{ri:02X}{gi:02X}{bi:02X}"
    ai = int(round(clamp01(alpha) * 255))
    return f"#{ri:02X}{gi:02X}{bi:02X}{ai:02X}"


def srgb_to_hsl(r: float, g: float, b: float) -> Tuple[float, float, float]:
    # standard HSL in sRGB space
    r = clamp01(r)
    g = clamp01(g)
    b = clamp01(b)
    mx = max(r, g, b)
    mn = min(r, g, b)
    L = (mx + mn) / 2.0
    d = mx - mn
    if d == 0:
        H = 0.0
        S = 0.0
    else:
        S = d / (1.0 - abs(2.0 * L - 1.0))
        if mx == r:
            H = ((g - b) / d) % 6.0
        elif mx == g:
            H = ((b - r) / d) + 2.0
        else:
            H = ((r - g) / d) + 4.0
        H *= 60.0
    return H % 360.0, S, L


def hsl_string(h: float, s: float, l: float, alpha: Optional[float] = None) -> str:  # noqa: E741
    s_pct = round(s * 100, 1)
    l_pct = round(l * 100, 1)
    h_deg = round(h, 1)
    if alpha is None or alpha >= 1.0:
        return f"hsl({h_deg} {s_pct}% {l_pct}%)"
    a_str = f"{round(alpha, 4)}" if alpha <= 1 else "1"
    return f"hsla({h_deg} {s_pct}% {l_pct}% / {a_str})"


# --- CSS parsing --------------------------------------------------------------

OKLCH_RE = re.compile(
    r"""
    (?P<name>--[A-Za-z0-9_-]+)\s*:\s*
    oklch\(
        \s*(?P<L>[0-9]*\.?[0-9]+)\s+            # L
        (?P<C>[0-9]*\.?[0-9]+)\s+               # C
        (?P<h>[0-9]*\.?[0-9]+)                  # h (degrees)
        (?:\s*/\s*(?P<a>(?:[0-9]*\.?[0-9]+%?)))? # optional / alpha
    \)\s*;
    """,
    re.VERBOSE | re.IGNORECASE,
)

SECTION_RE = re.compile(r"^\s*:root\b|\b\.dark\b", re.IGNORECASE)


def parse_alpha(a_str: Optional[str]) -> Optional[float]:
    if a_str is None:
        return None
    s = a_str.strip()
    if s.endswith("%"):
        return max(0.0, min(1.0, float(s[:-1]) / 100.0))
    return max(0.0, min(1.0, float(s)))


def detect_section_headers(text: str) -> Dict[int, str]:
    """
    Map line index to current section ('root' or 'dark') by scanning the file.
    """
    lines = text.splitlines()
    section_map: Dict[int, str] = {}
    current = "root"
    for i, line in enumerate(lines):
        if ":root" in line:
            current = "root"
        elif re.search(r"\.dark\b", line):
            current = "dark"
        section_map[i] = current
    return section_map


def extract_colors(css_text: str) -> List[Dict[str, str]]:
    sec_map = detect_section_headers(css_text)
    out = []
    for m in OKLCH_RE.finditer(css_text):
        # determine which section this match is in by line number
        line_index = css_text[: m.start()].count("\n")
        theme = sec_map.get(line_index, "root")

        name = m.group("name")
        L = float(m.group("L"))
        C = float(m.group("C"))
        h = float(m.group("h"))
        alpha = parse_alpha(m.group("a"))

        r, g, b = oklch_to_srgb(L, C, h)
        hex_str = srgb_to_hex(r, g, b, alpha)
        H, S, L2 = srgb_to_hsl(r, g, b)
        hsl_str = hsl_string(H, S, L2, alpha)

        out.append(
            {
                "theme": theme,
                "var": name,
                "oklch": f"oklch({L} {C} {h}"
                + (f" / {m.group('a')}" if m.group("a") else "")
                + ")",
                "hex": hex_str,
                "hsl": hsl_str,
            }
        )
    return out


def print_table(rows: List[Dict[str, str]]) -> None:
    if not rows:
        print("No oklch() colors found.")
        return
    # fixed-width friendly table
    headers = ["theme", "var", "oklch", "hex", "hsl"]
    widths = {h: max(len(h), max(len(r[h]) for r in rows)) for h in headers}
    line = " | ".join(h.ljust(widths[h]) for h in headers)
    sep = "-+-".join("-" * widths[h] for h in headers)
    print(line)
    print(sep)
    for r in rows:
        print(" | ".join(r[h].ljust(widths[h]) for h in headers))


def main():
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            css_text = f.read()
    else:
        css_text = sys.stdin.read()
    rows = extract_colors(css_text)
    print_table(rows)


if __name__ == "__main__":
    main()
