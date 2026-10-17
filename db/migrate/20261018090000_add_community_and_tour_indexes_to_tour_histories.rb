# The Connect Visitors module reads a property's visits by `tour_id` (every
# tour of the community) and by `community_id` (Visitors::Query#histories);
# `tour_histories` only had an index on `tour_user_id`, so both reads scanned
# the table. Index-only, additive, no data change; built concurrently so a
# running legacy server is not blocked.
class AddCommunityAndTourIndexesToTourHistories < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  def change
    add_index :tour_histories, :community_id, algorithm: :concurrently, if_not_exists: true
    add_index :tour_histories, :tour_id, algorithm: :concurrently, if_not_exists: true
  end
end
