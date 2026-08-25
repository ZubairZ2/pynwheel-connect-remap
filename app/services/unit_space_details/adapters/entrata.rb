module UnitSpaceDetails
  module Adapters
    # Reads Entrata's two feeds into SpaceRecords. The only file in this
    # namespace that knows a JSON path; everything above it is provider-neutral.
    #
    #   :catalog -> getMitsPropertyUnits    -- identity, letter, amenities
    #   :pricing -> getUnitsAvailabilityAndPricing (useSpaceConfiguration)
    #               -- lease terms, rents, dates
    #
    # Both are already pulled on every sync, so this adds no request.
    class Entrata
      # OrganizationName is "{propertyId}~..~{unitId}~..~{letter}", e.g.
      # "100152889~..~4455543~..~a". Note the separator is the three-character
      # "~..~", not "~".
      ORG_SEPARATOR = "~..~".freeze

      def initialize(community, credentials = nil)
        @community   = community
        @credentials = credentials
      end

      def extract(payload, feed:)
        case feed
        when :catalog then catalog_records(payload)
        when :pricing then pricing_records(payload)
        else []
        end
      end

      private

      # --- catalog -------------------------------------------------------

      def catalog_records(payload)
        properties(payload).flat_map { |p| Array(p["ILS_Unit"]) }.filter_map do |ils|
          space_id = ils.dig("Identification", "IDValue").presence or next
          unit_id  = ils.dig("Units", "Unit", "Identification", "IDValue")

          SpaceRecord.new(
            provider_space_id: space_id.to_s,
            # The same key save_psi_units writes: "{unitId}-{spaceId}".
            provider_unit_id: "#{unit_id}-#{space_id}",
            space_letter: letter_from(ils),
            amenities: amenities_from(ils),
            metadata: { "vacancy_class" => ils.dig("Availability", "VacancyClass"),
                        "floorplan_id"  => ils.dig("Units", "Unit", "@attributes", "FloorPlanId")&.to_s }.compact
          )
        end
      end

      def properties(payload)
        Array(payload&.dig("response", "result", "PhysicalProperty", "Property"))
      end

      # Amenities sit at the ILS_Unit top level -- verified on community 34,
      # where all 671 spaces carry an array of
      # {"@attributes" => {"AmenityType" => "Other"}, "Description" => "..."}.
      #
      # AmenityType is "Other" on every one of them, so it is not a usable
      # signal; what distinguishes a space is which descriptions it has, which
      # PremiumAmenityPolicy works out by frequency.
      #
      # The nested read is a fallback: Entrata's MITS serialisation has moved
      # Amenity between these two places across versions, and guessing wrong
      # fails silently as "no premium features anywhere".
      def amenities_from(ils)
        raw = Array(ils["Amenity"]).presence || Array(ils.dig("Units", "Unit", "Amenity"))
        raw.filter_map { |a| a.is_a?(Hash) ? a["Description"].presence : a.presence }.uniq
      end

      # The space's letter. OrganizationName's third segment is authoritative and
      # lowercase; the MarketingName suffix is the fallback, and goes through
      # SdkUnitSpaceGrouper so this cannot drift from the rule that derives a
      # door's name by stripping the same suffix.
      #
      # All three sources agree on all 671 spaces of community 34.
      def letter_from(ils)
        segments = ils.dig("Identification", "OrganizationName").to_s.split(ORG_SEPARATOR)
        from_org = segments[2].to_s.strip
        return from_org.upcase if from_org.match?(/\A[A-Za-z]{1,2}\z/)

        SdkUnitSpaceGrouper.space_letter(ils.dig("Units", "Unit", "MarketingName"))
      end

      # --- pricing -------------------------------------------------------

      def pricing_records(payload)
        Array(payload&.dig("response", "result", "PropertyUnits", "PropertyUnit")).flat_map do |property_unit|
          unit_id = property_unit.dig("@attributes", "Id")

          unit_spaces(property_unit).filter_map do |space|
            attrs    = space["@attributes"] or next
            space_id = attrs["Id"].presence or next
            terms    = term_rents(space)

            SpaceRecord.new(
              provider_space_id: space_id.to_s,
              provider_unit_id: "#{unit_id}-#{space_id}",
              # Feed B names the letter directly, already uppercase.
              space_letter: attrs["UnitNumber"].to_s.strip.presence&.upcase,
              space_option: terms.first&.dig(:space_option) || attrs["SpaceConfiguration"].presence,
              lease_terms: terms,
              metadata: { "availability" => attrs["Availability"],
                          "occupancy_type" => attrs["OccupancyType"] }.compact
            )
          end
        end
      end

      # UnitSpace comes back as a Hash keyed by index, not an Array -- on
      # community 34 that is true of all 276 PropertyUnits. This is why the
      # legacy pricing code reads `us[1]`: it is destructuring a [key, value]
      # pair. Normalise here instead of spreading that idiom further.
      def unit_spaces(property_unit)
        spaces = property_unit["UnitSpace"]
        spaces.is_a?(Hash) ? spaces.values : Array(spaces)
      end

      def term_rents(space)
        Array(space.dig("Rent", "TermRent")).filter_map do |term|
          attrs = term["@attributes"] or next

          {
            rent: parse_rent(attrs["Rent"]),
            start_date: parse_date(attrs["StartDate"]),
            end_date: parse_date(attrs["EndDate"]),
            # Kept for auditing only. LeaseTermPolicy never reads it: Entrata
            # labels community 34's 11.5-month leases "4 Months".
            raw_term: attrs["LeaseTerm"].presence,
            space_option: attrs["SpaceOption"].presence
          }
        end
      end

      def parse_rent(value)
        return nil if value.blank?

        BigDecimal(value.to_s.gsub(/[^\d.]/, ""))
      rescue ArgumentError
        nil
      end

      def parse_date(value)
        return nil if value.blank?

        Date.strptime(value.to_s, "%m/%d/%Y")
      rescue ArgumentError, TypeError
        nil
      end
    end
  end
end
