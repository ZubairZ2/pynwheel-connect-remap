class Hallway < ApplicationRecord
  belongs_to :parent, polymorphic: true

end
