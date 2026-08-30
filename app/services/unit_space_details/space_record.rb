module UnitSpaceDetails
  # The contract between an adapter and the collector: one leasable space, in
  # provider-neutral vocabulary.
  #
  # Every field is optional except provider_space_id. A provider that gives
  # amenities but no lease terms, or terms but no letter, still produces valid
  # records -- the collector merges whatever arrives and the serializer omits
  # what is missing. That is what lets a second provider land partially rather
  # than all-or-nothing.
  SpaceRecord = Struct.new(
    :provider_space_id, # the PMS's id for this space -- the merge key
    :provider_unit_id,  # how to find our Unit row (matches units.provider_unit_id)
    :space_letter,      # "A", or nil
    :space_option,      # occupancy / configuration label, or nil
    :amenities,         # [String] raw descriptions, un-normalised
    :lease_terms,       # [{rent:, start_date:, end_date:, raw_term:, space_option:}]
    :metadata,          # provider-specific extras
    keyword_init: true
  ) do
    def initialize(**args)
      super
      self.amenities   ||= []
      self.lease_terms ||= []
      self.metadata    ||= {}
    end

    # Later feeds fill gaps left by earlier ones; they never overwrite a value
    # that is already there. The catalog feed and the pricing feed each know
    # some fields authoritatively and guess at none, so first-writer-wins is
    # both correct and order-independent.
    def merge(other)
      self.class.new(
        provider_space_id: provider_space_id || other.provider_space_id,
        provider_unit_id:  provider_unit_id.presence  || other.provider_unit_id,
        space_letter:      space_letter.presence      || other.space_letter,
        space_option:      space_option.presence      || other.space_option,
        amenities:         amenities.presence         || other.amenities,
        lease_terms:       lease_terms.presence       || other.lease_terms,
        metadata:          other.metadata.merge(metadata)
      )
    end

    # A row earns its place in the table by carrying something the pop-up could
    # use. Everything else is dropped, so a conventional property -- one space
    # per unit, no letters, no per-space amenities -- stores nothing at all.
    def any_content?
      amenities.present? || space_letter.present? || lease_terms.present?
    end
  end
end
