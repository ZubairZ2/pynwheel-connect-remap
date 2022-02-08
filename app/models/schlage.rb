class Schlage < ApplicationRecord
  belongs_to :edge_state

  def as_json
    super(
      :only => [:id, :email, :password, :edge_state_id]
    )
  end
end
