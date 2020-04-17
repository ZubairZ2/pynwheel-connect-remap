class Message < ApplicationRecord
  belongs_to :community

  # after_create_commit { MessageBroadcastJob.perform_async(self) }
end
