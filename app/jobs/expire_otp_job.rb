class ExpireOtpJob < ApplicationJob
  include SuckerPunch::Job

  def perform user
    user.update(pin_code: nil)
  end
end