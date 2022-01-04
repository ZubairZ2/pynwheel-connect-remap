class OpeningHour < ApplicationRecord
  include RailsSortable::Model
  belongs_to :community
  has_one :status, as: :statusable
  set_sortable :sort
end
