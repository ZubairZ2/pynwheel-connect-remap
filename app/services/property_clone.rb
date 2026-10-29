# frozen_string_literal: true

# Property-centred cloning (October 28, 2026). See app/services/property_clone/policy.rb
# for the dependency map and docs/property_clone/ for the runbook.
module PropertyClone
  class Error < StandardError; end
  class NotFound < Error; end
  class Conflict < Error; end
  class MissingReference < Error; end
  class Blocked < Error; end
end
