# frozen_string_literal: true

module Wayfinding
  # A payload the save cannot apply. `errors` is a list of
  # `{path:, code:, message:}` items; nothing was written.
  class Invalid < Error
    attr_reader :errors

    def initialize(errors)
      @errors = Array(errors)
      super(@errors.map { |e| "#{e[:path]}: #{e[:message]}" }.join('; ').presence || 'invalid')
    end

    def self.one(path, code, message)
      new([{ path: path.to_s, code: code.to_s, message: message }])
    end
  end
end
