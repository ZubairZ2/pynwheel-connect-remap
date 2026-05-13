function autoPlotUnits() {
  const svgElement = parsedSVGs?.[0];
  if (!svgElement || !mapped_units?.length) return {};

  const filteredUnits = normalizeFeedUnits(mapped_units);
  const propertyId = getPropertyId(filteredUnits);
  const pointerData = processSvgForAutoPlotting(svgElement, filteredUnits);
  savePointerData(pointerData, propertyId);
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

function normalizeFeedUnits(units) {
  return units.map(u => ({
    id: u.id,
    communityId: u.community_id,
    baseName: normalize(u.marketing_name),
    shortName: normalize(extractShortName(u.marketing_name)),
    floor: normalize(u.floor),
    building: normalize(u.building)
  }));
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

function processSvgByBuildings(unitsGroup, filteredUnits) {
  const pointerData = {};

  const buildingGroups = Array.from(unitsGroup.querySelectorAll("g[id]"))
    .filter(g => /^building[\s_]?/i.test(g.id));

  buildingGroups.forEach(buildingGroup => {
    const buildingName = normalize(buildingGroup.id.replace(/^building[\s_]?/i, "").split(/[\s_]/)[0]);
    const buildingUnits = filteredUnits.filter(u => normalize(u.building) === buildingName);

    const floorGroups = Array.from(buildingGroup.querySelectorAll("g[id]"))
      .filter(g => /^floor[\s_]?/i.test(g.id));

    if (floorGroups.length === 0) {
      // Fallback: building without floors
      const svgUnits = extractSvgUnits(buildingGroup);
      Object.assign(pointerData, matchUnitsToSvg(buildingUnits, svgUnits));
      return;
    }

    floorGroups.forEach(floorGroup => {
      const floorName = normalize(floorGroup.id.replace(/^floor[\s_]?/i, "").split(/[\s_]/)[0]);
      const floorUnits = buildingUnits.filter(u => normalize(u.floor) === floorName);
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
  return Array.from(svgParent.querySelectorAll("polygon")).map(polygon => {
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

function matchUnitsToSvg(units, svgUnits) {
  const pointerData = {};

  // Normalize all SVG units once
  svgUnits = svgUnits.map(u => ({ ...u, normalized: normalize(u.normalized) }));

  units.forEach(unit => {
    const base = normalize(unit.baseName);
    const short = normalize(unit.shortName || "");

    // Step 1 — exact match on full normalized name
    let match = svgUnits.find(u => u.normalized === base);

    // Step 1b — exact match on short name (last dash/space-separated segment)
    if (!match && short && short !== base) {
      match = svgUnits.find(u => u.normalized === short);
    }

    if (match) {
      pointerData[unit.id] = formatPointerData(match);
      return;
    }

    // Step 2 — fallback to variant + similarity
    const variants = generateVariants(unit.baseName, unit.floor, unit.building);
    if (short && short !== base) variants.unshift(short);

    let bestMatch = null;
    let bestScore = 0;

    svgUnits.forEach(svgUnit => {
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
      pointerData[unit.id] = formatPointerData(bestMatch);
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