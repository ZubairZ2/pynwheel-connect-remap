class ZervLock < ApplicationRecord
  belongs_to :zerv
  belongs_to :stop, polymorphic: true

  before_destroy :remove_stop_lock_provider_type
  
  def remove_stop_lock_provider_type
    if self.stop.present?
      self.stop.update_column(:lock_provider, "")
    end
  end

end
