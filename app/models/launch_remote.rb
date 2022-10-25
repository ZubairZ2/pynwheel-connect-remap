class LaunchRemote < ApplicationRecord
  belongs_to :community
  has_one :status, as: :statusable

  def as_json options = {}
    super(
      :only => [:id]
    )
  end
end
