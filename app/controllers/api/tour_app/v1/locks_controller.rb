# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # Smart locks on the tour's stops: a door code for one stop, issued
      # through the property's igloohome account exactly as the legacy
      # Pynwheel Tour app had it (`TourApi::Locks`). Which stop carries which
      # lock is part of the stops list (`lock` on each stop).
      #
      # Since October 23, 2026 the issuance names the visit it is for
      # (`visit_id`): a visitor must have an open visit at the property (their
      # codes are then listed on their Connect profile); staff may pass one
      # or none. A property that requires ID verification issues nothing to a
      # visitor whose verification is not current.
      class LocksController < PropertyController
        def pin
          stop_id = string_param(params[:stop_id], loc: %w[body stop_id], min: 3, max: 64)
          render json: TourApi::Locks.pin!(@property, built, stop_id, visit: visit_for_issue, issued_by: @auth.user)
        end

        # The igloohome v1 Bluetooth guest key for one stop (the app's native
        # igloohome SDK opens the lock with it).
        def bluetooth_key
          stop_id = string_param(params[:stop_id], loc: %w[body stop_id], min: 3, max: 64)
          render json: TourApi::Locks.bluetooth_key!(@property, built, stop_id, visit: visit_for_issue, issued_by: @auth.user)
        end

        private

          def visit_for_issue
            id = integer_param(params[:visit_id], loc: %w[body visit_id])
            if @auth.visitor?
              raise TourApi::ApiError.unprocessable('visit_required', 'Check in to your tour before opening a door.') if id.nil?

              visit = TourHistory.find_by(id: id, community_id: @property.id, tour_user_id: @auth.visitor.id)
              raise TourApi::ApiError.not_found('No such visit at this property.') if visit.nil?
              raise TourApi::ApiError.unprocessable('visit_ended', 'This visit has ended.') if visit.left.present?
              if ::Visits::Rules.verification_required?(@property, @auth.visitor, ::Visits::Rules.now(@property))
                raise TourApi::ApiError.unprocessable('verification_required', 'This property asks for ID verification before a door can be opened.')
              end

              visit
            else
              id && TourHistory.find_by(id: id, community_id: @property.id)
            end
          end
      end
    end
  end
end
