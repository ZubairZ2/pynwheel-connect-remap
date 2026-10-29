# frozen_string_literal: true

module Api
  module TourApp
    module V1
      # The visitor's ID verification and card on file at one property
      # (October 28, 2026):
      #   GET  /properties/:id/verification       what the server requires and knows (Verification::Status)
      #   POST /properties/:id/verification       one CheckpointID attempt: the pictures in, the outcome out (Verification::Attempt)
      #   POST /properties/:id/verification/card  a Stripe.js card token → the card on file (Verification::Card)
      # The server decides: the visitor's row is written here from the
      # provider's answer, never from the app's word, and the check-in and
      # the doors read the same row. A visitor reads and verifies only
      # themself; staff may read a visitor of the property (`tour_user_id`).
      class VerificationController < PropertyController
        def show
          visitor = @auth.visitor? ? @auth.visitor : staff_visitor!
          render json: { success: true, verification: Verification::Status.for(@property, visitor) }
        end

        def create
          require_visitor!
          attrs = params.permit(:document_type, :front_image, :back_image, :selfie_image).to_h
          result = Verification::Attempt.call!(@property, @auth.visitor, attrs)
          render json: { success: true, result: { outcome: result.outcome, reason: result.reason, code: result.code }.compact,
                         verification: Verification::Status.for(@property, @auth.visitor.reload) }
        end

        def card
          require_visitor!
          token = string_param(params[:card_token], loc: %w[body card_token], min: 1, max: 128)
          last4 = Verification::Card.save!(@property, @auth.visitor, token)
          render json: { success: true, card: { saved: true, last4: last4 }, verification: Verification::Status.for(@property, @auth.visitor.reload) }
        end

        private

          # Staff mode: a visitor of this property (a booking or a visit here), as the visits endpoints scope it.
          def staff_visitor!
            id = integer_param(params[:tour_user_id], loc: %w[query tour_user_id])
            raise TourApi::ApiError.validation([{ loc: %w[query tour_user_id], message: 'Field required' }]) if id.nil?

            visitor = TourUser.find_by(id: id)
            known = visitor && (@property.schedual_tours.where(tour_user_id: visitor.id).exists? || TourHistory.where(tour_user_id: visitor.id, community_id: @property.id).exists?)
            raise TourApi::ApiError.not_found('No such visitor at this property.') unless known

            visitor
          end
      end
    end
  end
end
