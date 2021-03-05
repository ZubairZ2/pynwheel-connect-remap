class Door < ApplicationRecord
    belongs_to :community
    belongs_to :attached_with, polymorphic: true
end
