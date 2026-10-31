export interface Misconception {
  id: string;
  conceptId: string;
  label: string;
  wrongBelief: string;
  correctIdea: string;
  /** Phrases in spoken reasoning that hint at this belief (used by the offline analyzer). */
  cues: string[];
}

export const MISCONCEPTIONS: Misconception[] = [
  { id: "MC01", conceptId: "C1", label: "Current used up",
    wrongBelief: "Current is used up by bulbs, so less flows after each one.",
    correctIdea: "Current is the same everywhere in a series loop; energy is transferred, not charge.",
    cues: ["used up", "uses up", "less current", "current gets used", "current is consumed", "runs out", "less left", "after the first bulb"] },
  { id: "MC02", conceptId: "C6", label: "Same voltage in series",
    wrongBelief: "Resistors in series all get the same voltage.",
    correctIdea: "Same current in series; voltage divides in proportion to R.",
    cues: ["same voltage", "equal voltage", "voltage is same", "each gets the full voltage", "both get 12"] },
  { id: "MC03", conceptId: "C7", label: "Parallel adds resistance",
    wrongBelief: "Adding a resistor in parallel increases total resistance.",
    correctIdea: "Parallel resistance is less than the smallest branch.",
    cues: ["more resistance", "resistance increases", "adds up", "add the resistances", "total goes up", "more resistors more resistance"] },
  { id: "MC04", conceptId: "C4", label: "R depends on V",
    wrongBelief: "R changes when V changes, because R = V/I.",
    correctIdea: "R is a property of the conductor (fixed T); V/I just measures it.",
    cues: ["resistance doubles", "resistance increases with voltage", "r depends on v", "more voltage more resistance", "resistance changes with voltage"] },
  { id: "MC05", conceptId: "C5", label: "Thicker wire, more R",
    wrongBelief: "A thicker wire has more resistance.",
    correctIdea: "R ∝ L/A; thicker → less resistance.",
    cues: ["thicker means more", "thick wire more resistance", "more material more resistance", "bigger wire more resistance"] },
  { id: "MC06", conceptId: "C9", label: "kWh is power",
    wrongBelief: "kWh is a unit of power.",
    correctIdea: "kWh is a unit of energy (1 kWh = 3.6 × 10⁶ J).",
    cues: ["kwh is power", "unit of power", "kilowatt hour is power", "power in kwh"] },
  { id: "MC07", conceptId: "C2", label: "Voltage flows",
    wrongBelief: "Voltage flows through the circuit.",
    correctIdea: "Current flows; potential difference is across two points.",
    cues: ["voltage flows", "voltage goes through", "voltage passes", "flow of voltage", "voltage travels"] },
  { id: "MC08", conceptId: "L2", label: "Mirror image shrinks",
    wrongBelief: "Plane mirror image gets smaller as you move away.",
    correctIdea: "Image size equals object size; only apparent size changes.",
    cues: ["gets smaller", "image shrinks", "smaller image", "image becomes small"] },
  { id: "MC09", conceptId: "L4", label: "Concave always magnifies",
    wrongBelief: "A concave mirror always magnifies.",
    correctIdea: "Image depends on object position (beyond C → diminished).",
    cues: ["always magnifies", "always bigger", "always enlarged", "concave makes it bigger"] },
  { id: "MC10", conceptId: "L10", label: "Virtual image on screen",
    wrongBelief: "A virtual image can be caught on a screen.",
    correctIdea: "Only real images form on screens.",
    cues: ["virtual on screen", "screen shows virtual", "virtual can be seen on screen", "catch the virtual image"] },
  { id: "MC11", conceptId: "L7", label: "Bends away entering denser",
    wrongBelief: "Light bends away from the normal entering a denser medium.",
    correctIdea: "Bends towards the normal entering denser medium.",
    cues: ["away from the normal", "bends away", "moves away from normal", "goes away from normal"] },
  { id: "MC12", conceptId: "L13", label: "More power, longer f",
    wrongBelief: "Higher power means longer focal length.",
    correctIdea: "P = 1/f (m); higher power → shorter f.",
    cues: ["more power longer", "power increases focal length", "higher power bigger focal", "longer focal length more power"] },
  { id: "MC13", conceptId: "E3", label: "Myopia → convex lens",
    wrongBelief: "Myopia is corrected with a convex lens.",
    correctIdea: "Myopia → concave (diverging) lens.",
    cues: ["convex for myopia", "myopia convex", "converging lens for short sight", "convex lens for near sighted"] },
  { id: "MC14", conceptId: "E7", label: "Sky reflects ocean",
    wrongBelief: "The sky is blue because it reflects the ocean.",
    correctIdea: "Shorter (blue) wavelengths scatter more off air molecules.",
    cues: ["reflects the ocean", "reflection of sea", "because of the sea", "ocean is blue", "water reflects"] },
  { id: "MC15", conceptId: "M1", label: "Field lines cross",
    wrongBelief: "Magnetic field lines can cross.",
    correctIdea: "Field lines never intersect (field has one direction at a point).",
    cues: ["lines cross", "lines intersect", "cross each other", "meet each other"] },
  { id: "MC16", conceptId: "M2", label: "Radial field around wire",
    wrongBelief: "Field around a straight wire points radially outward.",
    correctIdea: "Field lines are concentric circles around the wire.",
    cues: ["radially", "outward", "straight out", "spreads out", "points away from the wire"] },
  { id: "MC17", conceptId: "E5", label: "Prism adds colours",
    wrongBelief: "A prism adds colours to white light.",
    correctIdea: "White light already contains colours; the prism separates them.",
    cues: ["prism adds", "prism creates colours", "prism makes colours", "glass colours the light", "prism colours"] },
];

export const MISCONCEPTION_BY_ID: Record<string, Misconception> = Object.fromEntries(
  MISCONCEPTIONS.map((m) => [m.id, m]),
);

export const misconceptionsFor = (conceptId: string): Misconception[] =>
  MISCONCEPTIONS.filter((m) => m.conceptId === conceptId);
