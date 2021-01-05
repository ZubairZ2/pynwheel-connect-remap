class GuidedOpeningHour < ApplicationRecord
  include RailsSortable::Model
  belongs_to :community
  set_sortable :sort
end
