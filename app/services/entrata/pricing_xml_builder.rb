module Entrata
  # Turns one getUnitsAvailabilityAndPricing payload into the XML rendered by the
  # "Test Pricing" and "Test Space Configuration" buttons on the settings page.
  #
  # This used to live twice — copy-pasted into PsiPricingConnectionService and
  # PsiSpaceConfigurationConnectionService — and both copies built their output
  # with `xml = xml + "..."` inside a units x spaces x lease-terms loop. `+`
  # allocates a fresh copy of everything accumulated so far, so the cost grew
  # with the square of the payload: a student-housing property with a few
  # thousand lease terms spent most of the request re-copying megabytes of
  # string and feeding the GC. Appending into one buffer with `<<` makes the
  # same work linear, which is where most of the old page's CPU time went.
  #
  # The two callers differ only in a handful of extra elements, so they share
  # this class and flip `space_configuration`.
  class PricingXmlBuilder
    NO_RECORDS_XML =
      "<response><code>200</code><result>No records found with mentioned preferences.</result></response>".freeze

    def initialize(hash, show_unit_spaces:, space_configuration: false)
      @hash = hash
      @show_unit_spaces = show_unit_spaces
      @space_configuration = space_configuration
    end

    def build
      result = @hash.dig("response", "result")
      return NO_RECORDS_XML if no_records?(result)

      xml = +"<Properties>"
      append_floorplans(xml, result)
      append_units(xml, result)
      xml << "</Properties>"
    end

    private

    # Entrata answers an empty query with the bare string "No records found",
    # but a populated one with a Hash — and Hash#include? looks at keys, so the
    # same call is safe for both.
    def no_records?(result)
      return true if result.blank?

      result.include?("No records found")
    end

    def append_floorplans(xml, result)
      xml << "<Floorplans>"

      floorplans = records(result.dig("Properties", "Property", 0, "Floorplans", "Floorplan"))
      floorplans.each do |floor|
        rooms = records(floor["Room"])

        xml << "<floorplan>"
        tag(xml, "IDValue", floor.dig("Identification", "IDValue"))
        tag(xml, "Name", floor["Name"])
        tag(xml, "UnitCount", floor["UnitCount"])
        tag(xml, "UnitAvailable", floor["UnitsAvailable"])
        tag(xml, "DisplayedUnitsAvailable", floor["DisplayedUnitsAvailable"])
        tag(xml, "bedroom", rooms.dig(0, "Count"))
        tag(xml, "bathroom", rooms.dig(1, "Count"))
        tag(xml, "SquareFeet", floor.dig("SquareFeet", "@attributes", "Min"))
        tag(xml, "MarketRent", floor.dig("MarketRent", "@attributes", "Min"))
        xml << "</floorplan>"
      end

      xml << "</Floorplans>"
    end

    def append_units(xml, result)
      xml << "<Units>"

      if unit_spaces_enabled?
        records(result.dig("PropertyUnits", "PropertyUnit")).each do |unit|
          append_unit(xml, unit) { records(unit["UnitSpace"]).each { |space| append_space(xml, space) } }
        end
      else
        # With spaces switched off Entrata collapses the unit and its single
        # space into the same node, so the ILS unit is its own space.
        records(result.dig("ILS_Units", "Unit")).each do |unit|
          append_unit(xml, unit) { append_space(xml, unit) }
        end
      end

      xml << "</Units>"
    end

    def append_unit(xml, unit)
      attrs = unit["@attributes"] || {}

      xml << "<Unit>"
      tag(xml, "Id", attrs["Id"])
      tag(xml, "UnitNumber", attrs["UnitNumber"])
      tag(xml, "FloorplanId", attrs["FloorplanId"])
      tag(xml, "UnitTypeId", attrs["UnitTypeId"])
      tag(xml, "PropertyId", attrs["PropertyId"])
      tag(xml, "FloorPlanName", attrs["FloorPlanName"])
      tag(xml, "FloorId", attrs["FloorId"])
      yield
      xml << "</Unit>"
    end

    def append_space(xml, space)
      attrs = space["@attributes"] || {}

      xml << "<UnitSpace>"
      tag(xml, "Id", attrs["Id"])
      tag(xml, "UnitNumber", attrs["UnitNumber"])
      tag(xml, "Availability", attrs["Availability"])
      tag(xml, "Status", attrs["Status"])
      tag(xml, "SpaceConfiguration", attrs["SpaceConfiguration"]) if @space_configuration

      xml << "<TermRent>"
      records(space.dig("Rent", "TermRent")).each { |term| append_term(xml, term) }
      xml << "</TermRent>"

      tag(xml, "Rent", space.dig("Rent", "@attributes", "MinRent"))
      xml << "</UnitSpace>"
    end

    def append_term(xml, term)
      attrs = term["@attributes"] || {}

      tag(xml, "LeaseTerm", attrs["LeaseTerm"])
      tag(xml, "Rent", attrs["Rent"])
      return unless @space_configuration

      tag(xml, "SpaceOption", attrs["SpaceOption"])
      tag(xml, "StartDate", attrs["StartDate"])
      tag(xml, "EndDate", attrs["EndDate"])
    end

    def unit_spaces_enabled?
      ActiveRecord::Type::Boolean.new.cast(@show_unit_spaces)
    end

    # Entrata is inconsistent about whether a repeated node arrives as an array
    # or as a Hash keyed by id, and the old builders only handled one shape each
    # (reaching into `pair[1]`), which turned the other shape into a silent
    # `false` and the misleading "enter correct credentials" flash.
    def records(node)
      case node
      when Array then node
      when Hash  then node.values
      else []
      end
    end

    # Unescaped values were being interpolated straight into the document, so a
    # single "&" in a unit number or floor plan name produced XML the browser
    # refused to render.
    def tag(xml, name, value)
      xml << "<" << name << ">" << CGI.escapeHTML(value.to_s) << "</" << name << ">"
    end
  end
end
