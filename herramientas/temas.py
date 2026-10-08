"""Genera los temas de terminal de assets/style.css (el bloque entre "temas:inicio" y "temas:fin").

Uso: python3 herramientas/temas.py

Cada tema tiene variante de noche y de día, como las terminales. Cada variante da cinco tonos neutros
(fondo, borde, comentario, texto, tinta) y cinco colores de su paleta, uno por casillero de acento. Los
casilleros conservan sus ids (naranja, verde, azul, ambar, magenta: los usa ascii.js), pero cada tema pone
su color propio: en Dracula el casillero "azul" es su púrpura. Los nombres visibles y el acento por defecto
de cada tema están en TEMAS de site.js.
El script deriva n1/n2 (paneles y líneas) y a1/a2/a4 (relleno, borde suave, brillante) y corrige el
contraste WCAG: texto suave y acento >= 4,5:1, texto >= 7:1 sobre el fondo y los paneles. Salen hex de 6
dígitos porque los canvas los leen así (ver diagramas.js).
El tema "apuntes" (pizarra de noche, papel de día) está escrito a mano arriba del bloque y no pasa por acá.
"""
import pathlib
import re

ACENTOS = ["naranja", "verde", "azul", "ambar", "magenta"]

# tema: {"noche"|"dia": ("n0 n3 n4 n5 n6", "naranja verde azul ámbar magenta")}
TEMAS = {
    "dracula": {  # de día: Alucard, la variante clara oficial
        "noche": ("#282a36 #4d5066 #6272a4 #f8f8f2 #ffffff", "#ffb86c #50fa7b #bd93f9 #f1fa8c #ff79c6"),
        "dia": ("#fffbeb #cfcfde #6c664b #1f1f1f #000000", "#a34d14 #14710a #644ac9 #846e15 #a3144d"),
    },
    "gruvbox": {
        "noche": ("#282828 #504945 #a89984 #ebdbb2 #fbf1c7", "#fe8019 #b8bb26 #83a598 #fabd2f #d3869b"),
        "dia": ("#fbf1c7 #d5c4a1 #7c6f64 #3c3836 #282828", "#af3a03 #79740e #076678 #b57614 #8f3f71"),
    },
    "nord": {  # Nord no tiene variante clara oficial: Snow Storm de fondo y Polar Night de texto
        "noche": ("#2e3440 #4c566a #8a94a7 #d8dee9 #eceff4", "#d08770 #a3be8c #88c0d0 #ebcb8b #b48ead"),
        "dia": ("#eceff4 #bfc6d3 #4c566a #3b4252 #2e3440", "#d08770 #a3be8c #5e81ac #ebcb8b #b48ead"),
    },
    "solarized": {
        "noche": ("#002b36 #33555e #657b83 #93a1a1 #eee8d5", "#cb4b16 #859900 #268bd2 #b58900 #d33682"),
        "dia": ("#fdf6e3 #bcc1b8 #657b83 #586e75 #073642", "#cb4b16 #859900 #268bd2 #b58900 #d33682"),
    },
    "catppuccin": {  # Mocha de noche, Latte de día
        "noche": ("#1e1e2e #45475a #9399b2 #cdd6f4 #eef1fc", "#fab387 #a6e3a1 #89b4fa #f9e2af #cba6f7"),
        "dia": ("#eff1f5 #bcc0cc #6c6f85 #4c4f69 #2a2c40", "#fe640b #40a02b #1e66f5 #df8e1d #8839ef"),
    },
    "tokyo": {  # Tokyo Night de noche, Tokyo Night Day de día
        "noche": ("#1a1b26 #3b4261 #737aa2 #c0caf5 #e4e9ff", "#ff9e64 #9ece6a #7aa2f7 #e0af68 #bb9af7"),
        "dia": ("#e1e2e7 #a8aecb #6172b0 #3760bf #1f2a50", "#b15c00 #587539 #2e7de9 #8c6c3e #9854f1"),
    },
    "puro": {  # negro puro (pantallas OLED) y blanco puro
        "noche": ("#000000 #333333 #9e9e9e #e6e6e6 #ffffff", "#ff8c1a #33ff66 #4da6ff #ffcc00 #ff4dd2"),
        "dia": ("#ffffff #b8b8b8 #595959 #1a1a1a #000000", "#e65c00 #00a33c #0066ff #cc9900 #d6009f"),
    },
}


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def mezcla(a, b, t):
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(rgb(a), rgb(b)))


def contraste(a, b):
    def lum(h):
        c = [v / 255 for v in rgb(h)]
        c = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    x, y = sorted((lum(a), lum(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


def asegurar(c, fondos, minimo, hacia):
    """Acerca c a 'hacia' de a 1 % hasta llegar al contraste mínimo contra todos los fondos."""
    for i in range(101):
        r = mezcla(c, hacia, i / 100)
        if min(contraste(r, f) for f in fondos) >= minimo:
            return r
    raise ValueError(f"{c}: no llega a {minimo}:1")


def bloque(id_, claro, neutros, ansi):
    n0, n3, n4, n5, n6 = neutros.split()
    n1, n2 = mezcla(n0, n3, 0.15), mezcla(n0, n3, 0.35)
    tope = "#000000" if claro else "#ffffff"
    n4 = asegurar(n4, (n0, n1, n2), 4.5, tope)
    n5 = asegurar(n5, (n0, n1), 7, tope)
    k1, k2 = (0.10, 0.40) if claro else (0.16, 0.50)
    tonos = {}
    for nombre, c in zip(ACENTOS, ansi.split()):
        a3 = asegurar(c, (n0, n1, n2), 4.5, tope)
        a4 = c if claro else mezcla(a3, "#ffffff", 0.2)
        tonos[nombre] = f"--a1: {mezcla(n0, c, k1)}; --a2: {mezcla(n0, c, k2)}; --a3: {a3}; --a4: {a4};"
    sel = f':root[data-theme="{id_}"]'
    extra = "\n  --brillo: none; --pantalla: var(--n6); color-scheme: light;" if claro else ""
    lineas = [
        f"{sel} {{",
        f"  --n0: {n0}; --n1: {n1}; --n2: {n2}; --n3: {n3};",
        f"  --n4: {n4}; --n5: {n5}; --n6: {n6};",
        f"  {tonos['naranja']}{extra}",
        "}",
    ]
    lineas += [f'{sel}[data-acento="{a}"] {{ {tonos[a]} }}' for a in ACENTOS[1:]]
    return "\n".join(lineas)


if __name__ == "__main__":
    css = pathlib.Path(__file__).resolve().parent.parent / "assets" / "style.css"
    gen = "\n".join(bloque(f"{t}-{modo}", modo == "dia", *v) for t, modos in TEMAS.items() for modo, v in modos.items())
    texto, n = re.subn(r"(/\* temas:inicio[^\n]*\n).*?(/\* temas:fin \*/)", lambda m: m[1] + gen + "\n" + m[2],
                       css.read_text(), count=1, flags=re.S)
    if not n:
        raise SystemExit("no encontré los marcadores temas:inicio / temas:fin en style.css")
    css.write_text(texto)
    print(f"{len(TEMAS)} temas (día y noche) escritos en {css}")
