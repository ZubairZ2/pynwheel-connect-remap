class Yale < ApplicationRecord
  belongs_to :edge_state
  
  def as_json
    super(
      :only => [:id, :edge_state_id]
    )
  end
end
