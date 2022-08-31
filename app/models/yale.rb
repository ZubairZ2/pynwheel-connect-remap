class Yale < ApplicationRecord
  belongs_to :edge_state
  has_one :status, as: :statusable
  
  def as_json
    super(
      :only => [:id, :edge_state_id]
    )
  end
end
