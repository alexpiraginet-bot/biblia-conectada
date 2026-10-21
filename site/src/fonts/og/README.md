# Fonts for social cards

ImageResponse/Satori supports WOFF but not the site's WOFF2 assets. These files are deterministic conversions of the existing, locally hosted OFL fonts, used only by `/og`. No new font family or external font request is introduced.

- `Figtree-Medium.woff`: `../Figtree-VF.woff2`, instantiated at weight 500, then saved as WOFF.
- `Newsreader-Display.woff`: `../Newsreader-Display.woff2`, preserving its existing static display instance, then saved as WOFF.
- Original licences: `../OFL-Figtree.txt` and `../OFL-Newsreader.txt`. See `../README-Figtree.md` and `../../../scripts/subset-fonts.sh` for source provenance.

Reproduction with Python, FontTools 4.60.1 and Brotli:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

font = TTFont("site/src/fonts/Figtree-VF.woff2")
font = instantiateVariableFont(font, {"wght": 500}, inplace=True)
font.flavor = "woff"
font.save("site/src/fonts/og/Figtree-Medium.woff")

font = TTFont("site/src/fonts/Newsreader-Display.woff2")
font.flavor = "woff"
font.save("site/src/fonts/og/Newsreader-Display.woff")
```

Conversion tools are not runtime or build dependencies. Fonts and their upstream OFL notices remain available in the repository.

SHA-256 of the committed outputs:

```text
9011187aa61a25967165c336a32531e946ad747bc07cd695b80d81c6d7819736  Figtree-Medium.woff
d630c518df61e2f0f885ee15496d01763737eb8248add25dda8854c4482fd5f9  Newsreader-Display.woff
```
