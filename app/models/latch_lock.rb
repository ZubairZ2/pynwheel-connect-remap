class LatchLock < ApplicationRecord
    belongs_to :stop, polymorphic: true
    belongs_to :latch
end