# frozen_string_literal: true

module Visitors
  # The visitor privacy actions of the legacy Visitors page
  # (TourUsersController#destroy): removing personal data field by field
  # ("Removed at Consumer Request"), hiding the tour history, resetting the
  # ID verification, and deleting the visitor's data at the property. Moved
  # here verbatim (October 2026) so the legacy page and Connect run the same
  # statements; the controller delegates to these.
  module Privacy
    REMOVED = 'Removed at Consumer Request'
    FIELDS = %w[name email phone image history].freeze

    module_function

    # `fields`: any of name, email, phone, image, history (true to remove).
    def remove!(community, tour_user, fields)
      fields = fields.to_h.with_indifferent_access
      changed = []
      if fields[:email]
        tour_user.email = REMOVED
        tour_user.save!(validate: false)
        changed << 'email'
      end

      if fields[:name]
        tour_user.name = REMOVED
        tour_user.first_name = REMOVED
        tour_user.last_name = ''
        tour_user.save!(validate: false)
        changed << 'name'
      end

      if fields[:phone] || fields[:phone_number]
        tour_user.phone_number = REMOVED
        tour_user.save!(validate: false)
        changed << 'phone'
      end

      if fields[:image]
        tour_user.remove_image!
        tour_user.remove_id_card!
        tour_user.id_card = File.open('app/assets/images/default id card.jpg')
        tour_user.image = File.open('app/assets/images/default-user128x128.jpg')
        tour_user.save!(validate: false)
        changed << 'image'
      end

      if fields[:history]
        hide_history!(community, tour_user)
        changed << 'history'
      end
      # A visitor whose contact details were removed cannot keep a Tour App session (October 23, 2026).
      Visitors::Session.revoke_all!(tour_user) if changed.intersect?(%w[email name phone])
      changed
    end

    def remove_all!(community, tour_user)
      tour_user.email = REMOVED
      tour_user.first_name = REMOVED
      tour_user.last_name = ''
      tour_user.name = ''
      tour_user.phone_number = REMOVED

      if tour_user.image.present?
        tour_user.remove_image!
        tour_user.image = File.open('app/assets/images/default-user128x128.jpg')
      end

      if tour_user.id_card.present?
        tour_user.remove_id_card!
        tour_user.id_card = File.open('app/assets/images/default id card.jpg')
      end

      tour_user.save!(validate: false)
      hide_history!(community, tour_user)
    end

    # The legacy statement hid the visits on the visitor's customised tour
    # copies only (CustomizeTourService#get_community_tours_ids with a
    # visitor); the property's main tour, where every visit of a visitor
    # without a customised route lives, is included here so "hide the tour
    # history" hides it.
    def hide_history!(community, tour_user)
      tour_ids = CustomizeTourService.new(community, tour_user).get_community_tours_ids + [community.community_tour&.id].compact
      tour_histories = TourHistory.where(tour_user_id: tour_user.id).where(tour_id: tour_ids).or(TourHistory.where(tour_user_id: tour_user.id, community_id: community.id)) rescue nil
      return unless tour_histories.present?

      tour_histories.each do |tour_history|
        tour_history.history = true
        tour_history.save!
      end
    end

    # The "Reset verification" of the Visitors page, for the property's verification type.
    def reset_verification!(community, tour_user)
      type = community.community_tour&.verification_type
      tour_user.update(authentiq_verified_at: nil, is_authentiq_verified: false) if type == 'authenteq'
      tour_user.update(checkpoint_verified_at: nil, is_checkpoint_verified: false) if type == 'check_point_id'
      type
    end

    # "Delete visitor": the visitor's tour data at this property (TourUsersController#destroy, default branch).
    def delete_visit_data!(community, tour_user)
      tour = community.community_tour
      tour_ids = CustomizeTourService.new(community, tour_user).get_community_tours_ids
      record_ids = [tour_ids, tour&.id].flatten.compact
      tour_histories = TourHistory.where(tour_user_id: tour_user.id, tour_id: record_ids).includes(:lock_histories)
      lock_histories_ids = tour_histories.all.map { |x| x.lock_histories.ids }.flatten
      LockHistory.where(id: lock_histories_ids).delete_all

      if tour && tour_user.chatrooms.find_by(tour_id: tour.id).present?
        tour_user.chatrooms.find_by(tour_id: tour.id).chats.delete_all
        tour_user.chatrooms.find_by(tour_id: tour.id).delete
      end

      tour_user.as_guests.find_by(community_id: community.id).delete if tour_user.as_guests.find_by(community_id: community.id).present?
      tour_user.igloo_guests.where(community_id: community.id).delete_all if tour_user.igloo_guests.find_by(community_id: community.id).present?
      tour_user.tour_histories.where(tour_id: record_ids).delete_all
      tour_user.visited_stops.where(tour_id: record_ids).delete_all
      tour_user.schedual_tours.where(community_id: community.id).delete_all
      tour_user.prospects.where(community_id: community.id).delete_all
      # The Tour App's rows of this property (October 23, 2026): the visit
      # histories above took their stop and door events through `tour_id`;
      # sessions are not per property, so they stay.
      true
    end
  end
end
