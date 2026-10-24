# frozen_string_literal: true

# "Publish to Tour App" in Pynwheel Connect (October 25, 2026): the tour keeps
# when it was last published, by whom, and the configuration version that was
# published, so Connect can say "Published · Oct 25 · unchanged since" and the
# Tour App API can tell a client whether what it holds is current. Save stays
# live for every consumer; nothing here changes what the legacy app, the
# Touch app or the Tour App read. All three columns are nullable, so legacy
# rows read as before.
class AddTourPublicationColumns < ActiveRecord::Migration[7.2]
  def change
    add_column :tours, :tour_published_at, :datetime, precision: nil
    add_column :tours, :tour_published_by_id, :integer
    add_column :tours, :tour_published_version, :string
  end
end
