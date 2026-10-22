function autoPlotUnits() {
  const svgElement = parsedSVGs?.[0];
  if (!svgElement || !mapped_units?.length) return {};

  const filteredUnits = normalizeFeedUnits(mapped_units);
  const propertyId = getPropertyId(filteredUnits);
  const pointerData = processSvgForAutoPlotting(svgElement, filteredUnits);
  savePointerData(pointerData, propertyId).catch(error => {
    $(".divLoading").addClass("hidden");
    alert(error.message);
  });
}

function getPropertyId(filteredUnits) {
  return [...new Set(filteredUnits.map(u => u.communityId))][0];
}

function normalize(str) {
  return String(str || "").trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function extractShortName(str) {
  if (!str) return "";
  const parts = String(str).split(/[-_\s\/\.]+/).filter(Boolean);
  return parts[parts.length - 1] || "";
}

function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const len = Math.min(a.length, b.length);
  let match = 0;
  for (let i = 0; i < len; i++) if (a[i] === b[i]) match++;
  return match / Math.max(a.length, b.length);
}

function parsePoints(pointsStr) {
  return (pointsStr || "")
    .trim()
    .split(/\s+/)
    .map(pair => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    })
    .filter(p => !isNaN(p.x) && !isNaN(p.y));
}

function getPolygonCentroid(points) {
  if (!points.length) return { x: 0, y: 0 };
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

// The apartment a bedroom belongs to: "207-B" -> "207", "12b" -> "12". Same rule
// as SdkUnitSpaceGrouper.apartment_number, so auto plot groups bedrooms onto the
// door the map later shows them under. Names ending in a number ("2-101", "103")
// are their own door.
function apartmentNumber(name) {
  const match = String(name || "").trim().match(/^(.*\d)[^A-Za-z0-9]?[A-Za-z]{1,2}$/);
  return match ? match[1] : null;
}

function normalizeFeedUnits(units) {
  return units.map(u => ({
    id: u.id,
    communityId: u.community_id,
    doorName: apartmentNumber(u.marketing_name) || String(u.marketing_name || "").trim(),
    isBedroom: !!apartmentNumber(u.marketing_name),
    baseName: normalize(u.marketing_name),
    shortName: normalize(extractShortName(u.marketing_name)),
    floor: normalize(u.floor),
    building: normalize(u.building),
    buildingKeys: buildingKeysForUnit(u)
  }));
}

// Building numbers a unit may sit under on the map, most trusted first. Map groups
// are "Building_1" while feeds say "01" or "1108484-01", and some leave building
// blank and only carry it in the name ("1108484-01-0101", "10-0101").
function buildingKeysForUnit(u) {
  const keys = [];
  const building = String(u.building || "").trim();
  if (building) keys.push(canonicalKey(building), canonicalKey(extractShortName(building)));
  const door = apartmentNumber(u.marketing_name) || u.marketing_name;
  const nameParts = String(door || "").split(/[-_\s\/\.]+/).filter(Boolean);
  if (nameParts.length > 1) keys.push(canonicalKey(nameParts[nameParts.length - 2]));
  return [...new Set(keys.filter(Boolean))];
}

function processSvgForAutoPlotting(svgElement, filteredUnits) {
  if (!svgElement) return {};

  const unitsGroup = svgElement.querySelector("#Units") || svgElement;
  if (!unitsGroup) return {};

  // Collect all <g> elements with IDs
  const allGroups = Array.from(unitsGroup.querySelectorAll("g[id]"));
  const buildingGroups = allGroups.filter(g => /^building[\s_]?/i.test(g.id));
  const floorGroups = allGroups.filter(g => /^floor[\s_]?/i.test(g.id));

  let pointerData = {};

  // Step 1 — Try building-based matching first
  if (buildingGroups.length > 0 && floorGroups.length >0) {
    pointerData = processSvgByBuildings(unitsGroup, filteredUnits);
  }

  // Step 2 — Fallback to floor-based matching if pointerData is empty
  // if (!hasPointerData(pointerData) && floorGroups.length > 0) {
  //   pointerData = processSvgByFloors(unitsGroup, filteredUnits);
  // }

  // Step 3 — Fallback to direct polygon matching if still empty
  if (!hasPointerData(pointerData)) {
    pointerData = processSvgUnitsOnly(unitsGroup, filteredUnits);
  }

  return pointerData;
}

function hasPointerData(pointerData) {
  return pointerData && Object.keys(pointerData).length > 0;
}

function groupNumber(group, prefix) {
  return canonicalKey(group.id.replace(prefix, "").split(/[\s_]/)[0]);
}

function processSvgByBuildings(unitsGroup, filteredUnits) {
  const pointerData = {};
  const buildingPrefix = /^building[\s_]?/i;
  const floorPrefix = /^floor[\s_]?/i;

  const buildingGroups = Array.from(unitsGroup.querySelectorAll("g[id]"))
    .filter(g => buildingPrefix.test(g.id));
  const mapBuildings = new Set(buildingGroups.map(g => groupNumber(g, buildingPrefix)));

  // Each unit goes to the first of its building keys the map actually has, so a
  // unit is never matched under two buildings that both label their doors "101".
  const unitsByBuilding = new Map();
  filteredUnits.forEach(unit => {
    const key = unit.buildingKeys.find(k => mapBuildings.has(k));
    if (!key) return;
    if (!unitsByBuilding.has(key)) unitsByBuilding.set(key, []);
    unitsByBuilding.get(key).push(unit);
  });

  buildingGroups.forEach(buildingGroup => {
    const buildingUnits = unitsByBuilding.get(groupNumber(buildingGroup, buildingPrefix)) || [];

    const floorGroups = Array.from(buildingGroup.querySelectorAll("g[id]"))
      .filter(g => floorPrefix.test(g.id));

    // A building drawn as one floor takes the units on that floor plus any with
    // no floor; if the feed's floors don't line up with the map at all, it takes
    // every unit in the building rather than none.
    if (floorGroups.length <= 1) {
      const floorName = floorGroups[0] ? groupNumber(floorGroups[0], floorPrefix) : "";
      const onFloor = buildingUnits.filter(u => !u.floor || canonicalKey(u.floor) === floorName);
      const svgUnits = extractSvgUnits(floorGroups[0] || buildingGroup);
      Object.assign(pointerData, matchUnitsToSvg(onFloor.length ? onFloor : buildingUnits, svgUnits));
      return;
    }

    floorGroups.forEach(floorGroup => {
      const floorName = groupNumber(floorGroup, floorPrefix);
      const floorUnits = buildingUnits.filter(u => canonicalKey(u.floor) === floorName);
      const svgUnits = extractSvgUnits(floorGroup);
      Object.assign(pointerData, matchUnitsToSvg(floorUnits, svgUnits));
    });
  });

  return pointerData;
}

function processSvgByFloors(unitsGroup, filteredUnits) {
  const pointerData = {};

  const floorGroups = Array.from(unitsGroup.querySelectorAll("g[id]"))
    .filter(g => /^floor[\s_]?/i.test(g.id));

  floorGroups.forEach(floorGroup => {
    const floorName = normalize(floorGroup.id.replace(/^floor[\s_]?/i, "").split(/[\s_]/)[0]);
    const floorUnits = filteredUnits.filter(u => normalize(u.floor) === floorName);
    const svgUnits = extractSvgUnits(floorGroup);
    Object.assign(pointerData, matchUnitsToSvg(floorUnits, svgUnits));
  });

  return pointerData;
}

function processSvgUnitsOnly(unitsGroup, filteredUnits) {
  const pointerData = {};
  const svgUnits = extractSvgUnits(unitsGroup);
  Object.assign(pointerData, matchUnitsToSvg(filteredUnits, svgUnits));
  return pointerData;
}

function extractSvgUnits(svgParent) {
  // ".cloned" polygons are the plot markers drawn over already-plotted units,
  // not part of the map itself.
  return Array.from(svgParent.querySelectorAll("polygon:not(.cloned)")).map(polygon => {
    const parentG = polygon.closest("g");
    const label = parentG?.querySelector("text")?.textContent?.trim() || "";
    const points = parsePoints(polygon.getAttribute("points"));
    const { x, y } = getPolygonCentroid(points);
    const polygonId = polygon.id || "";
    const namedAncestorG = polygon.closest("g[id]");
    const groupId = namedAncestorG?.id || "";
    return {
      id: polygonId || groupId,
      polygonId,
      groupId,
      normalized: normalize(label),
      x_plot: x,
      y_plot: y,
      tag: "polygon"
    };
  });
}

function generateVariants(base, floor, building) {
  const cleanBase = normalize(base || "");
  const cleanFloor = normalize(floor || "");
  const cleanBuilding = normalize(building || "");

  // Helper to add many variations with separators
  const joinVariants = (a, b) => [
    `${a}${b}`,
    `${a}-${b}`,
    `${a}_${b}`,
    `${a} ${b}`,
    `${b}${a}`,
    `${b}-${a}`,
    `${b}_${a}`,
    `${b} ${a}`,
  ];

  // Split base into meaningful fragments:
  //  - split on non-alphanum
  //  - split on letter<->digit boundaries: "Unit101A" -> ["Unit","101A"]
  const baseFragments = Array.from(
    new Set(
      cleanBase
        .split(/[^A-Z0-9]+/i)
        .map(s => s.trim())
        .filter(Boolean)
        .flatMap(s => s.split(/(?<=\D)(?=\d)|(?<=\d)(?=\D)/))
        .map(s => normalize(s))
        .filter(Boolean)
    )
  );

  // Collect number-like tokens (digits with optional trailing/leading letters, e.g. "101A", "A101")
  const numberLike = Array.from(
    new Set(
      Array.from(cleanBase.matchAll(/[A-Z]*\d+[A-Z]*/gi), m => normalize(m[0])).filter(Boolean)
    )
  );

  // Also include any fragments produced from numberLike (safe-guard)
  numberLike.forEach(n => {
    if (!baseFragments.includes(n)) baseFragments.push(n);
  });

  // Base set (prioritized order): exact base, numeric tokens, fragments
  const patterns = [
    cleanBase,
    ...numberLike,
    ...baseFragments,
    // also include base with floor/building removed if present
    ...(cleanFloor && cleanBase.includes(cleanFloor) ? [normalize(cleanBase.replace(cleanFloor, ""))] : []),
    ...(cleanBuilding && cleanBase.includes(cleanBuilding) ? [normalize(cleanBase.replace(cleanBuilding, ""))] : []),
  ].filter(Boolean);

  const result = new Set();

  // Add raw patterns and simple combos with floor/building
  patterns.forEach(p => {
    result.add(normalize(p));
    if (cleanFloor) {
      joinVariants(cleanFloor, p).forEach(v => result.add(normalize(v)));
      joinVariants(p, cleanFloor).forEach(v => result.add(normalize(v)));
    }
    if (cleanBuilding) {
      joinVariants(cleanBuilding, p).forEach(v => result.add(normalize(v)));
      joinVariants(p, cleanBuilding).forEach(v => result.add(normalize(v)));
    }
    // combine building+floor+pattern and floor+building+pattern
    if (cleanBuilding && cleanFloor) {
      joinVariants(cleanBuilding + cleanFloor, p).forEach(v => result.add(normalize(v)));
      joinVariants(cleanFloor + cleanBuilding, p).forEach(v => result.add(normalize(v)));
    }
  });

  // Add isolated floor/building and joined forms
  if (cleanFloor) {
    result.add(cleanFloor);
    result.add(cleanFloor + cleanBase);
    result.add(cleanBase + cleanFloor);
  }
  if (cleanBuilding) {
    result.add(cleanBuilding);
    result.add(cleanBuilding + cleanBase);
    result.add(cleanBase + cleanBuilding);
  }

  // Also add compact variants (no separators) for every entry
  Array.from(result).forEach(v => {
    result.add(normalize(v.replace(/[-_\s]+/g, "")));
  });

  // Return as prioritized array:
  // Put patterns that contain digits earlier (more likely to match unit numbers)
  const arr = Array.from(result);
  arr.sort((a, b) => {
    const aHasNum = /\d/.test(a) ? 0 : 1;
    const bHasNum = /\d/.test(b) ? 0 : 1;
    if (aHasNum !== bHasNum) return aHasNum - bHasNum; // numbers first
    // shorter first (prefer concise matches)
    return a.length - b.length;
  });

  return Array.from(new Set(arr)); // dedupe and return
}

// Strips leading zeros from every digit run so "0207" == "207" and "A-0101" == "A101".
function canonicalKey(str) {
  return normalize(str).replace(/\d+/g, d => String(parseInt(d, 10)));
}

// Exact keys a unit may be labelled with on the SVG, in priority order.
function exactKeysForUnit(unit) {
  const short = unit.shortName;
  const keys = [unit.baseName, short];
  if (unit.building && short) keys.push(unit.building + short, short + unit.building);
  return [...new Set(keys.filter(Boolean).map(canonicalKey))];
}

function digitsOf(str) {
  return (String(str).match(/\d+/g) || []).map(d => String(parseInt(d, 10)));
}

// Units whose name carries a prefix the map label drops, e.g. "enclave-01201"
// (building 01, unit 201) labelled "201", or "enclave-01050" labelled "050". Only
// pairs that are unambiguous both ways are assigned, so two buildings sharing a
// "201" label never get guessed. Returns the unmatched units.
function matchByNumberSuffix(units, svgUnits, claimed, assign) {
  const isUnitNumber = str => /^\d{3,}[A-Z]*$/.test(str);
  const endsWithLabel = (name, label) => isUnitNumber(label) && name.length > label.length && name.endsWith(label);
  const openSvg = svgUnits.filter(u => !claimed.has(u) && (isUnitNumber(u.canonical) || isUnitNumber(u.normalized)));
  const candidates = new Map();
  const unitsPerSvg = new Map();

  units.forEach(unit => {
    const key = canonicalKey(unit.shortName);
    const matches = openSvg.filter(s =>
      endsWithLabel(key, s.canonical) || endsWithLabel(unit.shortName, s.normalized)
    );
    candidates.set(unit, matches);
    matches.forEach(s => unitsPerSvg.set(s, (unitsPerSvg.get(s) || 0) + 1));
  });

  return units.filter(unit => {
    const matches = candidates.get(unit);
    if (matches.length === 1 && unitsPerSvg.get(matches[0]) === 1) {
      assign(unit, matches[0]);
      return false;
    }
    return true;
  });
}

// Student housing stores each bedroom as its own unit ("207-A".."207-D"), all
// plotted on the one polygon labelled "207". Groups units by door so the door is
// matched once and every bedroom shares its marker.
function groupUnitsByDoor(units) {
  const doors = new Map();
  units.forEach(unit => {
    const key = [unit.building, unit.floor, canonicalKey(unit.doorName)].join("|");
    if (!doors.has(key)) doors.set(key, []);
    doors.get(key).push(unit);
  });
  return Array.from(doors.values());
}

function doorTarget(members) {
  const { doorName, floor, building } = members[0];
  return {
    id: `door:${members[0].id}`,
    baseName: normalize(doorName),
    shortName: normalize(extractShortName(doorName)),
    floor,
    building
  };
}

function matchUnitsToSvg(units, svgUnits) {
  const pointerData = {};
  const claimed = new Set(); // each SVG polygon may be assigned to only one door

  svgUnits = svgUnits
    .map(u => ({ ...u, normalized: normalize(u.normalized) }))
    .map(u => ({ ...u, canonical: canonicalKey(u.normalized) }));

  const membersByTarget = new Map();
  const assign = (target, svgUnit) => {
    claimed.add(svgUnit);
    (membersByTarget.get(target) || [target]).forEach(unit => {
      pointerData[unit.id] = formatPointerData(svgUnit);
    });
  };

  // A unit with no bedroom letter is its own target. Bedrooms are matched by
  // their door ("0121-A" -> "0121"), even a lone one, since the letter is never
  // on the map. Any bedroom that does carry its own label ("101A" and "101B" as
  // separate apartments) keeps it; the rest are plotted together on the door.
  const targets = [];
  groupUnitsByDoor(units).forEach(members => {
    if (members.length === 1 && !members[0].isBedroom) {
      targets.push(members[0]);
      return;
    }
    const onDoor = members.filter(unit => {
      const match = svgUnits.find(u => !claimed.has(u) &&
        ((u.normalized && u.normalized === unit.baseName) || (u.canonical && u.canonical === canonicalKey(unit.baseName))));
      if (match) assign(unit, match);
      return !match;
    });
    if (onDoor.length) {
      const target = doorTarget(onDoor);
      membersByTarget.set(target, onDoor);
      targets.push(target);
    }
  });

  // Pass 1 — exact matching for every unit before any fuzzy guessing, so a
  // fuzzy guess can never steal a polygon that another unit matches exactly.
  const tiers = [
    unit => [unit.baseName],
    unit => [unit.shortName],
    unit => exactKeysForUnit(unit)
  ];
  let remaining = targets;
  tiers.forEach((keysFor, tierIndex) => {
    const field = tierIndex < 2 ? "normalized" : "canonical";
    remaining = remaining.filter(unit => {
      const keys = keysFor(unit).filter(Boolean);
      for (const key of keys) {
        const match = svgUnits.find(u => !claimed.has(u) && u[field] && u[field] === key);
        if (match) {
          assign(unit, match);
          return false;
        }
      }
      return true;
    });
  });
  remaining = matchByNumberSuffix(remaining, svgUnits, claimed, assign);

  // Pass 2 — fuzzy fallback against unclaimed polygons only. When both names
  // carry numbers, the numbers must agree so "0205" can never land on "200".
  remaining.forEach(unit => {
    const unitDigits = digitsOf(unit.baseName);
    const variants = generateVariants(unit.baseName, unit.floor, unit.building);
    if (unit.shortName && unit.shortName !== unit.baseName) variants.unshift(unit.shortName);

    let bestMatch = null;
    let bestScore = 0;

    svgUnits.forEach(svgUnit => {
      if (claimed.has(svgUnit) || !svgUnit.normalized) return;
      const svgDigits = digitsOf(svgUnit.normalized);
      if (unitDigits.length && svgDigits.length && !svgDigits.every(d => unitDigits.includes(d))) return;

      variants.forEach(variant => {
        const score = stringSimilarity(variant, svgUnit.normalized);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = svgUnit;
        }
      });
    });

    const threshold = /\d/.test(unit.baseName) ? 0.55 : 0.6;
    if (bestMatch && bestScore >= threshold) {
      assign(unit, bestMatch);
    } else {
      console.warn("[autoPlot] No SVG match for unit", unit.id, unit.baseName);
    }
  });

  return pointerData;
}

function formatPointerData(svgUnit) {
  const id = svgUnit.polygonId || svgUnit.groupId || "";
  const useGroupSelector = !svgUnit.polygonId && !!svgUnit.groupId;
  return {
    id,
    tag: useGroupSelector ? null : "polygon",
    x_plot: Math.round(svgUnit.x_plot).toString(),
    y_plot: Math.round(svgUnit.y_plot).toString(),
    selector: useGroupSelector ? `g[id="${id}"] polygon` : ""
  };
}

async function savePointerData(pointerData, propertyId) {
  const filteredPointerData = Object.fromEntries(
    Object.entries(pointerData).filter(([_, v]) => v.id && v.id.trim() !== "")
  );
  if (!Object.keys(filteredPointerData).length)
    throw new Error("Auto Plot couldn't match any unit names to the labels on this map.");

  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
  const response = await fetch(`/communities/${propertyId}/save_pointer_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-CSRF-Token": token,
    },
    credentials: "include", // Required for Devise
    body: JSON.stringify({ pointer_data: filteredPointerData }),
  });

  const result = await response.json();

  if (!response.ok)
    throw new Error(result.error || "Failed to save pointer data");

  window.location.reload();
}