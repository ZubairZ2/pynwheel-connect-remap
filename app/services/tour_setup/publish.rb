# frozen_string_literal: true

module TourSetup
  # "Publish to Tour App" (October 25, 2026). Saving in Connect is already
  # live for every reader (the legacy app, the Touch app, the Tour App read the
  # same tables), so publishing does not copy anything: it records that the
  # configuration as it stands now - `TourApi::ConfigVersion` - is the one the
  # property means to be live, by whom and when, writes an audit row, and
  # drops the API's property-list cache so a changed Self-Tour flag shows at
  # once. Idempotent: publishing a configuration that is already the published
  # one changes nothing and says so (`already_published`). Nothing here bumps
  # `tour_setup_version` (a save already moved every version a client checks;
  # bumping again would only throw away the built graph for nothing).
  class Publish
    Result = Struct.new(:tour, :already_published, :state, keyword_init: true)

    def self.call!(community:, user:)
      new(community, user).call!
    end

    # What Connect shows next to the button and what the publish answers.
    def self.state(community)
      tour = community.community_tour
      live = tour.present? && Connect::ProductState.tour?(community)
      current = live ? TourApi::ConfigVersion.for(community) : nil
      publisher = tour&.tour_published_by_id && User.find_by(id: tour.tour_published_by_id)
      {
        tour_enabled: live,
        published_at: tour&.tour_published_at&.iso8601,
        published_by: Connect::ResponseEnvelope.current_user_meta(publisher),
        published_version: tour&.tour_published_version,
        current_version: current,
        ever_published: tour&.tour_published_at.present?,
        changed_since_publish: current.present? && tour.tour_published_version != current
      }
    end

    def initialize(community, user)
      @community = community
      @user = user
    end

    def call!
      tour = @community.community_tour
      raise Connect::DomainError.invalid('tour_disabled', 'This property has no Pynwheel Tour to publish.') unless tour.present? && Connect::ProductState.tour?(@community)

      current = TourApi::ConfigVersion.for(@community)
      return Result.new(tour: tour, already_published: true, state: self.class.state(@community)) if tour.tour_published_version == current

      # `update_all`: the row's `updated_at` must not move, or the version just recorded would no longer be the current one.
      Tour.where(id: tour.id).update_all(tour_published_at: Time.current, tour_published_by_id: @user&.id, tour_published_version: current)
      TourApi::Properties.reset_cache!
      TourApi::Audit.record(@community, 'tour_published', whodunnit: @user&.id, payload: { config_version: current, tour_setup_version: tour.tour_setup_version, previous_version: tour.tour_published_version })
      Result.new(tour: tour.reload, already_published: false, state: self.class.state(@community))
    end
  end
end
