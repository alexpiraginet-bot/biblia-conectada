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
FIM = ("All people are Middle Eastern adults in first-century tunics, mantles and head coverings. No children. Ambient sound only: {som}. "
       "No soundtrack music, no speech, no HUD, no user interface, no text, no subtitles.")

ORDEM = ["mc-pescadores", "mt-aguas", "jo-cana", "mt-entrada", "jo-lazaro", "mc-paes", "mc-paralitico", "lc-zaqueu", "jo-samaritana"]


def pedido(ep, k, primeiro):
    """The prompt of mission k (1-3) of an episode; primeiro = it starts from the character sheet, not from a frame."""
    e = CENAS[ep]; m = e["missoes"][k - 1]
    return (JOGO.format(luz=e["luz"]) + (HEROI_REF if primeiro else HEROI_QUADRO) + (m.get("mundo", "") + " " if m.get("mundo") else "")
            + DOIS.format(a=m["a"], b=m["b"]) + FIM.format(som=m["som"]))


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
               "right hand; one sturdy bearded fisherman climbs over the side of the boat and lowers himself onto the water.",
             b="gameplay camera slightly to the side, still behind his shoulder: the fisherman lets go of the hull and takes several unsteady "
               "steps on the surface toward him, arms out for balance, while the others in the boat watch, gripping the side; a tall wave rises "
               "beside him and he looks at it in fear.",
             som="wind, rain, waves slapping the hull, creaking wood"),
        dict(a="close gameplay camera behind his right shoulder: the fisherman sinks to his chest in the waves, reaching up; the player "
               "character lunges two steps forward on the water, bends, catches his forearm and pulls him up to stand on the surface again.",
             b="the gameplay camera follows behind as the two walk the last steps to the boat and climb over the side, helped by the others; at "
               "once the wind drops, the rain stops, the waves flatten and the clouds open around the moon; the men in the boat kneel.",
             som="wind and rain dying away to calm, splashing water, wood creaking, quiet"),
    ]),
    "jo-cana": dict(luz="warm torch and oil-lamp light at dusk under a deep blue sky", missoes=[
        dict(mundo="Setting: a wedding feast in the courtyard of a stone house in the village of Cana of Galilee as an open game world.",
             a="the gameplay camera follows about 4 metres behind him as he walks up a lamp-lit village lane and through an open gate into a "
               "crowded courtyard; guests dance in a circle clapping in rhythm, others recline at low tables.",
             b="the same camera behind him as his mother, a woman in her late forties in a blue-grey mantle, hurries up to him, speaks with a "
               "worried face and points to a servant who turns an empty clay wine jug upside down over a cup; nothing comes out.",
             som="a festive crowd, rhythmic clapping, footsteps on stone, a clay jug being set down"),
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
