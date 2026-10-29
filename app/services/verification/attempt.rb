# frozen_string_literal: true

module Verification
  # One ID verification attempt of a signed-in visitor at a property
  # (October 28, 2026): the pictures go to CheckpointID from here, the
  # provider's answer is read here, and the visitor's row is written here —
  # `is_checkpoint_verified` / `checkpoint_verified_at` / `verified_by`, the
  # columns the legacy `initialize_tour` wrote on the app's word, and that
  # `Visitors::Status.id_check` and `Visits::Rules.verification_required?`
  # read. A failed attempt tells the leasing team the way the legacy
  # `mis_match_verification` did (the same subject, text and reason), once a
  # day per visitor and property rather than on every retry.
  #
  # Never writes a picture anywhere: not the database, not the log, not the
  # audit row (which carries the outcome and the provider's error code only).
  class Attempt
    Result = Struct.new(:outcome, :reason, :code, keyword_init: true)

    MAX_ATTEMPTS_PER_HOUR = 5
    MAX_IMAGE_BYTES = 6 * 1024 * 1024
    PASSED_EVENT = 'id_verification_passed'
    FAILED_EVENT = 'id_verification_failed'

    def self.call!(community, visitor, attrs, now: nil)
      new(community, visitor, now: now).call!(attrs)
    end

    # How many attempts the visitor may still make this hour (the audit rows count them).
    def self.attempts_left(community, visitor, now)
      used = PaperTrail::Version.where(item_type: 'Community', item_id: community.id, whodunnit: "visitor:#{visitor.id}", event: [PASSED_EVENT, FAILED_EVENT])
                                .where('created_at > ?', now - 1.hour).count
      [MAX_ATTEMPTS_PER_HOUR - used, 0].max
    end

    def initialize(community, visitor, now: nil)
      @community = community
      @visitor = visitor
      @now = now || ::Visits::Rules.now(community)
      @tour = community.community_tour
    end

    def call!(attrs)
      attrs = attrs.to_h.with_indifferent_access
      raise TourApi::ApiError.unprocessable('not_required', 'This property does not ask for ID verification.') unless @tour&.visual_id_verification
      unless @tour.verification_type.blank? || @tour.verification_type == Checkpoint::PROVIDER
        raise TourApi::ApiError.unprocessable('provider_unsupported', 'This property uses an ID verification provider the app does not support.')
      end

      check = Visitors::Status.id_check(@visitor, @now)
      if check[:state] == 'mismatch'
        raise TourApi::ApiError.unprocessable('mismatch_flagged', 'The leasing team flagged an ID mismatch on this account. Please contact the leasing office.')
      end
      return Result.new(outcome: 'already_verified', reason: nil, code: nil) if check[:state] == 'verified'

      left = self.class.attempts_left(@community, @visitor, @now)
      raise TourApi::ApiError.unprocessable('attempt_limit', 'Too many verification attempts. Please wait an hour or contact the leasing office.', { retry_after: 3600 }) if left <= 0

      document_type = attrs[:document_type].to_s
      raise TourApi::ApiError.validation([{ loc: %w[body document_type], message: "Input should be one of #{Checkpoint::DOCUMENT_TYPES.keys.join(', ')}" }]) unless Checkpoint::DOCUMENT_TYPES.key?(document_type)

      front = image(attrs[:front_image], loc: %w[body front_image], required: true)
      back = image(attrs[:back_image], loc: %w[body back_image], required: Checkpoint::DOCUMENT_TYPES[document_type][:back])
      selfie = image(attrs[:selfie_image], loc: %w[body selfie_image], required: true)
      raise TourApi::ApiError.new(503, 'provider_unavailable', 'ID verification is not available right now. Please try again in a moment.') unless Checkpoint.configured?

      answer = begin
        Checkpoint.verify!(document_type: document_type, front: front, back: back, selfie: selfie)
      rescue Checkpoint::Unavailable => e
        Rails.logger.warn("[tour-api] id verification provider unavailable community=#{@community.id} tour_user=#{@visitor.id} #{e.message}")
        raise TourApi::ApiError.new(503, 'provider_unavailable', 'ID verification is not available right now. Please try again in a moment.')
      end
      decision = Checkpoint.outcome(answer)
      if decision[:outcome] == 'verified'
        pass!(decision)
      else
        fail!(decision)
      end
      Result.new(outcome: decision[:outcome], reason: decision[:reason], code: decision[:code])
    end

    private

      def pass!(decision)
        # What `update_verification_attributes` wrote for `verfied_by_provider=check_point_id`, plus `verified_by` as `initialize_tour` set it.
        @visitor.update_columns(is_checkpoint_verified: true, checkpoint_verified_at: @now.utc, verified_by: Checkpoint::PROVIDER)
        TourApi::Audit.record(@community, PASSED_EVENT, whodunnit: whodunnit,
                                                        payload: { tour_user_id: @visitor.id, provider: Checkpoint::PROVIDER, anti_spoofing: decision[:anti_spoofing], confidence: decision[:confidence] })
      end

      def fail!(decision)
        already_told = PaperTrail::Version.where(item_type: 'Community', item_id: @community.id, whodunnit: whodunnit, event: FAILED_EVENT)
                                          .where('created_at > ?', @now - 24.hours).exists?
        TourApi::Audit.record(@community, FAILED_EVENT, whodunnit: whodunnit,
                                                        payload: { tour_user_id: @visitor.id, provider: Checkpoint::PROVIDER, outcome: decision[:outcome], code: decision[:code], notified: !already_told })
        notify_leasing!(decision[:reason]) unless already_told
      end

      # The legacy `Api::V1::ToursController#mis_match_verification`, verbatim.
      def notify_leasing!(reason)
        recipients = @community.email.to_s.gsub(' ', '').split(',').reject(&:blank?)
        return if recipients.empty?

        name = @visitor.name.presence || "#{@visitor.first_name} #{@visitor.last_name}".strip
        content = "#{name} visiting #{@community.name} was unable to begin the tour because of an issue with ID verification.<br><br>#{reason}"
        recipients.each do |email|
          DelayedSchedulerMailerJob.perform_async("ID Verification Issue for #{name}", content, email, @community, nil, nil, nil, nil, false, nil)
        end
      rescue StandardError => e
        Rails.logger.warn("[tour-api] id mismatch mail not queued community=#{@community.id} #{e.class}: #{e.message[0, 120]}")
      end

      # A picture as the app sends it: a data URL or bare base64, JPEG or PNG, within the size limit; never logged.
      def image(raw, loc:, required:)
        if raw.blank?
          raise TourApi::ApiError.validation([{ loc: loc, message: 'Field required' }]) if required

          return nil
        end
        raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be a valid string' }]) unless raw.is_a?(String)
        raise TourApi::ApiError.validation([{ loc: loc, message: "Image should be at most #{MAX_IMAGE_BYTES / (1024 * 1024)} MB" }]) if raw.bytesize > MAX_IMAGE_BYTES * 4 / 3 + 64

        data = raw.sub(%r{\Adata:image/(jpeg|jpg|png);base64,}i, '').gsub(/\s/, '')
        raise TourApi::ApiError.validation([{ loc: loc, message: 'Input should be a base64 JPEG or PNG image' }]) unless data.match?(%r{\A[A-Za-z0-9+/]+={0,2}\z}) && data.length >= 64

        data
      end

      def whodunnit
        "visitor:#{@visitor.id}"
      end
  end
end
