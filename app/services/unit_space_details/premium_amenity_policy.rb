module UnitSpaceDetails
  # Which of a space's amenities actually distinguish it from the others.
  #
  # The rule is a frequency baseline, recomputed per property on every pull and
  # never hardcoded: count how many spaces each distinct description appears on,
  # and exclude everything present on 100% of them. What remains is what makes
  # one bedroom worth more than the one next door.
  #
  # This is what removes a property's repeating marketing copy -- "Premium Quartz
  # Kitchen Countertops", "*Patios/Balconies in Select Units" -- without anyone
  # maintaining a list of it. Measured on community 34: 25 distinct descriptions,
  # 22 at 100%, leaving En-Suite Bathroom / Corner Unit / Closet.
  class PremiumAmenityPolicy
    def initialize(records)
      # Only spaces the feed actually gave amenities for. A space with no amenity
      # block is missing data, not a space lacking every amenity; counting it
      # would put the baseline below 100% for everything and crown every space.
      @sampled  = records.select { |r| r.amenities.present? }
      @baseline = compute_baseline
    end

    # The descriptions present on every sampled space, normalised. Exposed for
    # the audit task -- this is the number a human checks before the toggle.
    attr_reader :baseline

    def premium_for(record)
      record.amenities
            .map { |d| self.class.normalize(d) }
            .reject(&:blank?)
            .uniq
            .reject { |d| @baseline.include?(d.downcase) }
    end

    def frequencies
      @frequencies ||= begin
        counts = Hash.new(0)
        @sampled.each do |record|
          record.amenities.map { |d| self.class.normalize(d).downcase }
                .reject(&:blank?).uniq
                .each { |d| counts[d] += 1 }
        end
        counts
      end
    end

    def sample_size = @sampled.size

    # Collapse the whitespace a feed varies freely, but keep the original
    # spelling for display. Without this "Closet" and "Closet " count as two
    # descriptions, neither reaches 100%, and both become false premiums on
    # every space -- a failure mode that looks like a working feature.
    def self.normalize(description)
      description.to_s.strip.gsub(/\s+/, " ")
    end

    private

    def compute_baseline
      return Set.new if @sampled.empty?

      # With a single sampled space every description is trivially at 100% and
      # the baseline swallows everything, leaving no premiums. That is the right
      # answer -- one sample cannot tell you what is distinctive -- and it falls
      # out of the arithmetic rather than needing a special case.
      frequencies.select { |_, count| count == @sampled.size }.keys.to_set
    end
  end
end
