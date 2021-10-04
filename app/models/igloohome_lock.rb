class IgloohomeLock < ApplicationRecord
  include StandardBehaviourForLock
  belongs_to :stop, polymorphic: true
  belongs_to :igloohome

  before_destroy :clear_lock_provider
end