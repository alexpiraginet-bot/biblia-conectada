#!/usr/bin/env python3
"""Episodes of "Grand Testament Adventure": each passage as three 8 s missions (the format of the reference the
Alex sent on 11/11, "Paz em meio ao caos": objective on top, the line as a subtitle, minimap, "missão concluída").

  takes     files in source/takes/, one per mission, 8 s each
  objetivo  the mission line on the HUD (ours, written to the player)
  fala      (verse, literal BLIVRE fragment) shown as the subtitle of the mission, or None
  rumo      heading of the player on the minimap, degrees clockwise from north
  acao      optional key prompt shown as the mission starts (ours)
  vel       how fast the player moves on the minimap in this mission (1 walking, 0 standing still; default 1)
  conta     how many marks of the episode's counter are filled when the mission ends
  seguidores  how many companions follow the player on the radar during the mission
Per episode: ritmo = playback speed of the takes (1.15 = 15% faster); contador = what the passage counts, with the
proof: either the list of (verse, name) it adds up, or one (verse, fragment with the number word).
resumo = the story in our words for the caption; {fala1..3} are the missions' lines, {total} the counter's number.
tools/check.py verifies every fala against the BLIVRE.
"""
EPISODIOS = {
    "mc-pescadores": dict(raio_km=9, ritmo=1.1,
                          contador=dict(rotulo="Discípulos", prova=[("Mark.1.16", "Simão"), ("Mark.1.16", "André"), ("Mark.1.19", "Tiago"), ("Mark.1.19", "João")]),
                          resumo="Ele desce até a praia de Cafarnaum e chama Simão e André: “{fala2}” Eles largam a rede na hora. Mais adiante, Tiago e João deixam o pai no barco e vão atrás.\n\n{total} discípulos. Missão concluída.",
                          missoes=[
        dict(take="mc-pescadores-1.mp4", objetivo="Desça até a praia", fala=None, rumo=255, conta=0),
        dict(take="mc-pescadores-2.mp4", objetivo="Chame Simão e André", acao="Chamar", fala=("Mark.1.17", "Vinde após mim, e farei serdes pescadores de gente."), rumo=255, vel=0, conta=2),
        dict(take="mc-pescadores-3.mp4", objetivo="Chame Tiago e João", acao="Chamar", fala=("Mark.1.20", "eles deixaram o seu pai Zebedeu no barco com os empregados, foram após ele."), rumo=75, conta=4, seguidores=2),
    ]),
    "mt-aguas": dict(raio_km=12, ritmo=1.1,
                     resumo="De noite, no meio da tempestade, ele vai até o barco andando sobre o mar: “{fala1}” Pedro pede pra ir também, sai do barco, anda, olha o vento e afunda. Ele segura a mão dele: “{fala3}”",
                     missoes=[
        dict(take="mt-aguas-1.mp4", objetivo="Alcance o barco", fala=("Matt.14.27", "Tende coragem! Sou eu, não tenhais medo."), rumo=300),
        dict(take="mt-aguas-2.mp4", objetivo="Chame Pedro", acao="Chamar", fala=("Matt.14.29", "Vem."), rumo=300, vel=0),
        dict(take="mt-aguas-3.mp4", objetivo="Segure Pedro", acao="Segurar", fala=("Matt.14.31", "Homem de pouca fé, por que duvidaste?"), rumo=300, vel=0.4),
    ]),
    "jo-cana": dict(raio_km=9, ritmo=1.1, contador=dict(rotulo="Vasos", prova=[("John.2.6", "seis vasos de pedra")]),
                    resumo="Festa de casamento em Caná, e o vinho acaba: “{fala1}” Ele manda encher de água os {total} vasos de pedra: “{fala2}” Quando o mestre de cerimônia prova, é vinho: “{fala3}”.",
                    missoes=[
        dict(take="jo-cana-1.mp4", objetivo="Entre na festa de casamento", fala=("John.2.3", "Não têm vinho."), rumo=20, vel=0.5, conta=0),
        dict(take="jo-cana-2.mp4", objetivo="Mande encher os vasos", acao="Falar", fala=("John.2.7", "Enchei estes vasos com água."), rumo=20, vel=0, conta=6),
        dict(take="jo-cana-3.mp4", objetivo="Mande servir o mestre de cerimônia", fala=("John.2.10", "tu guardaste o bom vinho até agora"), rumo=20, vel=0, conta=6),
    ]),
    "mt-entrada": dict(raio_km=6, ritmo=1.1,
                       resumo="Ele manda buscar um jumentinho, desce o monte das Oliveiras com a multidão estendendo capas e ramos no caminho, “{fala2}”, e entra em Jerusalém: “{fala3}”",
                       missoes=[
        dict(take="mt-entrada-1.mp4", objetivo="Mande buscar o jumentinho", acao="Enviar", fala=("Matt.21.2", "achareis uma jumenta amarrada, e um jumentinho com ela"), rumo=250, vel=0.3),
        dict(take="mt-entrada-2.mp4", objetivo="Desça o monte das Oliveiras", fala=("Matt.21.9", "Hosana ao Filho de Davi!"), rumo=265),
        dict(take="mt-entrada-3.mp4", objetivo="Entre em Jerusalém", fala=("Matt.21.10", "toda a cidade se alvoroçou, perguntando: Quem é este?"), rumo=270),
    ]),
    "jo-lazaro": dict(raio_km=6, ritmo=1.1,
                      resumo="Em Betânia, diante da sepultura fechada: “{fala1}” Ele chama em alta voz: “{fala2}” E o morto sai, ainda enrolado em faixas: “{fala3}”",
                      missoes=[
        dict(take="jo-lazaro-1.mp4", objetivo="Vá até a sepultura", fala=("John.11.39", "Tirai a pedra."), rumo=110),
        dict(take="jo-lazaro-2.mp4", objetivo="Chame Lázaro", acao="Clamar", fala=("John.11.43", "Lázaro, sai fora."), rumo=110, vel=0),
        dict(take="jo-lazaro-3.mp4", objetivo="Mande desatá-lo", fala=("John.11.44", "Desatai-o, e deixai-o ir."), rumo=110, vel=0),
    ]),
    "mc-paes": dict(raio_km=9, ritmo=1.1, contador=dict(rotulo="Cestos", prova=[("Mark.6.43", "doze cestos cheios")]),
                    resumo="Uma multidão sentada na grama e quase nada pra comer: “{fala1}” Ele ora, parte os pães e os discípulos servem: “{fala3}” Ainda sobram {total} cestos cheios.",
                    missoes=[
        dict(take="mc-paes-1.mp4", objetivo="Receba os pães e os peixes", fala=("Mark.6.38", "Quantos pães tendes? Ide ver."), rumo=200, vel=0.5, conta=0),
        dict(take="mc-paes-2.mp4", objetivo="Abençoe e parta os pães", acao="Partir", fala=("Mark.6.41", "levantou os olhos ao céu, abençoou, e partiu os pães"), rumo=200, vel=0, conta=0),
        dict(take="mc-paes-3.mp4", objetivo="Sirva a multidão", fala=("Mark.6.42", "Todos comeram e se saciaram."), rumo=200, vel=0.5, conta=12),
    ]),
    "mc-paralitico": dict(raio_km=9, ritmo=1.1,
                          resumo="A casa em Cafarnaum está tão cheia que os amigos de um paralítico sobem no telhado: “{fala1}” Ele olha pro homem na maca: “{fala2}” E depois: “{fala3}” O homem sai andando.",
                          missoes=[
        dict(take="mc-paralitico-1.mp4", objetivo="Entre na casa cheia", fala=("Mark.2.4", "descobriram o telhado onde ele estava, fizeram um buraco"), rumo=0, vel=0.3),
        dict(take="mc-paralitico-2.mp4", objetivo="Fale ao paralítico", acao="Falar", fala=("Mark.2.5", "Filho, os teus pecados te são perdoados."), rumo=0, vel=0),
        dict(take="mc-paralitico-3.mp4", objetivo="Mande-o levantar", fala=("Mark.2.11", "levanta-te, toma o teu leito, e vai para a tua casa"), rumo=0, vel=0),
    ]),
    "lc-zaqueu": dict(raio_km=8, ritmo=1.1,
                      resumo="Em Jericó, um homem rico e baixinho quer ver quem passa: “{fala1}” Ele para embaixo da árvore: “{fala2}” Na casa de Zaqueu, o dinheiro começa a voltar pros pobres: “{fala3}”.",
                      missoes=[
        dict(take="lc-zaqueu-1.mp4", objetivo="Atravesse Jericó", fala=("Luke.19.4", "subiu em uma árvore de frutos que parecem figos, para o ver"), rumo=270),
        dict(take="lc-zaqueu-2.mp4", objetivo="Chame Zaqueu", acao="Chamar", fala=("Luke.19.5", "Zaqueu, apressa-te, e desce; porque hoje é necessário que eu fique em tua casa."), rumo=270, vel=0.4),
        dict(take="lc-zaqueu-3.mp4", objetivo="Fique na casa de Zaqueu", fala=("Luke.19.9", "Hoje houve salvação nesta casa"), rumo=270, vel=0),
    ]),
    "jo-samaritana": dict(raio_km=9, ritmo=1.1,
                          resumo="Meio-dia em Samaria: “{fala1}” Uma mulher vem buscar água e ele pede: “{fala2}” A conversa vira outra: “{fala3}”. Ela larga o vaso e corre pra cidade.",
                          missoes=[
        dict(take="jo-samaritana-1.mp4", objetivo="Descanse junto à fonte", fala=("John.4.6", "Jesus, cansado do caminho, sentou-se assim junto à fonte"), rumo=0, vel=0.6),
        dict(take="jo-samaritana-2.mp4", objetivo="Peça água", acao="Pedir", fala=("John.4.7", "Dá-me de beber."), rumo=0, vel=0),
        dict(take="jo-samaritana-3.mp4", objetivo="Fale da água viva", fala=("John.4.14", "a água que eu lhe der se fará nele fonte de água, que salte para vida eterna"), rumo=0, vel=0),
    ]),
}
