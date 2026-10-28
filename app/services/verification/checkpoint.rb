# frozen_string_literal: true

require 'net/http'
require 'json'

module Verification
  # CheckpointID's Document Verification Service (DVS), called from Rails
  # with the account's key (October 28, 2026).
  #
  # The legacy Pynwheel Tour app verified a visitor by posting the document
  # and selfie pictures straight from the phone to
  # `https://dvs.checkpointid.com/api/verify` with the account key in its
  # bundle (`pyn-tour-old/src/Screens/CheckPointScreen/screens/Response/Response.js`),
  # then told the API it had passed (`initialize_tour?verfied_by_provider=check_point_id`).
  # The new Tour App never sees the key: the pictures come to Rails, Rails
  # calls the provider, reads the answer and writes the visitor's row itself.
  #
  # Configuration: `CHECKPOINT_DVS_API_KEY` (the `sk_…` key of the account),
  # `CHECKPOINT_DVS_URL` (the host; the production one by default). Nothing
  # else of the provider is known to this codebase: the hosted onboarding
  # page (`tour_users#checkpoint_verification`) and the callback route
  # (`tours#checkpoint_verification_response`) have no actions behind them.
  class Checkpoint
    class Unavailable < StandardError; end

    DEFAULT_URL = 'https://dvs.checkpointid.com'
    VERIFY_PATH = '/api/verify'
    PROVIDER = 'check_point_id'
    # The document types the legacy app offered, and the DVS `documentType` each sent.
    DOCUMENT_TYPES = {
      'drivers_license' => { code: 1, label: "Driver's license", back: true },
      'id_card' => { code: 6, label: 'ID card', back: true },
      'passport' => { code: 2, label: 'Passport', back: false },
      'passport_card' => { code: 6, label: 'Passport card', back: false },
      'international_id' => { code: 6, label: 'International ID', back: false }
    }.freeze
    # The legacy decision (Response.js#checkSuccess, Api::V1::ToursController#get_reason).
    FACE_ERROR_CODES = %w[MultipleErrors ValidationError].freeze
    DOCUMENT_ERROR_CODES = %w[MRZOCRError MRZInNotPresentError].freeze
    MIN_ANTI_SPOOFING = 80
    MIN_CONFIDENCE = 55
    FACE_REASON = 'The Face has not been matched'
    DOCUMENT_REASON = 'Unable to capture mrz from the image of the document.'
    OPEN_TIMEOUT = 10
    READ_TIMEOUT = 60

    class << self
      def configured?
        api_key.present?
      end

      def api_key
        ENV['CHECKPOINT_DVS_API_KEY'].presence
      end

      def base_url
        ENV['CHECKPOINT_DVS_URL'].presence || DEFAULT_URL
      end

      # The provider's parsed answer for one attempt. Raises Unavailable when
      # the key is missing, the provider cannot be reached, answers an error
      # that is not a verification result, or answers something that is not JSON.
      def verify!(document_type:, front:, back:, selfie:)
        raise Unavailable, 'CheckpointID is not configured on this server' unless configured?

        type = DOCUMENT_TYPES.fetch(document_type)
        payload = { documentType: type[:code], verifyFace: true, frontImageBase64: front, faceImageBase64: selfie }
        payload[:backOrSecondImageBase64] = back if back.present?
        response = post(payload)
        raise Unavailable, "CheckpointID refused the server's key" if %w[401 403].include?(response.code)

        parsed = begin
          JSON.parse(response.body.to_s)
        rescue JSON::ParserError
          nil
        end
        raise Unavailable, "CheckpointID answered #{response.code} without a result" unless parsed.is_a?(Hash) && (response.code.start_with?('2') || parsed['code'].present?)

        parsed
      rescue Timeout::Error, Errno::ECONNREFUSED, Errno::ECONNRESET, Errno::EHOSTUNREACH, SocketError, OpenSSL::SSL::SSLError, Net::OpenTimeout, Net::ReadTimeout, IOError => e
        raise Unavailable, "CheckpointID could not be reached: #{e.class}"
      end

      # What the provider's answer means: `verified`, `face_mismatch` (the
      # selfie does not match the document, or the liveness check failed),
      # `document_unreadable` (the machine-readable zone could not be read),
      # or `rejected` (any other error the provider named). The legacy app
      # read only `code`, `faceVerificationResult.antiSpoofing` and
      # `faceVerificationResult.confidence`; this reads the same three, and
      # unlike the legacy app it never treats an unknown error code or a
      # missing face result as a pass.
      def outcome(answer)
        code = answer['code'].to_s
        face = answer['faceVerificationResult']
        face = {} unless face.is_a?(Hash)
        return { outcome: 'face_mismatch', reason: FACE_REASON, code: code } if FACE_ERROR_CODES.include?(code)
        return { outcome: 'document_unreadable', reason: DOCUMENT_REASON, code: code } if DOCUMENT_ERROR_CODES.include?(code)
        return { outcome: 'rejected', reason: answer['message'].presence || 'The document could not be verified.', code: code } if code.present?

        anti_spoofing = face['antiSpoofing']
        confidence = face['confidence']
        if anti_spoofing.nil? || confidence.nil?
          return { outcome: 'rejected', reason: 'The provider returned no face match result.', code: 'NoFaceResult' }
        end
        if anti_spoofing.to_f < MIN_ANTI_SPOOFING || confidence.to_f < MIN_CONFIDENCE
          return { outcome: 'face_mismatch', reason: FACE_REASON, code: 'FaceBelowThreshold', anti_spoofing: anti_spoofing.to_f, confidence: confidence.to_f }
        end

        { outcome: 'verified', reason: nil, code: nil, anti_spoofing: anti_spoofing.to_f, confidence: confidence.to_f }
      end

      private

        def post(payload)
          uri = URI.join(base_url, VERIFY_PATH)
          http = Net::HTTP.new(uri.host, uri.port)
          http.use_ssl = uri.scheme == 'https'
          http.open_timeout = OPEN_TIMEOUT
          http.read_timeout = READ_TIMEOUT
          request = Net::HTTP::Post.new(uri.request_uri)
          request['Content-Type'] = 'application/json;charset=utf-8'
          request['Accept'] = 'application/json'
          request['Authorization'] = "Bearer #{api_key}"
          request.body = payload.to_json
          http.request(request)
        end
    end
  end
end
