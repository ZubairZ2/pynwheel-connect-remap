module UnitsHelper
  # Label used in the mass override floor plan picker, e.g.
  # "The Aspen — 2 Bed, 2.5 Bath, 1,050 Sq Ft". Floor plans are free to leave
  # any of the three details blank, so only the ones that are filled in show up.
  def mass_override_floorplan_label(floorplan)
    specs = floorplan_specs(floorplan)
    name = floorplan.name.presence || "Unnamed Floor Plan"
    specs.present? ? "#{name} — #{specs}" : name
  end

  # Compact form for native <select> options, e.g. "The Aspen · 2bd/2.5ba · 1,050sf".
  # The long label is fine in a list the browser renders itself, but in a dropdown
  # of 40+ options it makes the popup as wide as the screen.
  def floorplan_option_label(floorplan)
    bits = []
    beds = floorplan.bedrooms.present? ? (floorplan.bedrooms.to_i.positive? ? "#{floorplan.bedrooms.to_i}bd" : "studio") : nil
    baths = ("#{floorplan_bathrooms_label(floorplan.bathrooms)}ba" if floorplan.bathrooms.to_f.positive?)
    bits << [beds, baths].compact.join("/") if beds || baths
    bits << "#{number_with_delimiter(floorplan.square_feet.to_i)}sf" if floorplan.square_feet.to_i.positive?

    name = floorplan.name.presence || "Unnamed Floor Plan"
    bits.any? ? "#{name} · #{bits.join(' · ')}" : name
  end

  # The bed/bath/sqft line shown under a floor plan name. A unit's own square
  # footage wins over the floor plan's when it has one, matching what the app
  # displays and what the sqft filter sorts on.
  def floorplan_specs(floorplan, unit_square_feet: nil)
    return "" if floorplan.blank?

    sqft = unit_square_feet.to_i.positive? ? unit_square_feet.to_i : floorplan.square_feet.to_i

    [
      floorplan_bedrooms_label(floorplan.bedrooms),
      ("#{floorplan_bathrooms_label(floorplan.bathrooms)} Bath" if floorplan.bathrooms.to_f.positive?),
      ("#{number_with_delimiter(sqft)} Sq Ft" if sqft.positive?)
    ].compact.join(", ")
  end

  # An explicit zero means a studio; a blank value means nobody filled it in.
  def floorplan_bedrooms_label(bedrooms)
    return if bedrooms.blank?

    bedrooms.to_i.positive? ? "#{bedrooms.to_i} Bed" : "Studio"
  end

  # 2.0 reads better as "2", 1.5 has to stay "1.5".
  def floorplan_bathrooms_label(bathrooms)
    (bathrooms.to_f % 1).zero? ? bathrooms.to_i : bathrooms.to_f
  end

  # One labelled control on the unit form. Wrapping them keeps 25-odd fields
  # visually identical and puts the "manual override required" rule in one
  # place - it used to be repeated as loose text under every gated field.
  def unit_field(label, gated: false, hint: nil, span: nil, &block)
    render "units/field", label: label, gated: gated, hint: hint, span: span, control: capture(&block)
  end

  # The lock provider actually in force for a unit: the door's if it has one,
  # otherwise the unit's own column - the same precedence the lock partial and
  # the lock filter use.
  def unit_lock_provider(unit)
    unit.door&.lock_provider.presence || unit.lock_provider.presence
  end

  # Zerv is sold as "Pynwheel Access", matching Community#lock_options.
  def lock_provider_label(provider)
    provider.to_s == "Zerv" ? "Pynwheel Access" : provider.to_s
  end

  # Attributes for a grid cell whose value carries a per-field "set by hand"
  # marker. Deliberately keyed off the field's own flag and not the unit-level
  # Manual Override: the provider sync services skip these columns on the flag
  # alone, so a field stays pinned - and red - with override switched off.
  def feed_pinned_attrs(flag, label)
    return {} unless flag

    {
      class: "edited",
      title: "#{label} was set by hand, so the data feed will not update it. " \
             "Clear it with Mass overrides → Field overrides."
    }
  end

  # Link back to the units grid with the current filters preserved and only the
  # given keys changed - what every sort header, pager link and rows-per-page
  # control needs so it can't drop the filter set out from under the user.
  def units_page_path(overrides = {})
    query = @filter.to_query_params.merge(page: params[:page]).merge(overrides)
    community_units_path(@community, query.compact_blank)
  end

  # Options for one of the toolbar's selects, marking the active choice.
  def unit_filter_select(name, choices, placeholder)
    select_tag name,
               options_for_select(choices, params[name].to_s),
               include_blank: placeholder,
               class: "f-select",
               id: "filter-#{name}"
  end
end
