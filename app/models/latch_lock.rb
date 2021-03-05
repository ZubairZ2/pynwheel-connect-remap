class LatchLock < ApplicationRecord
    belongs_to :stop, polymorphic: true
    belongs_to :latch

    before_destroy :remove_stop_lock_provider_type

    def remove_stop_lock_provider_type
      if self.stop.present?
        self.stop.update_column(:lock_provider, "")
      end
    end

end
