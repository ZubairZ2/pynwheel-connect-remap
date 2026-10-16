# frozen_string_literal: true

module Connect
  # An error a Tour Setup service raises on purpose, answered as one envelope
  # error `{code, message}` with the given HTTP status (Connect::BaseController).
  class DomainError < StandardError
    attr_reader :code, :status, :extra

    def initialize(code, message, status: :unprocessable_entity, extra: {})
      @code = code.to_s
      @status = status
      @extra = extra
      super(message)
    end

    def self.not_found(message)
      new('not_found', message, status: :not_found)
    end

    def self.invalid(code, message, extra = {})
      new(code, message, status: :unprocessable_entity, extra: extra)
    end

    def self.upstream(code, message)
      new(code, message, status: :bad_gateway)
    end
  end
end
