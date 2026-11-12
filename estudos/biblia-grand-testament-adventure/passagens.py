#!/usr/bin/env python3
"""Passages of "Grand Testament Adventure": Gospel scenes of Jesus as third-person open-world gameplay.

One entry per passage, grouped by Gospel (the series is posted by Gospel, by passage).

  id         file stem of everything made for the passage (art, takes, renders)
  ref        the passage, OSIS style: book.chapter.first-last
  titulo     title of the post (ours)
  fala       (verse, literal BLIVRE fragment): the line the HUD shows as the "objective"
  lugar      (verse, literal BLIVRE fragment): the place name as the BLIVRE writes it (rule 4: never translated by hand)
  geo        friendly_id of the place in OpenBible Geocoding (fontes/openbible-geo, CC BY 4.0) for the minimap, or None
             when the text names no place that can be put on a map
  geo_nota   why this point, when the passage itself does not name it

tools/check.py verifies every fragment against fontes/blivre and every geo against fontes/openbible-geo and writes
data/passagens.json (with coordinates). Nothing here is typed from memory without that check.
"""
EVANGELHOS = {"Matt": "Mateus", "Mark": "Marcos", "Luke": "Lucas", "John": "João"}

PASSAGENS = [
    # ---- Mateus
    dict(id="mt-magos", ref="Matt.2.1-11", titulo="Os magos e a estrela",
         fala=("Matt.2.2", "vimos sua estrela no oriente, e viemos adorá-lo"), lugar=("Matt.2.1", "Belém da Judeia"), geo="Bethlehem 1"),
    dict(id="mt-batismo", ref="Matt.3.13-17", titulo="O batismo no Jordão",
         fala=("Matt.3.17", "Este é o meu Filho amado, em quem me agrado."), lugar=("Matt.3.13", "Jordão"), geo="Jordan"),
    dict(id="mt-deserto", ref="Matt.4.1-11", titulo="A tentação no deserto",
         fala=("Matt.4.4", "Não só de pão viverá o ser humano"), lugar=("Matt.4.1", "deserto"), geo=None),
    dict(id="mt-sermao", ref="Matt.5.1-16", titulo="O sermão do monte",
         fala=("Matt.5.14", "Vós sois a luz do mundo"), lugar=("Matt.4.23", "Galileia"), geo="Galilee 1",
         geo_nota="Mt 5:1 só diz 'um monte'; Mt 4:23 põe a cena na Galileia (ponto da região, não do monte)"),
    dict(id="mt-aguas", ref="Matt.14.22-33", titulo="Andando sobre o mar",
         fala=("Matt.14.27", "Tende coragem! Sou eu, não tenhais medo."), lugar=("Matt.4.18", "mar da Galileia"), geo="Sea of Galilee"),
    dict(id="mt-transfiguracao", ref="Matt.17.1-8", titulo="A transfiguração",
         fala=("Matt.17.2", "seu rosto brilhou como o sol"), lugar=("Matt.17.1", "um monte alto"), geo=None),
    dict(id="mt-entrada", ref="Matt.21.1-11", titulo="A entrada em Jerusalém",
         fala=("Matt.21.9", "Bendito o que vem no nome do Senhor!"), lugar=("Matt.21.1", "monte das Oliveiras"), geo="Mount of Olives"),
    dict(id="mt-templo", ref="Matt.21.12-13", titulo="As mesas viradas",
         fala=("Matt.21.13", "Minha casa será chamada casa de oração"), lugar=("Matt.21.10", "Jerusalém"), geo="Jerusalem"),
    dict(id="mt-getsemani", ref="Matt.26.36-46", titulo="Getsêmani",
         fala=("Matt.26.39", "não seja como eu quero, mas sim como tu queres"), lugar=("Matt.26.36", "Getsêmani"), geo="Gethsemane"),
    dict(id="mt-tumulo", ref="Matt.28.1-8", titulo="O túmulo vazio",
         fala=("Matt.28.6", "Ele não está aqui, pois já ressuscitou"), lugar=("Matt.28.1", "sepulcro"), geo="Golgotha",
         geo_nota="Jo 19:41: o sepulcro ficava no lugar onde ele foi crucificado"),
    # ---- Marcos
    dict(id="mc-pescadores", ref="Mark.1.16-20", titulo="Pescadores de gente",
         fala=("Mark.1.17", "Vinde após mim, e farei serdes pescadores de gente."), lugar=("Mark.1.16", "mar da Galileia"), geo="Capernaum",
         geo_nota="Mc 1:21: da praia eles entram em Cafarnaum"),
    dict(id="mc-paralitico", ref="Mark.2.1-12", titulo="O buraco no telhado",
         fala=("Mark.2.11", "levanta-te, toma o teu leito, e vai para a tua casa"), lugar=("Mark.2.1", "Cafarnaum"), geo="Capernaum"),
    dict(id="mc-tempestade", ref="Mark.4.35-41", titulo="Paz em meio ao caos", feito="já publicado pelo Alex antes desta leva (releitura moderna, 24 s); não refazer",
         fala=("Mark.4.39", "Cala-te, aquieta-te!"), lugar=("Mark.4.39", "mar"), geo="Sea of Galilee"),
    dict(id="mc-legiao", ref="Mark.5.1-20", titulo="Legião",
         fala=("Mark.5.9", "Legião é o meu nome, porque somos muitos."), lugar=("Mark.5.1", "terra dos Gadarenos"), geo="Gergesa",
         geo_nota="Mc 5:1 diz 'terra dos Gadarenos' e a manada se lança no mar (Mc 5:13): o ponto é a margem leste do mar da "
                  "Galileia, em Kursi (Gergesa no OpenBible), e não a cidade de Gerasa (Jerash), que o OpenBible liga a Mc 5:1 e fica "
                  "longe do mar"),
    dict(id="mc-manto", ref="Mark.5.25-34", titulo="Ela tocou a roupa dele",
         fala=("Mark.5.34", "Filha, a tua fé te salvou."), lugar=("Mark.5.21", "junto ao mar"), geo=None),
    dict(id="mc-paes", ref="Mark.6.30-44", titulo="Cinco pães e dois peixes",
         fala=("Mark.6.41", "partiu os pães, e os deu aos seus discípulos"), lugar=("Mark.6.32", "um lugar deserto"), geo="Bethsaida 1",
         geo_nota="Lc 9:10: 'um lugar deserto de uma cidade chamada Betsaida'"),
    dict(id="mc-bartimeu", ref="Mark.10.46-52", titulo="Mestre, que eu veja",
         fala=("Mark.10.52", "Vai; a tua fé te salvou."), lugar=("Mark.10.46", "Jericó"), geo="Jericho 2"),
    dict(id="mc-viuva", ref="Mark.12.41-44", titulo="Duas pequenas moedas",
         fala=("Mark.12.43", "esta pobre viúva lançou mais que todos"), lugar=("Mark.11.27", "Jerusalém"), geo="Jerusalem"),
    dict(id="mc-cruz", ref="Mark.15.22-39", titulo="O lugar da caveira",
         fala=("Mark.15.39", "Verdadeiramente este homem era Filho de Deus."), lugar=("Mark.15.22", "Gólgota"), geo="Golgotha"),
    # ---- Lucas
    dict(id="lc-pastores", ref="Luke.2.8-16", titulo="Os pastores no campo",
         fala=("Luke.2.11", "hoje na cidade de Davi vos nasceu o Salvador"), lugar=("Luke.2.15", "Belém"), geo="Bethlehem 1"),
    dict(id="lc-pesca", ref="Luke.5.1-11", titulo="A rede se rompendo",
         fala=("Luke.5.5", "pela tua palavra lançarei a rede"), lugar=("Luke.5.1", "lago de Genesaré"), geo="Gennesaret"),
    dict(id="lc-naim", ref="Luke.7.11-17", titulo="Jovem, levanta-te",
         fala=("Luke.7.14", "Jovem, a ti eu digo: levanta-te."), lugar=("Luke.7.11", "Naim"), geo="Nain"),
    dict(id="lc-pecadora", ref="Luke.7.36-50", titulo="O vaso de alabastro",
         fala=("Luke.7.50", "A tua fé te salvou; vai em paz."), lugar=("Luke.7.37", "casa do fariseu"), geo=None),
    dict(id="lc-leprosos", ref="Luke.17.11-19", titulo="Onde estão os nove?",
         fala=("Luke.17.17", "Não foram os dez limpos? E onde estão os nove?"), lugar=("Luke.17.11", "Samaria"), geo=None),
    dict(id="lc-zaqueu", ref="Luke.19.1-10", titulo="Zaqueu, desce",
         fala=("Luke.19.5", "Zaqueu, apressa-te, e desce"), lugar=("Luke.19.1", "Jericó"), geo="Jericho 2"),
    dict(id="lc-ceia", ref="Luke.22.14-20", titulo="A última ceia",
         fala=("Luke.22.19", "fazei isto em memória de mim"), lugar=("Luke.22.10", "cidade"), geo="Jerusalem",
         geo_nota="Lc 22:10 só diz 'a cidade'; é Jerusalém (Lc 19:28 em diante)"),
    dict(id="lc-emaus", ref="Luke.24.13-35", titulo="O caminho de Emaús",
         fala=("Luke.24.32", "não estava nosso coração ardendo em nós"), lugar=("Luke.24.13", "Emaús"), geo="Emmaus"),
    dict(id="lc-ascensao", ref="Luke.24.50-53", titulo="A ascensão",
         fala=("Luke.24.51", "enquanto os abençoava, ele se afastou deles"), lugar=("Luke.24.50", "Betânia"), geo="Bethany 1"),
    # ---- João
    dict(id="jo-cana", ref="John.2.1-11", titulo="Água feita vinho",
         fala=("John.2.7", "Enchei estes vasos com água."), lugar=("John.2.1", "Caná da Galileia"), geo="Cana"),
    dict(id="jo-nicodemos", ref="John.3.1-16", titulo="De noite, com Nicodemos",
         fala=("John.3.16", "Porque Deus amou ao mundo de tal maneira"), lugar=("John.2.23", "Jerusalém"), geo="Jerusalem"),
    dict(id="jo-samaritana", ref="John.4.5-26", titulo="A fonte de Jacó",
         fala=("John.4.7", "Dá-me de beber."), lugar=("John.4.5", "Sicar"), geo="Sychar"),
    dict(id="jo-betesda", ref="John.5.1-9", titulo="O tanque de Betesda",
         fala=("John.5.8", "Levanta-te, toma teu leito, e anda."), lugar=("John.5.2", "Betesda"), geo="Bethesda"),
    dict(id="jo-adultera", ref="John.8.1-11", titulo="Escrito no chão",
         fala=("John.8.7", "Aquele de vós que está sem pecado, seja o primeiro que atire pedra contra ela."), lugar=("John.8.2", "Templo"), geo="Jerusalem"),
    dict(id="jo-cego", ref="John.9.1-7", titulo="O tanque de Siloé",
         fala=("John.9.7", "Vai, lava-te no tanque de Siloé"), lugar=("John.9.7", "Siloé"), geo="Siloam"),
    dict(id="jo-lazaro", ref="John.11.38-44", titulo="Lázaro, sai fora",
         fala=("John.11.43", "Lázaro, sai fora."), lugar=("John.11.1", "Betânia"), geo="Bethany 1"),
    dict(id="jo-lavapes", ref="John.13.1-17", titulo="O lava-pés",
         fala=("John.13.14", "também vós deveis lavar vossos pés uns aos outros"), lugar=("John.12.12", "Jerusalém"), geo="Jerusalem"),
    dict(id="jo-madalena", ref="John.20.11-18", titulo="Mulher, por que choras?",
         fala=("John.20.15", "Mulher, por que choras? A quem buscas?"), lugar=("John.20.11", "sepulcro"), geo="Golgotha",
         geo_nota="Jo 19:41: o sepulcro ficava no lugar onde ele foi crucificado"),
    dict(id="jo-tome", ref="John.20.24-29", titulo="Tomé",
         fala=("John.20.29", "bem-aventurados aqueles que não virem, e crerem"), lugar=("John.20.26", "fechadas já as portas"), geo=None),
    dict(id="jo-brasa", ref="John.21.1-14", titulo="Peixe na brasa",
         fala=("John.21.12", "Vinde, jantai."), lugar=("John.21.1", "mar de Tibérias"), geo="Sea of Galilee"),
]

# Names on the minimap: OpenBible friendly_id -> (verse, the name as the BLIVRE writes it there). Rule 4 of the repo:
# Portuguese place names come from the BLIVRE text, never from memory. kind: "t" town/site (dot + label), "w" water
# (label only), "m" mount (label only).
NOMES = {
    "Jerusalem": ("Matt.21.10", "Jerusalém", "t"), "Bethany 1": ("John.11.1", "Betânia", "t"), "Bethphage": ("Matt.21.1", "Betfagé", "t"),
    "Mount of Olives": ("Matt.21.1", "monte das Oliveiras", "m"), "Bethlehem 1": ("Luke.2.15", "Belém", "t"),
    "Emmaus": ("Luke.24.13", "Emaús", "t"), "Jericho 2": ("Luke.19.1", "Jericó", "t"), "Capernaum": ("Mark.2.1", "Cafarnaum", "t"),
    "Bethsaida 1": ("Luke.9.10", "Betsaida", "t"), "Tiberias": ("John.6.23", "Tibérias", "t"), "Cana": ("John.2.1", "Caná", "t"),
    "Nazareth": ("Luke.4.16", "Nazaré", "t"), "Nain": ("Luke.7.11", "Naim", "t"), "Sychar": ("John.4.5", "Sicar", "t"),
    "Chorazin": ("Matt.11.21", "Corazim", "t"), "Magdala": ("Matt.15.39", "Magdala", "t"),
    "Sea of Galilee": ("Mark.1.16", "mar da Galileia", "w"), "Gennesaret": ("Luke.5.1", "Genesaré", "m"),
}
