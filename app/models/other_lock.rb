class OtherLock < ApplicationRecord
  belongs_to :community
  include LaunchStatusable

  # Launch: another lock provider is complete once it is described.
  def derive_launch_status
    launch_status_from(description.present?)
  end
end
