# The predefined icon set a property can pick from for the map's four tabs
# (Design -> Custom Design -> Map tab buttons). One set for all four tabs.
#
# Only the key is stored per property (design_system_configs.config_json
# ["tab_icons"]); the markup always comes from here. So the SVG the SDK payload
# hands the map, which it drops into the DOM as-is, can never be anything but
# one of these, and a new icon ships with a Rails deploy alone — the map needs
# no release to draw it.
#
# Every icon is drawn in outline on a single stroke inherited from the root
# <svg>, with only <path> and <circle> children. That is what lets the map's
# existing active-tab rule (`svg path, svg circle { stroke: white }`) recolour a
# custom icon exactly as it does the stock ones.
module MapTabIcons
  # Each tab's stock icon, the one the map has always drawn. A property that has
  # never picked an icon gets this, and the map keeps rendering its own built-in
  # component for it, so an upgrade changes nothing on screen.
  STOCK = {
    "units"       => "building",
    "floor_plans" => "grid",
    "amenities"   => "dumbbell",
    "favs"        => "heart"
  }.freeze

  # key => [display name (also what the picker's search matches), viewBox, body]
  #
  # The four stock entries redraw pynwheel-maps src/assets/svgs/svg.jsx
  # (UnitIcon, FloorPlansIcon, AmenitiesIcon, FavsIcon) shape-for-shape — its
  # bezier corners written as arcs — so the CMS preview matches the map. The
  # rest are Lucide (ISC), with <rect> rewritten as <path>.
  ICONS = {
    # --- Stock: what each tab has always shown ---
    "building" => ["Building", "0 0 24 24",
      '<path d="M3 21H21"/><path d="M5 21V7L13 3V21"/><path d="M19 21V11L13 7"/>' \
      '<path d="M9 9V9.01"/><path d="M9 12V12.01"/><path d="M9 15V15.01"/><path d="M9 18V18.01"/>'],
    "grid" => ["Grid", "0 0 24 24",
      '<path d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Z"/>' \
      '<path d="M14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5Z"/>' \
      '<path d="M4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4Z"/>' \
      '<path d="M14 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4Z"/>'],
    "dumbbell" => ["Dumbbell (fitness)", "0 0 24 24",
      '<path d="M2 12H3"/><path d="M6 8H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/>' \
      '<path d="M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1Z"/>' \
      '<path d="M9 12H15"/>' \
      '<path d="M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1Z"/>' \
      '<path d="M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M22 12H21"/>'],
    "heart" => ["Heart", "0 0 20 19",
      '<path d="M17.513 9.58341L10.013 17.0114L2.513 9.58341C2.0183 9.10202 1.62864 8.52342 1.36854 7.88404' \
      'C1.10845 7.24466 0.983558 6.55836 1.00173 5.86834C1.01991 5.17832 1.18076 4.49954 1.47415 3.87474' \
      'C1.76755 3.24994 2.18713 2.69266 2.70648 2.23799C3.22583 1.78331 3.8337 1.4411 4.49181 1.23289' \
      'C5.14991 1.02468 5.844 0.954991 6.53036 1.02821C7.21673 1.10143 7.8805 1.31596 8.47987 1.65831' \
      'C9.07925 2.00066 9.60124 2.46341 10.013 3.01741C10.4265 2.46743 10.9491 2.00873 11.5481 1.67001' \
      'C12.1471 1.3313 12.8095 1.11986 13.4939 1.04893C14.1784 0.977998 14.8701 1.04911 15.5258 1.2578' \
      'C16.1815 1.46649 16.787 1.80828 17.3045 2.26177C17.8221 2.71526 18.2404 3.27069 18.5334 3.8933' \
      'C18.8264 4.51591 18.9877 5.19229 19.0073 5.88012C19.0269 6.56794 18.9043 7.2524 18.6471 7.89066' \
      'C18.39 8.52891 18.0039 9.10723 17.513 9.58941"/>'],

    # --- General purpose ---
    "home" => ["Home", "0 0 24 24",
      '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>' \
      '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
    "layers" => ["Layers", "0 0 24 24",
      '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>' \
      '<path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>'],
    "key" => ["Key", "0 0 24 24",
      '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/>' \
      '<circle cx="7.5" cy="15.5" r="5.5"/>'],
    "waves" => ["Waves (pool)", "0 0 24 24",
      '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>' \
      '<path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>' \
      '<path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>'],
    "tree" => ["Tree (outdoors)", "0 0 24 24",
      '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/>' \
      '<path d="M12 22v-3"/>'],
    "coffee" => ["Coffee (lounge)", "0 0 24 24",
      '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/>' \
      '<path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>'],
    "paw" => ["Paw (pets)", "0 0 24 24",
      '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/>' \
      '<path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>'],
    "sun" => ["Sun (rooftop)", "0 0 24 24",
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/>' \
      '<path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/>' \
      '<path d="m19.07 4.93-1.41 1.41"/>'],
    "users" => ["People (community)", "0 0 24 24",
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' \
      '<path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'],
    "map_pin" => ["Map pin", "0 0 24 24",
      '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>' \
      '<circle cx="12" cy="10" r="3"/>'],
    "star" => ["Star", "0 0 24 24",
      '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904' \
      'l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0' \
      'L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906' \
      'l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'],
    "bookmark" => ["Bookmark", "0 0 24 24",
      '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'],
    "tag" => ["Tag (pricing)", "0 0 24 24",
      '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>' \
      '<circle cx="7.5" cy="7.5" r=".5"/>'],
    "list" => ["List", "0 0 24 24",
      '<path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>'],
    "compass" => ["Compass", "0 0 24 24",
      '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>' \
      '<circle cx="12" cy="12" r="10"/>'],
    "camera" => ["Camera", "0 0 24 24",
      '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>' \
      '<circle cx="12" cy="13" r="3"/>'],
    "car" => ["Car (parking)", "0 0 24 24",
      '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5' \
      'c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>' \
      '<circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'],
    "sofa" => ["Sofa (furnished)", "0 0 24 24",
      '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/>' \
      '<path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/>' \
      '<path d="M4 18v2"/><path d="M20 18v2"/><path d="M12 4v9"/>'],
    "wifi" => ["Wi-Fi", "0 0 24 24",
      '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/>' \
      '<path d="M8.5 16.429a5 5 0 0 1 7 0"/>'],
    "briefcase" => ["Briefcase (commercial)", "0 0 24 24",
      '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' \
      '<path d="M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>'],

    # --- Units: homes, rooms, doors ---
    "apartments" => ["Apartment building", "0 0 24 24",
      '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>' \
      '<path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'],
    "door" => ["Door (unit entry)", "0 0 24 24",
      '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/>' \
      '<path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>'],
    "bed_double" => ["Double bed (bedrooms)", "0 0 24 24",
      '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/>' \
      '<path d="M12 4v6"/><path d="M2 18h20"/>'],
    "bed" => ["Bed (student beds)", "0 0 24 24",
      '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>'],
    "unit_number" => ["Number sign (unit number)", "0 0 24 24",
      '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/>'],
    "warehouse" => ["Warehouse (storage, industrial)", "0 0 24 24",
      '<path d="M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11"/>' \
      '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35a2 2 0 0 1 1.26-1.86l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>' \
      '<path d="M6 13h12"/><path d="M6 17h12"/>'],

    # --- Floor plans: layouts, measurements, drawings ---
    "floor_plan" => ["Floor plan (rooms)", "0 0 24 24",
      '<path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>' \
      '<path d="M3 12h7"/><path d="M14 12h7"/><path d="M12 3v5"/><path d="M12 16v5"/>'],
    "layout" => ["Layout (dashboard)", "0 0 24 24",
      '<path d="M4 3h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>' \
      '<path d="M15 3h5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>' \
      '<path d="M15 12h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/>' \
      '<path d="M4 16h5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z"/>'],
    "ruler" => ["Ruler (dimensions)", "0 0 24 24",
      '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/>' \
      '<path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>'],
    "expand" => ["Expand (square footage)", "0 0 24 24",
      '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>'],
    "area" => ["Frame (area)", "0 0 24 24",
      '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>' \
      '<path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>'],
    "map" => ["Folded map (site plan)", "0 0 24 24",
      '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277' \
      'a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894' \
      'l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>'],
    "document" => ["Document (brochure)", "0 0 24 24",
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>' \
      '<path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'],

    # --- Amenities: the pictograms buildings and hotels use for facilities ---
    "dining" => ["Knife and fork (dining)", "0 0 24 24",
      '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>' \
      '<path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 3 2h2Zm0 0v7"/>'],
    "laundry" => ["Washing machine (laundry)", "0 0 24 24",
      '<path d="M3 6h3"/><path d="M17 6h.01"/><path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>' \
      '<circle cx="12" cy="13" r="5"/><path d="M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5"/>'],
    "bath" => ["Bath (spa)", "0 0 24 24",
      '<path d="M10 4 8 6"/><path d="M17 19v2"/><path d="M2 12h20"/><path d="M7 19v2"/>' \
      '<path d="M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>'],
    "bike" => ["Bicycle (bike storage)", "0 0 24 24",
      '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>' \
      '<path d="M12 17.5V14l-3-3 4-3 2 3h2"/>'],
    "ev_charging" => ["Lightning bolt (EV charging)", "0 0 24 24",
      '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63' \
      'l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'],
    "flame" => ["Flame (fire pit, grill)", "0 0 24 24",
      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5' \
      'a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'],
    "package" => ["Package (parcel lockers)", "0 0 24 24",
      '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/>' \
      '<path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>'],
    "game" => ["Game controller (game room)", "0 0 24 24",
      '<path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 13h.01"/><path d="M18 11h.01"/>' \
      '<path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3' \
      'c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3' \
      'c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>'],
    "security" => ["Shield (security, gated)", "0 0 24 24",
      '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72' \
      'a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'],
    "snowflake" => ["Snowflake (air conditioning)", "0 0 24 24",
      '<path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/>' \
      '<path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/>' \
      '<path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/>' \
      '<path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/>'],
    "mountain" => ["Mountain (views)", "0 0 24 24",
      '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>'],
    "sparkles" => ["Sparkles (features)", "0 0 24 24",
      '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5' \
      'l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063' \
      'a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>' \
      '<path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>'],

    # --- Favorites: saving and shortlisting ---
    "bookmark_check" => ["Bookmark with check (saved)", "0 0 24 24",
      '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/><path d="m9 10 2 2 4-4"/>'],
    "thumbs_up" => ["Thumbs up (liked)", "0 0 24 24",
      '<path d="M7 10v12"/>' \
      '<path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76' \
      'a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>'],
    "check_circle" => ["Check mark (shortlist)", "0 0 24 24",
      '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'],
    "pin" => ["Pushpin (pinned)", "0 0 24 24",
      '<path d="M12 17v5"/>' \
      '<path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76' \
      'a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>'],
    "flag" => ["Flag (marked)", "0 0 24 24",
      '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8' \
      'A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>']
  }.freeze

  # Which icons suit which tab. The picker opens each tab's group right after its
  # stock icon ("Suggested for Floor Plans"), then the rest of the set, since any
  # tab may still use any icon. An icon missing here only shows under "All".
  GROUPS = {
    "units"       => %w[building apartments home door key bed_double bed unit_number warehouse briefcase],
    "floor_plans" => %w[grid floor_plan layout layers ruler expand area map document list],
    "amenities"   => %w[dumbbell waves tree coffee dining laundry bath paw bike car ev_charging flame
                        package game wifi security snowflake sofa sun mountain users sparkles],
    "favs"        => %w[heart star bookmark bookmark_check thumbs_up check_circle pin flag]
  }.freeze

  module_function

  def valid?(key)
    ICONS.key?(key.to_s)
  end

  # The markup for one icon: a 24px outline <svg>, stroke in the map's main
  # font colour to match the stock components.
  def svg(key)
    _name, view_box, body = ICONS.fetch(key.to_s)
    %(<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="#{view_box}" fill="none" ) +
      %(stroke="#1F1F1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">#{body}</svg>)
  end

  # For the CMS picker: every icon in display order, each tab's stock icon
  # included, so one tab can borrow another's (Amenities can use the heart).
  def catalog
    ICONS.map { |key, (name, _vb, _body)| { key: key, name: name, svg: svg(key) } }
  end
end
