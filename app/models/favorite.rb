# == Schema Information
#
# Table name: favorites
#
#  id                :integer          not null, primary key
#  community_id      :integer
#  session_id        :string
#  unit_ids          :jsonb
#  amenity_ids       :jsonb
#  floorplan_ids     :jsonb
#  gallery_image_ids :jsonb
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

# A session's live favorites. Share links don't read this row; they read a
# SharedFavorite snapshot of it.
class Favorite < ApplicationRecord
  include FavoriteIdColumns
end
