module UnitSpaceDetails
  # Which adapter, if any, can read a given provider's feeds.
  #
  # This is the only place a provider is named anywhere below the adapter layer.
  # Adding a provider is a line here plus one file in adapters/ -- nothing in the
  # collector, the policies, the serializer, the SDK or the React app changes.
  #
  # Returning nil is the "not supported" answer, and it makes every Collector
  # method a no-op, so no caller ever asks whether a provider is supported.
  module Adapters
    REGISTRY = {
      "psi" => "UnitSpaceDetails::Adapters::Entrata"
    }.freeze

    def self.for(provider)
      REGISTRY[provider.to_s]&.constantize
    end
  end
end
