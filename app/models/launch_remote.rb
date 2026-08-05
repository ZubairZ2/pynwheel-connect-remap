class LaunchRemote < ApplicationRecord
  belongs_to :community
  include LaunchStatusable

  def as_json options = {}
    super(
      :only => [:id]
    )
  end

  # Launch: nothing to fill in -- choosing RemoteLock is the whole answer.
  def derive_launch_status
    SUBMITTED
  end
end
