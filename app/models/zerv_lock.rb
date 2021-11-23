class ZervLock < ApplicationRecord
  include StandardBehaviourForLock

  belongs_to :zerv
  belongs_to :stop, polymorphic: true

  before_destroy :clear_lock_provider
end
