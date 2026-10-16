# frozen_string_literal: true

module Connect
  # The Tour Setup "Visitors" tab: bookings and visits of the property's
  # visitors, a visitor's profile, the CSV, and the booking and privacy
  # actions, each through the legacy rule it replaces (Visitors::Query,
  # Visitors::Profile, Visitors::Export, Bookings::Create / Reschedule,
  # SchedualTour#destroy, Visitors::Privacy, Visitors::IdReview).
  #
  #   GET    /communities/:community_id/connect/visitors.json?status=&type=&range=&q=&page=&per=
  #   GET    /communities/:community_id/connect/visitors/export.json (text/csv)
  #   GET    /communities/:community_id/connect/visitors/:id.json
  #   POST   /communities/:community_id/connect/visitors/bookings.json
  #   PUT    /communities/:community_id/connect/visitors/bookings/:id/reschedule.json
  #   DELETE /communities/:community_id/connect/visitors/bookings/:id.json
  #   POST   /communities/:community_id/connect/visitors/:id/reset_stops.json
  #   PUT    /communities/:community_id/connect/visitors/:id/id_review.json        {mismatch}
  #   PUT    /communities/:community_id/connect/visitors/:id/reset_verification.json
  #   PUT    /communities/:community_id/connect/visitors/:id/remove_pii.json       {fields: [...]}  (super admin)
  #   DELETE /communities/:community_id/connect/visitors/:id.json                   (super admin)
  class VisitorsController < BaseController
    CONNECT_READ_ACTIONS = %w[index show export].freeze
    CONNECT_WRITE_ACTIONS = %w[create reschedule cancel reset_stops id_review reset_verification remove_pii destroy].freeze

    before_action :require_super_admin!, only: %w[remove_pii destroy]

    def index
      render_connect(Visitors::Query.new(@community, filters).as_json)
    end

    def show
      render_connect(Visitors::Profile.new(@community, visitor!, base_url: request.base_url).as_json)
    end

    def export
      csv = Visitors::Export.csv(@community, filters)
      send_data csv, type: 'text/csv; charset=utf-8', filename: "#{@community.name.to_s.parameterize.presence || 'property'}-visitors-#{Time.now.strftime('%Y%m%d')}.csv"
    end

    def create
      result = Bookings::Create.call!(@community, booking_params, user: current_user, request_ip: request.remote_ip)
      render_write(booking: profile_for(result.visitor), rescheduled: result.rescheduled, notifications: result.notifications, booking_id: result.booking.id)
    end

    def reschedule
      booking = booking!
      result = Bookings::Reschedule.call!(@community, booking, params.permit(:tour_date, :tour_time).to_h, user: current_user)
      render_write(booking: profile_for(booking.tour_user), notifications: result[:notifications], booking_id: booking.id)
    end

    # Cancelling is what the legacy page does: the row is destroyed, its
    # callbacks cancel the CRM appointment and mail the property, and
    # PaperTrail keeps the version the Cancelled tab reads.
    def cancel
      booking = booking!
      visitor = booking.tour_user
      booking.destroy!
      audit('booking_cancelled', booking_id: booking.id, tour_user_id: visitor&.id)
      render_write(booking: visitor ? profile_for(visitor) : nil, cancelled: booking.id)
    end

    def reset_stops
      visitor = visitor!
      CustomizeTourService.new(@community, visitor).reset_user_tour_stops
      @community.schedual_tours.where(tour_user_id: visitor.id).update_all(stops_list: [])
      audit('visitor_reset_stops', tour_user_id: visitor.id)
      render_write(profile: profile_for(visitor))
    end

    def id_review
      visitor = visitor!
      url = "#{Rails.application.routes.url_helpers.manual_selfie_match_path(visitor.id)}?community=#{@community.id}"
      message = Visitors::IdReview.flag!(community: @community, tour_user: visitor, mismatch: boolean(params[:mismatch]),
                                         review_url: "#{request.base_url}#{url}", local_testing: Rails.env.test?)
      audit('visitor_id_review', tour_user_id: visitor.id, mismatch: boolean(params[:mismatch]))
      render_write(profile: profile_for(visitor), message: message)
    end

    def reset_verification
      visitor = visitor!
      type = Visitors::Privacy.reset_verification!(@community, visitor)
      audit('visitor_reset_verification', tour_user_id: visitor.id, verification_type: type)
      render_write(profile: profile_for(visitor.reload))
    end

    def remove_pii
      visitor = visitor!
      fields = Array(params[:fields]).map(&:to_s) & Visitors::Privacy::FIELDS
      raise Connect::DomainError.invalid('no_fields', 'Pick at least one field.') if fields.empty?

      changed = Visitors::Privacy.remove!(@community, visitor, fields.index_with { true })
      audit('visitor_remove_pii', tour_user_id: visitor.id, fields: changed)
      render_write(profile: profile_for(visitor.reload), removed: changed)
    end

    def destroy
      visitor = visitor!
      Visitors::Privacy.delete_visit_data!(@community, visitor)
      audit('visitor_delete', tour_user_id: visitor.id)
      render_write(deleted: visitor.id)
    end

    private

      def filters
        params.permit(:status, :type, :range, :q, :page, :per).to_h
      end

      def booking_params
        params.permit(:first_name, :last_name, :email, :phone_number, :country_code, :tour_type, :property_tour_type, :tour_date, :tour_time,
                      :desired_bedroom, :desired_move_in_date, :is_sms_enabled, :marketing_source).to_h
      end

      # A visitor of this property: one with a booking or a visit here.
      def visitor!
        visitor = TourUser.find_by(id: params[:id])
        raise Connect::DomainError.not_found('No such visitor at this property.') unless visitor && visitor_of_property?(visitor)

        visitor
      end

      def visitor_of_property?(visitor)
        return true if @community.schedual_tours.where(tour_user_id: visitor.id).exists?
        return true if Visitors::Cancelled.for(@community).any? { |booking| booking.tour_user_id == visitor.id }

        TourHistory.where(tour_user_id: visitor.id).where(tour_id: Tour.where(community_id: @community.id).select(:id)).or(TourHistory.where(tour_user_id: visitor.id, community_id: @community.id)).exists?
      end

      def booking!
        @community.schedual_tours.where.not(tour_user_id: nil).find_by(id: params[:id]) || raise(Connect::DomainError.not_found('No such booking at this property.'))
      end

      def profile_for(visitor)
        Visitors::Profile.new(@community, visitor, base_url: request.base_url).as_json
      end

      def render_write(data)
        render json: Connect::ResponseEnvelope.new(data: data, meta: connect_write_meta).as_json
      end

      def audit(event, payload = {})
        PaperTrail::Version.create!(
          item_type: 'Community', item_id: @community.id, event: event, whodunnit: current_user&.id&.to_s,
          community_id: @community.id, company_id: @community.company_id, object: payload.to_json
        )
      rescue StandardError => e
        Rails.logger.warn("[Connect::VisitorsController] audit row not written: #{e.class}: #{e.message}")
      end
  end
end
