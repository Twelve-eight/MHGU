// string-shape.mjs - the single classifier used to decide whether a string can support conf A.
//
// Extracted from slice-pack.mjs on 2026-11-06 for two reasons: slice-rows-audit.mjs needs the same rule to
// gate A rows (one implementation, not two), and importing a script module executed its whole body - the audit
// silently re-generated a pack on every run as a side effect of `import { stringShape }`.
const RULES = [
  [/%[sd]/i, "format"],                                    // printf-style templates
  [/^m[A-Z]/, "member"],                                   // member names: mJntNo, mParentJntNo
  [/[\\/]/, "path"],                                       // anything with a separator is a path
  [/\.(xml|tex|arc|scn|mot|rcol|user|msg|bnk|pck|json|cro|bin|cap|efx|mdf2|pfb|lmt|gu2?)$/i, "path"],
  [/^[\w .\\/-]*\.[a-z]{2,5}$/i, "path"],                  // generic resource tail; version literals (numeric tail) excluded
  [/^[caursu][A-Z][A-Za-z0-9_]*$/, "class"],               // cResourceSample, aGameBase, uCamera, rMovie, sMovie
  [/^[A-Z][a-z0-9]+[A-Z]/, "class"],                       // CamelCase from an uppercase start
  [/^[A-Za-z_]\w*::[A-Za-z]/, "class"],                    // namespace-qualified: nAreaConnect::AreaPosBase
  [/^(_Z|N\d)/, "class"],                                  // Itanium-mangled: N2nn3nex19ConnectivityManagerE
  [/^[a-z][a-z0-9_]*$/, "lower"],                          // xml/json key or keyword
];
export function stringShape(s) {
  for (const [re, shape] of RULES) if (re.test(s)) return shape;
  return "other";
}
