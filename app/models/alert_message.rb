# == Schema Information
#
# Table name: alert_messages
#
#  id           :integer          not null, primary key
#  message_key  :string
#  message_body :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#

class AlertMessage < ApplicationRecord
end
