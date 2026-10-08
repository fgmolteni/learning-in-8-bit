"""Genera los temas de terminal de assets/style.css (el bloque entre "temas:inicio" y "temas:fin").

Uso: python3 herramientas/temas.py

Cada tema da su paleta de terminal: cinco tonos neutros (fondo, borde, comentario, texto, tinta) y cinco
colores ANSI, uno por acento de la barra. El script deriva n1/n2 (paneles y líneas) y a1/a2/a4 (relleno,
borde suave, brillante) y corrige el contraste WCAG: texto suave y acento >= 4,5:1, texto >= 7:1 sobre el
fondo y los paneles. Salen hex de 6 dígitos porque los canvas los leen así (ver diagramas.js).
Los temas "pizarra" (dark) y "papel" (light) están escritos a mano arriba del bloque y no pasan por acá.
"""
import pathlib
import re

ACENTOS = ["naranja", "verde", "azul", "ambar", "magenta"]

# id: (claro, "n0 n3 n4 n5 n6", "naranja verde azul ámbar magenta")
TEMAS = {
    "dracula": (False, "#282a36 #4d5066 #6272a4 #f8f8f2 #ffffff", "#ffb86c #50fa7b #8be9fd #f1fa8c #ff79c6"),
    "gruvbox": (False, "#282828 #504945 #a89984 #ebdbb2 #fbf1c7", "#fe8019 #b8bb26 #83a598 #fabd2f #d3869b"),
    "nord": (False, "#2e3440 #4c566a #8a94a7 #d8dee9 #eceff4", "#d08770 #a3be8c #88c0d0 #ebcb8b #b48ead"),
    "solarized-oscuro": (False, "#002b36 #33555e #657b83 #93a1a1 #eee8d5", "#cb4b16 #859900 #268bd2 #b58900 #d33682"),
    "solarized-claro": (True, "#fdf6e3 #bcc1b8 #657b83 #586e75 #073642", "#cb4b16 #859900 #268bd2 #b58900 #d33682"),
    "catppuccin": (False, "#1e1e2e #45475a #9399b2 #cdd6f4 #eef1fc", "#fab387 #a6e3a1 #89b4fa #f9e2af #f5c2e7"),
    "tokyo-night": (False, "#1a1b26 #3b4261 #737aa2 #c0caf5 #e4e9ff", "#ff9e64 #9ece6a #7aa2f7 #e0af68 #bb9af7"),
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
    gen = "\n".join(bloque(i, *t) for i, t in TEMAS.items())
    texto, n = re.subn(r"(/\* temas:inicio[^\n]*\n).*?(/\* temas:fin \*/)", lambda m: m[1] + gen + "\n" + m[2],
                       css.read_text(), count=1, flags=re.S)
    if not n:
        raise SystemExit("no encontré los marcadores temas:inicio / temas:fin en style.css")
    css.write_text(texto)
    print(f"{len(TEMAS)} temas escritos en {css}")
