# Custom Design Tab — Work Plan

**Feature:** PYN-XXXX — Consolidated Custom Design Tab in CMS  
**Branch:** `pyn-custom-design-tab` (suggested)  
**Author:** Salahudin Sallu  
**Date:** 2026-06-01

---

## Overview

Introduce a new **Custom Design** tab in the CMS map settings (`/communities/:id/design`) that consolidates all visual customization in one place: design-system color palette, font controls, and SVG unit-number font color. The saved config is:

1. Passed as `themeConfig` to `pyn-map-sdk-v1.js` via the existing SDK controller (server-rendered, no API fetch needed)
2. Applied as CSS custom properties (`:root` vars) server-rendered into the pricing calculator layout

Both consumers are server-rendered Rails views, so no separate JSON API endpoint is required.

---

## Architecture Decisions

### 1. New table — `design_system_configs` (JSONB)

Following the same pattern as `calculator_configs`, a single `config_json` JSONB column gives schema flexibility without further bloating the already-130-column `designs` table.

```
design_system_configs
  id             integer PK
  community_id   integer FK → communities, unique index
  config_json    jsonb NOT NULL DEFAULT '{}'
  created_at     timestamp
  updated_at     timestamp
```

**config_json schema:**

```json
{
  "colors": {
    "primary":          "#E25C0A",
    "primary_light_10": "#FBF3F0",
    "primary_light_20": "#F5DDD2",
    "main_font":        "#1F1F1F",
    "subtext":          "#5A5A5A",
    "icon_background":  "#919191",
    "stroke_outlines":  "#D0D0D0",
    "light_background": "#F5F5F5",
    "label_yellow":     "#F7CF76",
    "label_orange":     "#BF5448",
    "label_coral":      "#BF8753"
  },
  "fonts": {
    "family":       "Inter",
    "base_size":    "14px",
    "heading_size": "16px"
  },
  "svg_unit_number": {
    "dynamic_contrast": true,
    "manual_color":     "#FFFFFF",
    "opacity_vacant":   1.0,
    "opacity_model":    1.0,
    "opacity_occupied": 1.0
  }
}
```

Default values above are the design-system defaults. All communities can customise all fields.

### 2. Shared delivery via CSS Custom Properties

The config is emitted as a `<style>` block containing `:root` CSS variables. This is the single "common place":

```css
:root {
  --pyn-primary:          #E25C0A;
  --pyn-primary-light-10: #FBF3F0;
  --pyn-primary-light-20: #F5DDD2;
  --pyn-main-font:        #1F1F1F;
  --pyn-subtext:          #5A5A5A;
  --pyn-icon-bg:          #919191;
  --pyn-stroke:           #D0D0D0;
  --pyn-light-bg:         #F5F5F5;
  --pyn-label-yellow:     #F7CF76;
  --pyn-label-orange:     #BF5448;
  --pyn-label-coral:      #BF8753;
  --pyn-font-family:      'Inter', sans-serif;
  --pyn-base-font-size:   14px;
  --pyn-heading-font-size:16px;
}
```

A shared Rails helper (`design_system_css_vars`) renders this on:
- Map embed pages (`webpages/show`)
- Pricing calculator pages (`pricing_calculators/show`)
- (Future) any other embedded Pynwheel page

### 3. SDK themeConfig integration

`PynMapSDK.init()` gains a new `themeConfig` key (alongside the existing `styles`):

```js
PynMapSDK.init({
  container:    '#map',
  propertyId:   123,
  themeConfig: {
    colors: { primary: '#E25C0A', ... },
    fonts:  { family: 'Inter', baseSize: '14px', headingSize: '16px' },
    svgUnitNumber: { dynamicContrast: true, manualColor: '#FFFFFF' }
  }
});
```

Inside the SDK, `themeConfig` is applied to:
- `styles.unitLabels.fontFamily` / `fontSize`
- `styles.unitLabels.fontColor` via dynamic-contrast logic (auto white/dark based on fill luminance)
- CSS custom properties injected into the map container's shadow/parent scope

`themeConfig` is **lower-priority** than an explicit `styles` override — existing callers are unaffected.

---

## Files to Create / Modify

### New Files

| File | Purpose |
|------|---------|
| `db/migrate/YYYYMMDD_create_design_system_configs.rb` | DB migration |
| `app/models/design_system_config.rb` | Model, JSONB accessors, `to_theme_config`, `to_css_vars` |
| `app/controllers/design_system_configs_controller.rb` | CMS show + update |
| `app/views/design/_custom_design.html.haml` | CMS tab partial |
| `app/helpers/design_system_helper.rb` | `design_system_css_vars` helper |

### Modified Files

| File | Change |
|------|--------|
| `app/models/community.rb` | `has_one :design_system_config` |
| `app/views/design/index.html.haml` | Add Custom Design tab + panel |
| `config/routes.rb` | Add CMS `design_system_configs` route only (no API route) |
| `app/views/webpages/show.html.haml` | Pass `themeConfig` inline to existing SDK init |
| `app/views/layouts/pricing_calculator.html.haml` | Emit CSS vars server-side |
| `public/sdk/pyn-map-sdk-v1.js` | Accept + apply `themeConfig` |

---

## Detailed Implementation Steps

### Step 1 — Migration & Model

```ruby
# db/migrate/YYYYMMDD_create_design_system_configs.rb
class CreateDesignSystemConfigs < ActiveRecord::Migration[7.x]
  def change
    create_table :design_system_configs do |t|
      t.references :community, null: false, foreign_key: true, index: { unique: true }
      t.jsonb :config_json, null: false, default: {}
      t.timestamps
    end
  end
end
```

`DesignSystemConfig` model:
- `belongs_to :community`
- `DEFAULT_CONFIG` constant with design-system defaults
- `merged_config` → `DEFAULT_CONFIG.deep_merge(config_json)` — always returns a full config
- `to_theme_config` → formats `merged_config` for SDK consumption (camelCase keys)
- `to_css_vars` → returns a hash of CSS variable name → value

### Step 2 — Routes

```ruby
# config/routes.rb (inside resources :communities)
resource :design_system_config, only: [:show, :update]   # CMS (singular, one per community)
# No API route needed — themeConfig is passed server-side in the SDK controller path
```

### Step 3 — Controller

**`DesignSystemConfigsController`** (CMS only):
- `show` — loads or builds `@config`, renders CMS tab (used by design/index partial)
- `update` — deep-merges submitted params into `config_json`, returns JSON `{ success: true }`

### Step 4 — CMS View (`_custom_design.html.haml`)

Structure mirrors the wireframe:

```
Section: Color System
  Sub-section: PRIMARY COLORS
    - Primary brand color   [swatch] [hex input] [Opacity] [Save]
    - Primary light 10%     ...
    - Primary light 20%     ...
  Sub-section: SECONDARY COLORS
    - Main font color, Subtext, Icon background, Stroke & outlines, Light background
  Sub-section: LABEL COLORS
    - Label yellow, Label orange, Label coral

Section: Font Customization
  - Font family [select — reuses existing font_families helper] [Save]
  - Base font size [select — reuses existing font_sizes array] [Save]
  - Heading font size [select — reuses existing font_sizes array] [Save]

Section: SVG Map Unit Number Font Color
  - Dynamic contrast toggle (on = auto white/dark)
  - Manual override color [swatch] [hex input] [Save] (disabled when dynamic=on)
  - Opacity — Vacant    [0.0–1.0 input] [Save]
  - Opacity — Model     [0.0–1.0 input] [Save]
  - Opacity — Occupied  [0.0–1.0 input] [Save]
```

Each row saves individually via `fetch` PATCH — same fine-grained save pattern used elsewhere in the design tabs.

### Step 5 — SDK Extension (`pyn-map-sdk-v1.js`)

Add to `init()`:

```js
// After existing styles merge
if (cfg.themeConfig) {
  this._applyThemeConfig(cfg.themeConfig);
}
```

New `_applyThemeConfig(themeConfig)` method:
1. Override `styles.unitLabels.fontFamily` / `fontSize` if `themeConfig.fonts` set
2. If `themeConfig.svgUnitNumber.dynamicContrast` → set `this._dynamicContrast = true`
3. If not dynamic → set `styles.unitLabels.fontColor = themeConfig.svgUnitNumber.manualColor`
4. Inject CSS vars into the map container element for any CSS-driven components

Dynamic contrast logic (already partially present in `_applyGlobalLabelStyles`):
- Compute luminance of the unit fill color
- If luminance > 0.5 → label color = `#1F1F1F`; else → `#FFFFFF`

### Step 6 — Helper & Embed Integration

```ruby
# app/helpers/design_system_helper.rb
module DesignSystemHelper
  def design_system_css_vars(community)
    config = community.design_system_config&.merged_config || DesignSystemConfig::DEFAULT_CONFIG
    vars = DesignSystemConfig.new(config_json: config).to_css_vars
    content_tag(:style, vars.map { |k, v| "  #{k}: #{v};" }.join("\n").then { |s| ":root {\n#{s}\n}" }.html_safe)
  end
end
```

**Calculator** — include the helper call in `app/views/layouts/pricing_calculator.html.haml`:
```haml
= design_system_css_vars(@community)
```
The calculator's existing Rails controller already has `@community` in scope — no extra fetch needed.

**New map** — extend the existing SDK controller's inline init to pass `themeConfig`:
```js
PynMapSDK.init({
  ...existingConfig,
  themeConfig: <%= @community.design_system_config&.to_theme_config.to_json.html_safe || '{}' %>
});
```
This is a server-rendered inline value, consistent with how the SDK controller already passes its config.

---

## Non-Goals / Out of Scope

- Migrating existing color fields from `designs` table into the new config (separate ticket)
- Per-user or per-role design overrides
- Real-time preview in the CMS (can be a follow-up)
- Opacity controls per unit state (Vacant, Model, etc.) — listed in ticket description but not shown in wireframe; defer to follow-up

---

## Acceptance Criteria Checklist

- [ ] New Custom Design tab appears in `/communities/:id/design`
- [ ] All 11 color swatches configurable, saved individually, persisted to DB
- [ ] Font family dropdown and size inputs save correctly
- [ ] SVG dynamic contrast toggle: on → auto white/dark on unit labels; off → manual color honored
- [ ] SVG opacity per unit state (Vacant, Model, Occupied) saved and applied via themeConfig
- [ ] CSS vars emitted server-side in pricing calculator layout
- [ ] `themeConfig` passed inline to SDK init via existing SDK controller path
- [ ] `PynMapSDK.init({ themeConfig: ... })` applies font family, font size, and unit label color
- [ ] No regressions on existing Community Map Markers / Marketing / Ops tabs
- [ ] Existing SDK callers using explicit `styles.unitColors` are unaffected

---

## Resolved

- **SDK distribution** — No build step. `public/sdk/pyn-map-sdk-v1.js` is edited in place.
- **Opacity fields** — Included in scope (see SVG section in Step 4).
