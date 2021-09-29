class IgloohomeLock < ApplicationRecord
  belongs_to :stop, polymorphic: true
  belongs_to :igloohome
end