class LatchLock < ApplicationRecord
  include StandardBehaviourForLock
  belongs_to :stop, polymorphic: true
  belongs_to :latch

  before_destroy  :clear_lock_provider

  def latch_lock_columns
    [lock_id, stop_type, stop_id]
  end
end
