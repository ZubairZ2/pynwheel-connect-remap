class ZervLock < ApplicationRecord
  belongs_to :zerv
  belongs_to :stop, polymorphic: true
end
