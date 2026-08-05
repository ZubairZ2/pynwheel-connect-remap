class Schlage < ApplicationRecord
  belongs_to :community
  include LaunchStatusable

  mount_uploader :image, SchlagelockUploader

  def as_json options = {}
    super(
      :only => [:id, :email, :password, :image]
    )
  end

  # Launch: nothing to fill in -- choosing Schlage is the whole answer.
  def derive_launch_status
    SUBMITTED
  end
end
