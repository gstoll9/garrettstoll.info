// The Sun's motion around the Milky Way, hand-curated from the saved Wikipedia articles in
// ../wikipedia/Galaxy/ (each value's source below). utils.tsx's "Galactic motion" section
// turns these into the Sun's galactic orbit and the planets' helical paths.
//
//   Oort constants  A = 15.3, B = -11.9 km/s/kpc (Gaia, Bovy 2017 — "Oort constants"). They
//                   fix the local angular speed Ω = A - B = 27.2 km/s/kpc and the slope of the
//                   rotation curve, dlnV/dlnR = -(A + B)/(A - B) = -0.125.
//   Peculiar motion U, V, W = 10.0, 5.25, 7.17 km/s relative to the local standard of rest
//                   (Dehnen & Binney 1998, quoted in "Solar apex"): toward the Galactic
//                   Centre, along the rotation, and toward the north galactic pole.
//   Vertical period ~83 Myr ("Sun", Galactic motion section).
//   Sun's position  8.178 kpc from the centre, 20.8 pc above the plane (localGroupHosts.ts).
//
// Consistency checks against the figures those articles quote (computed by utils.tsx):
//   circular speed Ω·R0 = 222 km/s, total speed 228 km/s   ("average speed of 230 km/s")
//   galactic year 2π/Ω = 226 Myr                          ("approximately 225 million years")
//   epicycle period 2π/κ, κ² = -4B(A-B): 171 Myr          ("about 166 million years")
//   vertical amplitude √(z0² + (W/ν)²) = 99 pc            ("moving about 99 parsecs away")
// The integrated orbit itself (peculiar motion included) takes 233 Myr per revolution
// ("225–250 million years"), with a 176 Myr in-and-out cycle between 8.05 and 8.78 kpc.
// Other articles quote a faster 251 km/s ("Sun" infobox) from a larger assumed circular
// speed; the set above is used because it's internally consistent.

export const GALACTIC_MOTION = {
  oortA: 15.3, // km/s/kpc
  oortB: -11.9, // km/s/kpc
  peculiarKms: { U: 10.0, V: 5.25, W: 7.17 },
  verticalPeriodMyr: 83,
};
