#!/usr/bin/env python3
"""Scenes of "Grand Testament Adventure": what happens in each 8 s take ("What if there were a game with the
missions of Jesus's life?").

How the takes are made (decided on 11/11 after the first pilot was slow and looked like a painting):
  - straight to video (seedance_2_0), asked for as gameplay capture: third-person camera behind the player, a living
    open world (market, non-player characters, animals, boats), bright game-like light;
  - every take has two shots with a hard cut in the middle, so something changes every 4 seconds;
  - the first mission of an episode starts from the character sheet only; each next mission starts from the last
    frame of the previous take, so place, light and people continue;
  - every take is generated clean (no interface, no text): the HUD is drawn afterwards by hud.py;
  - no game is named in a prompt: the look is described.

Per episode: luz (the light of the whole episode) and three missions, in story order, each with
  mundo   the setting, said once (first mission)
  a, b    the two shots
  som     the ambience the take should carry (no speech, no soundtrack)
  heroi   optional: who the player character is in the first frame, when the take before ended on a shot where he is
          not seen from behind in the lower centre (it replaces HEROI_QUADRO)
tools/fila.py turns this into the requests, in the order of ORDEM.

Rules that every prompt carries (FIM): first-century Middle Eastern adults, no children (rule 8 of the repo: no
children's faces), no interface, no text. God is never a character: at most light.
"""
PERSONAGEM = "aab922bf-ea1c-485a-be3e-fea044f08fa5"       # the character sheet (Higgsfield job)

JOGO = ("Gameplay capture of a third-person open-world action-adventure video game on a current-generation console: real-time 3D graphics, "
        "detailed game character models, sharp textures, real-time shadows, {luz}, smooth frame rate, player-controlled camera. ")
HEROI_REF = ("The player character is the man from the reference image, always seen from behind, fully visible from head to sandals in the "
             "lower centre of the frame: dark wavy shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the "
             "left shoulder, leather sandals. ")
HEROI_QUADRO = ("The player character is the man seen from behind in the first frame: dark wavy shoulder-length hair, off-white wool tunic "
                "with rope belt, terracotta-red mantle over the left shoulder, leather sandals; he stays fully visible from behind in the "
                "lower centre of the frame. ")
DOIS = "Two shots with one hard cut. Shot 1 (first 4 seconds): {a} Hard cut. Shot 2 (last 4 seconds): {b} "
POVO = "All people are Middle Eastern adults in first-century tunics, mantles and head coverings."
# 13/11: jornada-2 brought a man in the crowd dressed and bearded like the player, and a healed man with his face (two "Jesus"):
POVO_UNICO = POVO + " Apart from the player character, no man has long hair and nobody wears red."
FIM = ("{povo} No children. Ambient sound only: {som}. "
       "No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.")
# "Procurado" (12/11, Alex: "Pode colocar para gerar"): Jesus in a city of today, so everyone else wears today's clothes.
POVO_HOJE = ("Everyone else is an adult of today in modern everyday clothes; only the player character wears the first-century tunic "
             "and mantle.")
CIDADE = ("Setting: a modern sunny coastal city of today as an open game world: wide avenues, palm trees, glass towers, a beach "
          "promenade, traffic, buses, people everywhere with phones; on its edge, a park of old olive trees.")
POLICIA = "police cars with flashing red and blue lights and no lettering"

ORDEM = ["mc-pescadores", "mt-aguas", "mc-legiao", "procurado-1", "procurado-2", "procurado-3", "jornada", "jo-cana", "mt-entrada", "jo-lazaro", "mc-paes", "mc-paralitico", "lc-zaqueu", "jo-samaritana"]


CONTINUA = ("Continue the same gameplay session as the reference video: the same place, the same people, the same weather and light, the "
            "same look of the game. ")


def pedido(ep, k, primeiro, video=False):
    """The prompt of mission k (1-3) of an episode. primeiro = it starts from the character sheet only; video = it
    continues the previous take, given as a video reference next to the character sheet; otherwise it starts from the
    last frame of the previous take."""
    e = CENAS[ep]; m = e["missoes"][k - 1]
    primeiro = primeiro or bool(m.get("novo"))               # novo: a new place, so it starts from the character sheet too
    hero = m.get("heroi_ref", HEROI_REF) if (primeiro or video) else m.get("heroi", HEROI_QUADRO)
    return (JOGO.format(luz=m.get("luz", e["luz"])) + (CONTINUA if video else "") + hero + (m.get("mundo", "") + " " if m.get("mundo") else "")
            + DOIS.format(a=m["a"], b=m["b"]) + FIM.format(som=m["som"], povo=m.get("povo", e.get("povo", POVO))))


CENAS = {
    "mc-pescadores": dict(luz="bright clear late-morning daylight, vivid natural colours", missoes=[
        dict(mundo="Setting: the first-century fishing village of Capernaum on the Sea of Galilee as an open game world.",
             a="the gameplay camera follows about 4 metres behind him as he strides briskly down a village street toward the lake; the camera "
               "swings slightly left and right as if steered with a thumbstick; low black basalt houses, awnings, market stalls with fish and "
               "bread; villagers step aside and turn their heads, chickens scatter, a donkey cart rolls past.",
             b="the same gameplay camera behind him as he comes out onto the pebble beach between wooden fishing boats and drying nets and heads "
               "toward two fishermen standing knee-deep in the water casting a round throw net; the net spreads in the air and splashes down.",
             som="village chatter without clear words, chickens, cart wheels, footsteps, then waves and gulls"),
        dict(a="the gameplay camera follows about 3 metres behind him as he walks briskly across the pebble beach to the water's edge and stops "
               "in front of two fishermen who stand knee-deep in the shallow water hauling a round throw net; he raises his right arm and "
               "beckons them.",
             b="gameplay camera slightly to his right side, still behind his shoulder: the two fishermen look at him, drop the wet net into the "
               "water and wade quickly out of the lake toward him, splashing, and stop beside him on the beach. Wooden fishing boats, nets, "
               "turquoise lake, hills beyond.",
             som="waves, splashing water, gulls, footsteps on pebbles"),
        dict(a="the gameplay camera follows about 4 metres behind him as he strides along the pebble beach with the two fishermen walking right "
               "behind him, toward a second wooden boat pulled half onto the shore where two young men and an old man sit mending nets; he "
               "raises his right arm and calls to them.",
             b="the same camera behind him as the two young men put down the nets, jump over the side of the boat into the shallows and run to "
               "join him; the old man stays sitting in the boat with two hired workers, watching them go; the group of five walks on along the "
               "shore toward the black basalt village.",
             som="footsteps on pebbles, waves, splashing, gulls"),
    ]),
    "mt-aguas": dict(luz="a moonlit stormy night, cold blue light, heavy rain and spray", missoes=[
        dict(mundo="Setting: the Sea of Galilee at night in a storm as an open game world.",
             a="the gameplay camera follows about 4 metres behind him as he walks fast down a rocky shore into the surf and steps up onto the "
               "water without sinking; rain lashes, waves break around his sandals.",
             b="the same gameplay camera behind him as he strides across the heaving dark waves, rising and dropping with the swell, toward a "
               "wooden fishing boat with a lantern tossed in the distance; the men in the boat point at him in terror.",
             som="howling wind, heavy rain, crashing waves, creaking wood, wordless distant cries"),
        dict(a="the gameplay camera holds about 3 metres behind him as he stops on the waves a few metres from the boat and stretches out his "
               "right hand; one of the men in the boat, a sturdy fisherman with short curly hair and a short beard, wearing a dark brown "
               "sleeveless work tunic and no mantle, climbs over the side of the boat and lowers himself onto the water.",
             b="gameplay camera slightly to the side, still behind the player character's shoulder: the fisherman in the dark brown tunic lets "
               "go of the hull and takes several unsteady steps on the surface toward the player character, arms out for balance, while the "
               "others in the boat watch, gripping the side; a tall wave rises beside the fisherman and he looks at it in fear.",
             som="wind, rain, waves slapping the hull, creaking wood"),
        dict(heroi="The player character is the man at the right edge of the first frame, seen from behind his shoulder: dark wavy "
                   "shoulder-length hair, off-white wool tunic with rope belt, terracotta-red mantle over the left shoulder, leather sandals; "
                   "his face is never shown. ",
             a="the camera stays over the player character's shoulder as in the first frame: the fisherman in the dark brown tunic, standing "
               "on the water in front of him, suddenly sinks to his chest in the waves and reaches up with one arm; the player character steps "
               "forward on the water, bends, grips the fisherman's hand and forearm and pulls him up until he stands on the surface again.",
             b="the gameplay camera is behind the player character, fully visible from behind, as he and the fisherman climb over the side "
               "into the same wooden boat with the lantern on its mast, pulled in by the men aboard; the moment the two stand on the deck the "
               "wind drops, the rain stops, the waves flatten to a calm sea and the clouds open around the full moon; the men in the boat "
               "kneel on the deck in front of him.",
             som="wind and rain dying away to calm, splashing water, wood creaking, quiet"),
    ]),
    # Mark 5:1-20 (asked for by Alex on 12/11: "ele expulsando demônios"). The spirits are shown as dark smoke, never as
    # creatures with faces; the man is wild but never hurt or bleeding (Mark 5:5 is not shown).
    "mc-legiao": dict(luz="a stormy grey dawn after the storm, low dark clouds, wet rocks, shafts of cold light breaking through", missoes=[
        dict(mundo="Setting: the steep eastern shore of the Sea of Galilee in the land of the Gadarenes as an open game world: a rocky "
                   "beach, a steep green hillside above it full of dark rock-cut tomb openings, a large herd of pigs grazing high on the slope.",
             a="the gameplay camera follows about 4 metres behind him as he steps from a wooden fishing boat onto the wet rocky beach, his "
               "disciples climbing out of the boat behind him; the camera swings up toward the hillside of dark tomb openings above them.",
             b="the same gameplay camera behind him as a wild-haired, bearded man in torn grey rags, with broken iron chains and shackles "
               "dangling from his wrists, comes running and leaping down the slope from the tombs straight at him, shouting; the disciples "
               "step back; the man throws himself down on his knees on the rocks in front of him. No wounds, no blood.",
             som="waves on rocks, wind, chains clanking, a man's wordless shout echoing off the hillside"),
        dict(a="close gameplay camera behind his shoulder: the man in rags kneels on the rocks in front of him, writhing and shouting up at him, "
               "while a dark shadow like black smoke boils around the man's body; the player character stretches out his right hand toward him.",
             b="the same camera as the black smoke tears out of the man in dozens of swirling dark wisps and streams away up the hillside "
               "toward the large herd of pigs grazing on the slope; the man slumps forward on the rocks, still; the disciples stare. "
               "The dark wisps are only smoke and shadow, no faces, no creatures.",
             som="a roaring rushing wind, many overlapping wordless shrieks fading away, chains rattling, then silence and waves"),
        dict(a="wider gameplay camera behind and above the player character: on the hillside the huge herd of pigs, hundreds of them, panics and "
               "stampedes down the steep slope and pours over the edge of a cliff into the sea with great white splashes; the swineherds drop "
               "their staffs and run away along the shore.",
             b="the gameplay camera behind the player character as he sits on a rock beside the same man, now calm, washed, hair tied back, "
               "dressed in a clean plain tunic, the broken chains lying on the ground; the disciples stand around them; people from the "
               "town come running along the shore and stop at a distance, staring in fear.",
             som="pigs squealing and splashing into the sea, running footsteps, then waves, wind and murmuring voices"),
    ]),
    # "Procurado" (12/11): if he lived today in an open world, every sign he gives raises his wanted level, as the Gospels
    # tell it (Mark 3:6, Mark 11:18, John 8:6, John 11:53, John 11:57), and at five stars he walks toward the lights
    # (John 18:4-6). Three parts of three takes. The police never draw a weapon and nobody is hurt.
    "procurado-1": dict(luz="bright clear sunlight", povo=POVO_HOJE, missoes=[
        dict(luz="the first shot at night under flashing police lights and a helicopter searchlight, the second in bright clear morning sunlight",
             mundo=CIDADE,
             a="night, at the edge of the park of old olive trees: the gameplay camera follows about 4 metres behind him as he walks slowly "
               f"toward a line of {POLICIA} and officers holding flashlights, while a helicopter overhead floods him with a white searchlight; "
               "he spreads his arms with open, empty hands. No weapons drawn.",
             b="bright morning: the same gameplay camera follows about 4 metres behind him as he walks briskly along the busy sunny beach "
               "promenade among joggers, cyclists, palm trees and traffic; people look up from their phones and turn their heads at his tunic, "
               "a woman films him with her phone.",
             som="first a helicopter, sirens and radio chatter, then waves, traffic, birds and city chatter without clear words"),
        dict(novo=True, luz="bright warm daylight through tall windows",
             mundo="Setting: a packed, bright meeting hall with rows of chairs in a modern city of today.",
             # first try (job be133dfe) drew the man in a tunic and mantle like the player, far down the aisle: he is now
             # described in today's clothes and close to the camera
             a="close gameplay camera about 2 metres behind him as he walks down the middle aisle and stops right in front of a bald "
               "middle-aged man in a blue denim jacket and jeans who stands in the aisle holding his shrivelled, curled right hand against "
               "his chest; the player character gestures to him; the man slowly stretches out his arm and his hand opens, straight and "
               "healthy; the people around them jump up, gasp and raise their phones. The player character is the only person in a tunic "
               "and mantle in the whole hall.",
             b="the same gameplay camera, behind the player character at the front of the hall, looking toward the back: two men in dark suits "
               "who were watching lower their phones, look at each other and walk out through the back doors; in the corridor outside one "
               "of them presses his phone to his ear while the other glances back.",
             som="a murmuring crowd, gasps, chairs scraping, then a door closing and footsteps in a corridor"),
        dict(novo=True, luz="hard bright midday sunlight",
             # first try (job 14e854fa) drew a carved temple tower of another religion: the temple is now described as the plain
             # colonnades of a Roman-era temple, with nothing carved and no symbols
             mundo="Setting: the huge sunny stone courtyard of the grand old temple of a modern city of today, turned into a market: "
                   "money-exchange counters with card machines and stacks of banknotes, cages of white doves, souvenir stands. The "
                   "courtyard is surrounded by long colonnades of plain cream limestone columns, like the porches of an ancient Roman-era "
                   "temple, with a wide stone staircase and a plain stone balcony above; no towers, no domes, no statues, no carved "
                   "figures, no religious symbols anywhere.",
             a="the gameplay camera follows about 4 metres behind him as he strides between the stalls, grabs the edge of a long money table "
               "and flips it over; coins and banknotes fly, chairs topple, cages burst open and the white doves fly up; the vendors scatter.",
             b="the gameplay camera is behind him as he stands among the overturned tables and scattered coins, looking up at the plain "
               "stone balcony above the courtyard where men in dark suits and unarmed security guards watch; one of them points down at him "
               "and speaks into a radio.",
             som="a crowd shouting without clear words, a table crashing, coins clattering on stone, doves flapping, then radio static"),
    ]),
    "procurado-2": dict(luz="bright clear sunlight", povo=POVO_HOJE, missoes=[
        dict(luz="hard bright noon sunlight on the beach", mundo=CIDADE,
             a="on the beach promenade at noon a crowd of people pointing their phones surrounds a frightened woman in a plain dress sitting "
               "on the sand, two men in dark suits accusing her and a man holding a stone; the gameplay camera stays about 3 metres behind the "
               "player character as he kneels down at the edge of the circle and writes in the sand with his finger.",
             b="the same camera behind him as he stands up; one by one, the older men first, the people lower their phones and walk away; "
               "the man drops his stone in the sand; the men in suits leave angrily; only the woman remains, looking up at him.",
             som="waves, wind, an angry crowd murmuring without clear words, then silence, waves and gulls"),
        dict(novo=True, luz="golden late-afternoon light",
             mundo="Setting: a cemetery on a hillside at the edge of a modern city of today.",
             a="a crowd, news cameras on tripods and two sisters dressed in black stand among the graves; the gameplay camera follows about "
               "3 metres behind him as he walks up to a tomb cut into the rock whose round stone has been rolled aside, stops in front of the "
               "dark opening and calls into it with his arms raised.",
             b="the same camera behind him as out of the dark opening a man wrapped from head to feet in white linen strips, his face "
               "covered with a white cloth, shuffles into the light; the crowd gasps, people raise their phones, the news cameras swing "
               "toward him and the two sisters run to him.",
             som="wind on the hillside, a murmuring crowd, camera shutters, gasps"),
        dict(novo=True, luz="night city lights, neon signs, wet streets",
             mundo="Setting: a busy street of a modern city of today at night.",
             a="the gameplay camera follows about 4 metres behind him as he walks with a small group of companions along the street of neon "
               "signs; across the street a giant screen on a building shows news footage of a man wrapped in white linen walking out of a "
               "tomb, and people stop on the pavement to watch it.",
             b=f"the same camera behind him and his companions as two {POLICIA} drive slowly past them, then make a U-turn and follow them at "
               "a distance.",
             som="night traffic, a distant news broadcast without clear words, a short burst of siren, footsteps"),
    ]),
    "procurado-3": dict(luz="night", povo=POVO_HOJE, missoes=[
        dict(luz="night city lights, neon signs, wet streets", mundo="Setting: a busy street of a modern city of today at night.",  # where part 2 ends; CIDADE says "sunny"
             a="night: the gameplay camera follows about 4 metres behind him as he walks with his companions down a crowded street; suddenly "
               "every phone in people's hands, the big building screens and the bus-stop screens light up red at the same moment with an "
               "alert showing his picture; people look at their phones, then stare at him as he walks past.",
             b="the same camera behind him as one of his companions, a man with a short beard in a dark hoodie, slips back into a dark "
               "doorway, pulls his hood up and raises his phone to his ear, watching the player character walk on.",
             som="a loud alert tone from many phones at once, murmurs, traffic, then a hushed phone call without clear words"),
        dict(novo=True, luz="night, moonlight through olive trees, the glow of the city beyond",
             mundo="Setting: a park of old olive trees at night at the edge of a modern city of today.",
             # first try (job a4015ebf) put one companion in a long cream tunic with long hair and beard, like the player, and had
             # him stand up at the end: the companions' clothes are now spelled out, and he stays on his knees for take 3
             a="his three companions, short-haired men of today in jeans, sneakers and dark zip jackets, sleep on the park benches; the "
               "gameplay camera stays about 3 metres behind the player character as he kneels on the ground among the olive trees and prays.",
             b="the same camera behind him, still on his knees, as a long line of flashlights comes through the olive trees: police officers "
               "and a crowd, the man in the dark hoodie walking in front of them; his three companions in jeans and jackets wake up in alarm "
               "and jump to their feet. No weapons drawn.",
             som="crickets, wind in the olive leaves, then many footsteps, radio static, a helicopter approaching"),
        dict(luz="night, flashlights and a white helicopter searchlight among olive trees",
             # take 2 ends with his three companions standing between him and the lights, facing him: they step aside
             a="the camera stays behind him as he stands up; his three companions in jeans and jackets step aside, and he walks forward "
               "alone toward the wall of flashlights and the helicopter's white searchlight, his open hands at his sides.",
             # his words ("Eu sou", John 18:6) are the subtitle's: the prompt asks for no voice, so the take brings none
             b="the same camera behind him as he takes one calm step into the searchlight and the whole line of officers and the crowd "
               "in front of him stagger backwards and fall to the ground; he stands still in the light, waiting. No weapons drawn, "
               "nobody is hurt.",
             som="helicopter rotor, radio static, then a deep rumble and bodies falling on the grass, then only the helicopter"),
    ]),
    "jo-cana": dict(luz="warm torch and oil-lamp light at dusk under a deep blue sky", missoes=[
        dict(mundo="Setting: a wedding feast in the courtyard of a stone house in the village of Cana of Galilee as an open game world.",
             a="the gameplay camera follows about 4 metres behind him as he walks up a village lane lit by wall torches and through an open "
               "wooden gate into a crowded courtyard lit only by burning torches on the walls and small clay oil lamps on the tables, with "
               "nothing hanging overhead; guests dance in a circle clapping in rhythm, others recline at low tables.",
             b="the same camera, still about 4 metres behind him so that only his back is seen: his mother, a woman in her late forties with "
               "a blue-grey mantle over her hair, hurries up to him through the crowd with a worried face and points at the long table beside "
               "them, where every clay cup stands empty and a large wine jar lies overturned on its side, dry; two servants next to it spread "
               "their empty hands and shrug.",
             som="a festive crowd, rhythmic clapping, footsteps on stone"),
        dict(a="the gameplay camera follows behind him as he walks across the courtyard to six large carved stone water jars standing in a row "
               "against the wall and points at them; two servants run up with clay pitchers.",
             b="closer gameplay camera behind his shoulder, not moving forward: the two servants pour water from the pitchers into the jars "
               "again and again until the water brims at the top; exactly six jars stay in view the whole time.",
             som="water pouring into stone jars, a festive crowd, clapping"),
        dict(a="close gameplay camera behind his shoulder: a servant dips a wooden ladle into the first stone jar and lifts it out full of dark "
               "red wine, pours it into a clay cup and hurries away with it across the courtyard.",
             b="the gameplay camera stays behind the player character, who watches from beside the six jars as the servant reaches the master of "
               "the feast, an older man in a fine striped robe, who drinks, stares at the cup in astonishment and claps the young bridegroom on "
               "the shoulder; guests cheer and raise their cups.",
             som="wine being poured, a cheering festive crowd, cups clinking"),
    ]),
    "mt-entrada": dict(luz="bright clear morning sunlight, dust in the air", missoes=[
        dict(mundo="Setting: the road over the Mount of Olives down to first-century Jerusalem as an open game world: olive groves, stone "
                   "terraces, the walled city and the white-and-gold Temple across the valley.",
             a="the gameplay camera follows about 4 metres behind him as he walks briskly along a dusty road to the edge of a small stone "
               "village with his disciples around him; two of them run ahead to a doorway where a grey donkey and her colt are tied.",
             b="the same camera behind him as the two disciples lead the donkey and the colt back to him, lay their cloaks over the colt's back, "
               "and he mounts it.",
             som="hooves on a dirt road, wind in olive trees, distant voices, birds"),
        dict(a="the gameplay camera follows about 4 metres behind him as he rides the small grey donkey down the stony road; a crowd runs "
               "alongside, laying cloaks on the road in front of the donkey and waving cut palm branches.",
             b="wider gameplay camera behind and above him: the road curves down the hillside between a cheering crowd on both sides, and the "
               "walled city with the Temple fills the view ahead across the valley.",
             som="a cheering crowd, hooves on stone, palm branches rustling"),
        dict(a="the gameplay camera follows him as he rides through a massive stone city gate into a packed street; the crowd parts, palm "
               "branches wave, people lean from rooftops and stairways.",
             b="the same camera behind him as he rides up the street toward the high walls of the Temple platform; people point at him and turn "
               "to one another; a flock of doves takes off from a roof.",
             som="a large noisy crowd echoing between stone walls, hooves on paving, doves' wings"),
    ]),
    "jo-lazaro": dict(luz="warm late-afternoon sunlight, long shadows", missoes=[
        dict(mundo="Setting: the village of Bethany and its rocky hillside tombs near first-century Jerusalem as an open game world.",
             a="the gameplay camera follows about 4 metres behind him as he walks fast along a village path beside two women in dark mourning "
               "mantles; a group of mourners follows, some weeping.",
             b="the same camera behind him as the path climbs a rocky slope to a cave tomb closed by a large round stone; he stops and points at "
               "it; four men brace their shoulders against the stone and roll it aside, dust falling.",
             som="footsteps on gravel, quiet weeping, wind, stone grinding on stone"),
        dict(a="close gameplay camera behind his shoulder as he steps in front of the open dark cave mouth and lifts his face to the sky for a "
               "moment; the crowd on both sides falls silent.",
             b="the same camera as he stretches out his right arm toward the darkness and calls out with all his strength; dust drifts out of "
               "the cave and, deep inside, a figure wrapped in pale linen starts to move toward the light.",
             som="wind, a hushed crowd, a few gasps, gravel shifting"),
        dict(a="the gameplay camera stays behind him as a man wrapped from shoulders to feet in linen burial strips, his head and face covered by "
               "a cloth, shuffles out of the cave into the sunlight; the crowd staggers back.",
             b="the same camera as he gestures toward the man; two men run up and unwind the linen strips from his arms; the two women in dark "
               "mantles run to him and embrace him; people fall to their knees and raise their hands.",
             som="gasps, crying turning to joyful shouts, cloth rustling, wind"),
    ]),
    "mc-paes": dict(luz="golden late-afternoon sunlight", missoes=[
        dict(mundo="Setting: a green grassy hillside above the Sea of Galilee as an open game world, with a crowd of thousands.",
             a="the gameplay camera follows about 4 metres behind him as he walks briskly up through a vast crowd of thousands of people sitting "
               "down in groups on the green grass; people turn toward him as he passes.",
             b="the same camera as a disciple hurries up to him and holds out a small wicker basket with five round flat loaves and two small "
               "fish; he takes the basket with both hands.",
             som="a very large crowd murmuring outdoors, wind in grass, footsteps, distant waves"),
        dict(a="close gameplay camera behind his shoulder as he lifts one round loaf in both hands and raises his face to the sky.",
             b="the same camera as he breaks the loaf and keeps handing pieces to his disciples, who stand around him holding large wicker "
               "baskets; the bread keeps coming and the baskets fill up.",
             som="bread tearing, baskets creaking, a large crowd murmuring, wind"),
        dict(a="the gameplay camera follows behind him as he walks along the edge of the seated crowd while his disciples hand out bread and "
               "fish from full baskets; people eat and pass pieces along.",
             b="wider gameplay camera behind and above him: thousands of people eating on the grass down to the lake at sunset; beside him the "
               "disciples set down a row of twelve wicker baskets heaped with leftover pieces of bread.",
             som="a large contented crowd eating and talking, baskets set down on grass, evening birds"),
    ]),
    "mc-paralitico": dict(luz="daylight streaming into a dim stone interior", missoes=[
        dict(mundo="Setting: a crowded black basalt-stone house in first-century Capernaum as an open game world.",
             a="the gameplay camera follows about 3 metres behind him as he makes his way through a tightly packed crowd at the doorway of a "
               "basalt house and steps into a dim room full of people sitting on mats.",
             b="the same camera behind him inside the room as dust and crumbs of clay start falling from the ceiling of beams and branches; "
               "everyone looks up; hands tear a hole in the roof and a shaft of sunlight pours in.",
             som="a crowded room murmuring, branches cracking, clay crumbling and falling, surprised murmurs"),
        dict(a="the gameplay camera behind his shoulder looks up as a paralysed man lying on a woven mat is lowered through the hole on four "
               "ropes, turning slowly in the shaft of sunlight; four faces look down from the roof.",
             b="the same camera as the mat settles on the floor at his feet; he bends toward the man and speaks to him; the crowd presses back "
               "against the basalt walls.",
             som="ropes creaking, a hushed crowd, dust and small stones falling"),
        dict(a="close gameplay camera behind his shoulder as he stretches out his hand; the man on the mat sits up, plants his feet and stands, "
               "staring at his own legs.",
             b="the same camera as the man rolls up the mat, tucks it under his arm and walks through the parting crowd out into the bright "
               "doorway; people raise their hands and the four men on the roof cheer.",
             som="astonished shouts, a crowd praising, footsteps on a packed earth floor"),
    ]),
    "lc-zaqueu": dict(luz="bright midday sunlight", missoes=[
        dict(mundo="Setting: first-century Jericho as an open game world: date palms, gardens, houses of stone and mud brick.",
             a="the gameplay camera follows about 4 metres behind him as he walks briskly down a palm-lined street packed with people pressing "
               "around him on both sides.",
             b="the same camera as, ahead of him, a short man in fine embroidered robes runs along the edge of the crowd and scrambles up into a "
               "large sycomore fig tree that spreads over the street.",
             som="a pressing crowd, many footsteps, palm fronds in wind, leaves rustling"),
        dict(a="the gameplay camera behind him tilts up as he stops under the tree, raises his hand and calls to the short man clinging to a "
               "branch among the big leaves, who points at himself in disbelief.",
             b="the same camera as the short man scrambles down the trunk in a hurry, his fine robes catching on twigs, lands in front of him "
               "beaming and leads him by the arm through the muttering crowd toward a large house.",
             som="leaves and branches rustling, a muttering crowd, feet landing on dust"),
        dict(a="the gameplay camera follows behind him into the courtyard of a wealthy house: a table laid for a meal, an open strongbox and "
               "leather money bags; the short man stands before him with open hands, speaking earnestly.",
             b="the same camera as the short man hands heavy money bags to servants, who carry them out through the gate to poor people waiting "
               "outside; he turns back wiping his eyes and the player character lays a hand on his shoulder.",
             som="coins in leather bags, murmuring guests, footsteps on stone"),
    ]),
    "jo-samaritana": dict(luz="harsh bright noon sunlight, short shadows", missoes=[
        dict(mundo="Setting: a dusty road in the hill country of first-century Samaria as an open game world: a town on a slope, a tall bare "
                   "mountain behind it, a stone well beside the road.",
             a="the gameplay camera follows about 4 metres behind him as he walks along the dusty road in the noon heat while his disciples "
               "split off up a side road toward the town.",
             b="the same camera as he reaches a round stone-rimmed well, puts a hand on the rim and sits down on its edge, wiping his brow; from "
               "the town a lone woman with a clay water jar on her shoulder comes down the road toward the well.",
             som="cicadas, hot wind, footsteps on dust, distant sheep bells"),
        dict(a="gameplay camera behind his shoulder as he sits on the rim of the well; the woman, in a faded ochre and green mantle, stops "
               "across the well and looks at him with suspicion; he gestures at her jar.",
             b="the same camera as she lowers the jar into the well on a rope, hand over hand, pulls it up dripping and sets it on the rim, "
               "raising her eyebrows as she answers him.",
             som="a rope running over stone, water dripping, cicadas, hot wind"),
        dict(a="close gameplay camera behind his shoulder as he speaks and points to the water; the woman's face changes from suspicion to "
               "wonder and she backs away from the well.",
             b="wider gameplay camera behind him: she leaves her full water jar standing beside the well and runs up the road toward the town, "
               "her mantle flying, passing his disciples who are coming back; people start coming out of the town down the road.",
             som="running footsteps on dust, cicadas, hot wind, distant voices from the town"),
    ]),
}

# "A jornada" (13/11, Alex: "Quero algo novo! De alto nível de jogabilidade! ... 50s total, mostrando toda Galiléia e vida de
# Jesus em missões e mundo aberto também ... Até a fase final, redenção e crucificação e ressurreição"): seven takes, each
# in a new place, so each starts from the character sheet (novo). The passion is shown the way a reverent cutscene would:
# the cross carried from behind, then three crosses far away in silhouette; no blood, no wounds, no close-up.
GALILEIA = ("Setting: the hills and shore of the Sea of Galilee in the first century as a vast open game world: fishing villages of "
            "black basalt houses, terraced fields, olive groves, a dirt road along the lake, wooden fishing boats on the water.")
CENAS["jornada"] = dict(luz="golden sunrise light over the lake, morning mist, vivid natural colours", missoes=[
    dict(mundo=GALILEIA,
         a="a high gameplay camera swoops down from above the lake and the hills like an open-world region reveal and settles about 4 "
           "metres behind him as he walks along the lakeside road at sunrise; villagers with donkeys and baskets pass by, smoke rises from "
           "the village ahead.",
         b="the same gameplay camera behind him on the pebble beach as he raises his right arm and beckons two fishermen standing in a "
           "wooden boat near the shore; they drop their net into the water, jump into the shallows and wade toward him.",
         som="morning birds, waves on pebbles, distant village sounds, splashing water"),
    dict(novo=True, luz="warm golden afternoon sunlight, soft dust in the air",
         mundo="Setting: first-century villages of Galilee: a wedding courtyard in Cana, then a crowded stone house in Capernaum.",
         a="the gameplay camera follows about 3 metres behind him as he walks between the tables of a wedding feast to six large stone "
           "water jars; servants pour water into them, and as he stops beside them the water in the nearest jar turns deep red wine, "
           "glinting in the light.",
         b="inside a crowded stone house, light falling through a hole in the roof where two ropes still hang: the same gameplay camera "
           "behind him as he stretches out his hand toward an older bald man with a short grey beard lying on a straw mat on the floor; "
           "the old man gets up, rolls up the mat, lifts it onto his shoulder and walks, and the crowd steps back in astonishment.",
         som="wedding chatter without clear words, water pouring, then a crowded room murmuring, gasps", povo=POVO_UNICO),
    dict(novo=True, povo=POVO_UNICO, luz="night storm, lightning flashes, dark blue moonlight",
         mundo="Setting: a wooden fishing boat on the Sea of Galilee at night.",
         a="a violent storm, waves breaking over the side, his companions bailing water in panic; the gameplay camera stays about 3 metres "
           "behind him as he stands up at the stern and stretches out his arm over the waves, and the wind and the waves die down at once "
           "into a calm, glassy lake.",
         # 13/11: the first take started him from a wooden pier and put a long-haired man in a red mantle in the boat
         b="later, calm water under the moon, far from any shore: the same gameplay camera behind him as he walks on the surface of the "
           "lake toward the fishing boat, ripples spreading under each step; his companions in the boat, short-haired men in plain brown "
           "tunics, stare at him in fear.",
         som="howling wind, crashing waves, thunder, then a sudden calm, gentle lapping water"),
    dict(novo=True, povo=POVO_UNICO, luz="warm golden sunlight, long soft shadows",
         mundo="Setting: a green hillside above the Sea of Galilee, then the road up to a stone gate of Jerusalem.",
         # 13/11: "hands bread to his companions" brought three men like him (long hair, beard, red mantle) facing the camera
         a="a huge crowd sits in groups on the green grass; the gameplay camera stays about 3 metres behind him, only his back visible, "
           "as he walks between the groups holding a basket of bread against his chest and hands loaves to the seated people; baskets "
           "passing from hand to hand through the crowd keep filling with bread and fish; his companions are short-haired men in plain "
           "brown tunics without mantles.",
         b="the same gameplay camera behind him as he rides a grey donkey up the road to the city gate while a large crowd waves palm "
           "branches and spreads cloaks on the road in front of him.",
         som="a huge crowd murmuring, wind in the grass, then a cheering crowd without clear words, hooves on stone"),
    dict(novo=True, povo=POVO_UNICO, luz="warm oil-lamp light at night, then cold moonlight",
         mundo="Setting: Jerusalem at night: an upper room, then a garden of old olive trees outside the walls.",
         a="an upper room lit by oil lamps: he sits at the centre of a low table with his twelve companions around it; the gameplay camera, "
           "just behind his shoulder, watches as he takes a round loaf of bread, breaks it in two and hands it to the men beside him.",
         b="a garden of old olive trees under the moon: the same gameplay camera behind him as he kneels alone on a rock and prays, his "
           "head bowed; in the distance three of his companions sleep under the trees, and the torches of a crowd come up the hill.",
         som="crackling oil lamps, a quiet room, then crickets, wind in the olive leaves, distant footsteps"),
    dict(novo=True, povo=POVO_UNICO, luz="overcast grey light that darkens into a black stormy sky at midday",
         heroi_ref=("The player character is the man from the reference image: dark wavy shoulder-length hair, off-white wool tunic with "
                    "rope belt, terracotta-red mantle, leather sandals. In shot 1 he is seen from behind in the lower centre of the frame. "
                    "In shot 2 he is not among the people on the ground. "),
         mundo="Setting: Jerusalem and a bare rocky hill outside its walls.",
         a="a narrow stone street: the gameplay camera follows about 4 metres behind him as he slowly carries a heavy wooden cross on his "
           "shoulder up the street, Roman soldiers walking beside him with spears held upright, women weeping along the walls. No blood, "
           "no wounds visible.",
         b="the camera stays far behind a small group of mourning women and one young man standing still at the foot of the hill, "
           "looking up at three crosses in black silhouette against dark clouds; the wind blows dust. Seen only from far away and in "
           "silhouette: no blood, no wounds, no close-up of the crosses.",
         som="a murmuring crowd, slow footsteps, armour clinking, then wind, distant thunder and silence"),
    dict(novo=True, povo=POVO_UNICO, luz="the first golden light of dawn, soft mist",
         heroi_ref=("The player character is the man from the reference image: dark wavy shoulder-length hair, off-white wool tunic with "
                    "rope belt, terracotta-red mantle, leather sandals. In shot 1 he is not in the frame: the tomb is empty. In shot 2 he "
                    "is seen from behind in the lower centre of the frame. "),
         mundo="Setting: a garden with a tomb cut into the rock outside Jerusalem, then a hilltop in Galilee.",
         a="three women carrying jars of spices walk up the garden path at dawn; the gameplay camera stays about 4 metres behind them as "
           "they stop in front of the tomb, whose large round stone has been rolled away; warm light pours out of the empty opening onto "
           "the folded linen cloths inside.",
         b="the top of a green hill above the Sea of Galilee at sunrise: he stands in the light, seen from behind, with his arms open, "
           "while his eleven companions kneel and stand around him, the valleys and the lake glowing gold below.",
         som="dawn birds, soft wind, footsteps on gravel, then wind over the hilltop"),
])
