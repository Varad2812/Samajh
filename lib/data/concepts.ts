export type Chapter = "light" | "eye" | "electricity" | "magnetism";

export interface Concept {
  id: string;
  name: string;
  chapter: Chapter;
  prereqs: string[];
  /** Exam importance, drives node size. */
  weight: 1 | 2 | 3;
  summary: string;
}

export const CHAPTERS: { id: Chapter; name: string; short: string }[] = [
  { id: "light", name: "Light: Reflection & Refraction", short: "Light" },
  { id: "eye", name: "The Human Eye & the Colourful World", short: "Eye" },
  { id: "electricity", name: "Electricity", short: "Elec" },
  { id: "magnetism", name: "Magnetic Effects of Electric Current", short: "Mag" },
];

export const CONCEPTS: Concept[] = [
  // Light
  { id: "L1", name: "Reflection & laws of reflection", chapter: "light", prereqs: [], weight: 2,
    summary: "Angle of incidence equals angle of reflection; incident ray, reflected ray and normal lie in one plane." },
  { id: "L2", name: "Image in a plane mirror", chapter: "light", prereqs: ["L1"], weight: 1,
    summary: "Virtual, erect, same size as the object, as far behind the mirror as the object is in front, laterally inverted." },
  { id: "L3", name: "Spherical mirror terms (pole, focus, R = 2f)", chapter: "light", prereqs: ["L1"], weight: 2,
    summary: "Pole, centre of curvature, principal axis and focus; for small apertures the radius of curvature R = 2f." },
  { id: "L4", name: "Ray diagrams: concave mirror", chapter: "light", prereqs: ["L3"], weight: 3,
    summary: "Image nature, size and position change with object position, from beyond C to between P and F." },
  { id: "L5", name: "Ray diagrams: convex mirror", chapter: "light", prereqs: ["L3"], weight: 2,
    summary: "Always forms a virtual, erect, diminished image between P and F; used as rear-view mirrors." },
  { id: "L6", name: "Mirror formula & magnification", chapter: "light", prereqs: ["L4", "L5"], weight: 3,
    summary: "1/v + 1/u = 1/f and m = −v/u, using the New Cartesian sign convention." },
  { id: "L7", name: "Refraction & laws (Snell's law)", chapter: "light", prereqs: ["L1"], weight: 3,
    summary: "Light bends towards the normal entering a denser medium; sin i / sin r is constant for a pair of media." },
  { id: "L8", name: "Refractive index", chapter: "light", prereqs: ["L7"], weight: 2,
    summary: "n = c / v; a higher refractive index means light travels slower in that medium." },
  { id: "L9", name: "Spherical lens terms", chapter: "light", prereqs: ["L7"], weight: 2,
    summary: "Optical centre, principal foci, focal length; convex lenses converge and concave lenses diverge light." },
  { id: "L10", name: "Ray diagrams: convex lens", chapter: "light", prereqs: ["L9"], weight: 3,
    summary: "Real inverted images for objects beyond F; a virtual, erect, magnified image when the object is within F." },
  { id: "L11", name: "Ray diagrams: concave lens", chapter: "light", prereqs: ["L9"], weight: 2,
    summary: "Always a virtual, erect, diminished image on the same side as the object." },
  { id: "L12", name: "Lens formula & magnification", chapter: "light", prereqs: ["L10", "L11"], weight: 3,
    summary: "1/v − 1/u = 1/f and m = v/u, using the New Cartesian sign convention." },
  { id: "L13", name: "Power of a lens", chapter: "light", prereqs: ["L12"], weight: 2,
    summary: "P = 1/f with f in metres, measured in dioptres; convex positive, concave negative." },
  // Eye & colourful world
  { id: "E1", name: "Structure of the human eye", chapter: "eye", prereqs: ["L10"], weight: 2,
    summary: "Cornea, iris, pupil, eye lens, ciliary muscles and retina; the eye lens forms a real inverted image on the retina." },
  { id: "E2", name: "Power of accommodation", chapter: "eye", prereqs: ["E1"], weight: 1,
    summary: "Ciliary muscles change the eye lens's focal length; near point 25 cm, far point infinity." },
  { id: "E3", name: "Defects of vision & correction", chapter: "eye", prereqs: ["E2", "L13"], weight: 3,
    summary: "Myopia is corrected by a concave lens, hypermetropia by a convex lens, presbyopia often by bifocals." },
  { id: "E4", name: "Refraction through a prism", chapter: "eye", prereqs: ["L7"], weight: 2,
    summary: "Light bends twice at the prism faces; the emergent ray is deviated by the angle of deviation." },
  { id: "E5", name: "Dispersion of white light", chapter: "eye", prereqs: ["E4"], weight: 2,
    summary: "White light splits into VIBGYOR because each colour bends by a different amount; violet bends most." },
  { id: "E6", name: "Atmospheric refraction", chapter: "eye", prereqs: ["L8"], weight: 2,
    summary: "Twinkling stars, advance sunrise and delayed sunset, caused by the varying refractive index of air." },
  { id: "E7", name: "Scattering of light (Tyndall, blue sky, red sunset)", chapter: "eye", prereqs: ["E5"], weight: 2,
    summary: "Fine particles scatter shorter wavelengths more: blue sky, red sunrise and sunset, the Tyndall effect." },
  // Electricity
  { id: "C1", name: "Electric charge & current", chapter: "electricity", prereqs: [], weight: 2,
    summary: "I = Q / t; 1 A = 1 C/s. Current is the same at every point of a series loop." },
  { id: "C2", name: "Potential difference", chapter: "electricity", prereqs: ["C1"], weight: 2,
    summary: "V = W / Q; 1 V = 1 J/C, measured across two points with a voltmeter connected in parallel." },
  { id: "C3", name: "Circuit diagrams & symbols", chapter: "electricity", prereqs: ["C1"], weight: 1,
    summary: "Standard symbols for cell, battery, key, resistor, rheostat, ammeter (series) and voltmeter (parallel)." },
  { id: "C4", name: "Ohm's law", chapter: "electricity", prereqs: ["C2", "C3"], weight: 3,
    summary: "V = IR at constant temperature; resistance is a property of the conductor, not of V or I." },
  { id: "C5", name: "Factors affecting resistance, resistivity", chapter: "electricity", prereqs: ["C4"], weight: 3,
    summary: "R = ρL / A; resistivity depends on the material and temperature, not on the dimensions." },
  { id: "C6", name: "Resistors in series", chapter: "electricity", prereqs: ["C4"], weight: 3,
    summary: "Rs = R1 + R2 + …; the same current flows through each, and the voltage divides in proportion to R." },
  { id: "C7", name: "Resistors in parallel", chapter: "electricity", prereqs: ["C4", "C6"], weight: 3,
    summary: "1/Rp = 1/R1 + 1/R2 + …; the same voltage across each, and Rp is less than the smallest branch." },
  { id: "C8", name: "Heating effect (Joule's law)", chapter: "electricity", prereqs: ["C4"], weight: 2,
    summary: "H = I²Rt; used in heaters, irons and fuses." },
  { id: "C9", name: "Electric power & energy (kWh)", chapter: "electricity", prereqs: ["C2", "C8"], weight: 3,
    summary: "P = VI = I²R = V²/R; energy in kWh, where 1 kWh = 3.6 × 10⁶ J." },
  // Magnetism
  { id: "M1", name: "Magnetic field & field lines", chapter: "magnetism", prereqs: [], weight: 2,
    summary: "Field lines run from N to S outside a magnet, never intersect, and are closer where the field is stronger." },
  { id: "M2", name: "Field of a straight conductor (RH thumb rule)", chapter: "magnetism", prereqs: ["M1", "C1"], weight: 2,
    summary: "Concentric circles around the wire; their direction is given by the right-hand thumb rule." },
  { id: "M3", name: "Field of a circular loop & solenoid", chapter: "magnetism", prereqs: ["M2"], weight: 2,
    summary: "The field inside a long solenoid is uniform, like a bar magnet's; it can make an electromagnet." },
  { id: "M4", name: "Force on a conductor (Fleming's left-hand rule)", chapter: "magnetism", prereqs: ["M1", "M3"], weight: 3,
    summary: "A current-carrying conductor in a field feels a force; the force is greatest when the current is perpendicular to the field." },
  { id: "M5", name: "Domestic electric circuits (earthing, fuse, overload)", chapter: "magnetism", prereqs: ["C7", "C8", "C9"], weight: 2,
    summary: "Live, neutral and earth wires; appliances are in parallel; a fuse in the live wire guards against overload and short circuits." },
];

export const CONCEPT_BY_ID: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
);

/** Concepts that list `id` as a prerequisite. */
export function dependentsOf(id: string): Concept[] {
  return CONCEPTS.filter((c) => c.prereqs.includes(id));
}
