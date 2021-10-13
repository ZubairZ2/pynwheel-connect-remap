class IgloohomeLock < ApplicationRecord
  include StandardBehaviourForLock

  belongs_to :igloohome
  belongs_to :stop, polymorphic: true

  before_destroy :clear_lock_provider
end