module StandardBehaviourForLock
    extend ActiveSupport::Concern
    
    included do
        def clear_lock_provider
            self.stop.update_column(:lock_provider, "") rescue nil
        end
    end
    
end