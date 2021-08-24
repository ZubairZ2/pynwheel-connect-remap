class ExpireOtpJob < ApplicationJob
  include SuckerPunch::Job

  def perform pynwheel_access_user
    pynwheel_access_user.update(pin_code: nil)
  end
end