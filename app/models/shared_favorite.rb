# == Schema Information
#
# Table name: shared_favorites
#
#  id                :bigint           not null, primary key
#  token             :string           not null
#  community_id      :integer          not null
#  session_id        :string
#  unit_ids          :jsonb            not null
#  amenity_ids       :jsonb            not null
#  floorplan_ids     :jsonb            not null
#  gallery_image_ids :jsonb            not null
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#

# A frozen copy of a session's favorites, made when the visitor shares them.
# The share link carries `token`, so later fav/unfav in the session doesn't
# change a link already sent, and the link can't be used to edit the sender's
# favorites (the session id is the write key; the token is read-only).
#
# Only the list of ids is frozen. The items themselves are built fresh on every
# read, so price and availability stay current and a deleted or hidden item
# drops out.
class SharedFavorite < ApplicationRecord
  include FavoriteIdColumns

  TOKEN_LENGTH = 12

  belongs_to :community

  validates :token, presence: true

  before_validation :assign_token, on: :create

  # The share for this favorites row as it is right now. Sharing the same list
  # twice returns the earlier share, so re-opening the share sheet doesn't
  # pile up identical rows or hand out a new link for nothing.
  #
  # The favorites row is locked for the check-then-create, so two shares of
  # one session at the same moment (a double tap, or React running the share
  # sheet's effect twice in dev) can't both miss and both insert. with_lock
  # also reloads the row, so the snapshot is of the committed list.
  def self.snapshot_of!(favorite)
    favorite.with_lock do
      ids    = favorite.ids_by_type
      latest = where(community_id: favorite.community_id, session_id: favorite.session_id)
                 .order(created_at: :desc, id: :desc).first
      next latest if latest&.ids_by_type == ids

      create!(community_id: favorite.community_id, session_id: favorite.session_id, **ids_attributes(ids))
    end
  end

  def self.ids_attributes(ids_by_type)
    ids_by_type.to_h { |type, ids| [column_for_type(type), ids] }
  end
  private_class_method :ids_attributes

  private

  def assign_token
    self.token ||= SecureRandom.base58(TOKEN_LENGTH)
  end
end
