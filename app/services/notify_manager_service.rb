class NotifyManagerService < BaseService
  attr_reader :community_id

  NOTIFY_MANAGER_EMAIL_SUBJECT = "IMPORTANT- new units have been added to your self-guided tour".freeze
  NOTIFY_MANAGER_EMAIL_TEMPLATE = "Hello!
    <br>The following units have been added to Pynwheel Self Tour because their status changed to 'ready' in your property management system:
    <ul>%s</ul>
    If any of these units are not ready for visitors, please make sure to change the status in your property management ASAP!
    <br>
    Thank you!".freeze

  def initialize(community_id)
    @community = Community.find(community_id)
    @before_updation_units = @community.units.pluck(:id, :unit_status).to_h
  end

  def compare_status_and_notify   
    notify_manager() if community_units_updated?
  end

  def notify_manager

    available_units = @community.units.vacant_and_available

    if available_units.present?
      recipients = [@community.email, @community.property_manager_email]
      email_body = generate_email_body(available_units)

      recipients.each do |recipient|
        send_notification_email(recipient, email_body)
      end
    end
  end

  private

  def community_units_updated?
    after_updation_units = Unit.where(id: @before_updation_units.keys)

    after_updation_units.each do |updated_unit|
      if UNIT_STATUSES.include?(updated_unit.unit_status) && (updated_unit.unit_status != @before_updation_units[updated_unit.id])
        return true
      end
    end

    false
  end

  def generate_email_body(units)
    units_list = units.map { |unit| "<li>#{unit.marketing_name}</li>" }.join
    format(NOTIFY_MANAGER_EMAIL_TEMPLATE, units_list)
  end

  def send_notification_email(recipient, email_body)
    NotificationMailer.notify_property_manager(
      NOTIFY_MANAGER_EMAIL_SUBJECT,
      email_body,
      recipient,
      ENV['FOLLOW_UP_EMAIL_FROM'],
      @community,
      false
    ).deliver
  end
end
