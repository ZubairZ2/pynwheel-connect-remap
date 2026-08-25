module UnitSpaceDetails
  # Which of a space's lease terms the pop-up shows.
  #
  # The feed can carry several; the panel shows one price and one date range.
  # The order below mirrors what PsiService already does for unit-type pricing
  # (next_year_pricing_available? then current_year_pricing_available?), so
  # student housing does not invent a third convention for "which year are we
  # selling".
  #
  # The term's *label* is never consulted. Entrata labels community 34's leases
  # "4 Months" while they run 08/14/2027 -> 07/28/2028 -- 11.5 months. Duration,
  # where it is needed at all, is end_date - start_date.
  class LeaseTermPolicy
    def initialize(community, today: Date.current)
      # Whether the property advertises next year's pricing at all. Reusing the
      # existing flag rather than always preferring the future term, so a
      # property that has chosen not to show next year does not have it leak out
      # through this pop-up.
      @show_future = community.turn_availability_on
      @today = today
    end

    # Returns the chosen term hash, or nil when none of them is usable.
    def choose(lease_terms)
      dated = Array(lease_terms).select { |t| t[:start_date] && t[:end_date] }
      return nil if dated.empty?

      future  = dated.select { |t| t[:start_date] > @today }
      current = dated.select { |t| t[:start_date] <= @today && t[:end_date] >= @today }

      candidates =
        (@show_future ? best_by(future) { |t| t[:start_date] } : nil) ||
        best_by(current) { |t| -t[:end_date].to_time.to_i } ||
        best_by(dated)   { |t| -t[:start_date].to_time.to_i }

      candidates
    end

    private

    # Earliest by the caller's ordering, then cheapest, then longest. Ties are
    # broken deterministically so the same feed always yields the same term --
    # the pop-up's price must not depend on hash ordering.
    def best_by(terms)
      return nil if terms.blank?

      terms.min_by do |t|
        [yield(t), t[:rent] || Float::INFINITY, -(t[:end_date] - t[:start_date]).to_i]
      end
    end
  end
end
