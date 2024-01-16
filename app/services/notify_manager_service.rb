class NotifyManagerService < BaseService
  attr_reader :community_id

  NOTIFY_MANAGER_EMAIL_SUBJECT = "IMPORTANT- new units have been added to your self-guided tour".freeze
  NOTIFY_MANAGER_EMAIL_TEMPLATE = "Hello!
    <br>The following units have been added to Pynwheel Self Tour because their status changed to 'ready' in your property management system:
    <ul style='list-style-type:none; padding: 0; display: flex; flex-wrap: wrap;'>%s</ul>
    If any of these units are not ready for visitors, please make sure to change the status in your property management ASAP!
    <br>
    Thank you!
    <br>
    <a href='mailto:support@pynwheel.com'>support@pynwheel.com</a>".freeze

  def initialize(community_id)
    @community = Community.find(community_id)
    @before_updation_units = @community.units.pluck(:id, :unit_status).to_h
  end

  def compare_status_and_notify
    notify_manager(community_units_updated) if @community.self_tour? && community_units_updated.present?
  end

  def notify_manager(updated_units)

    available_units = @community.units.vacant_and_available

    if available_units.present?
      recipients = [@community.email, @community.property_manager_email].uniq
      email_body = generate_email_body(available_units, updated_units)

      recipients.each do |recipient|
        send_notification_email(recipient, email_body)
      end
    end
  end

  private

  def community_units_updated
    after_updation_units = Unit.where(id: @before_updation_units.keys)
    updated_units = []
    after_updation_units.each do |updated_unit|
      updated_unit_status = updated_unit.unit_status.downcase
      if UNIT_STATUSES.include?(updated_unit_status) && (updated_unit_status != @before_updation_units[updated_unit.id].downcase)
        updated_units.push(updated_unit.id)
      end
    end

    updated_units
  end

  def generate_email_body(units, updated_units)
    sorted_units = units.sort_by { |unit| updated_units.include?(unit.id) ? 0 : 1 }

    units_list = sorted_units.map do |unit|
      if updated_units.include?(unit.id)
        "<li><b>#{unit.marketing_name}</b></li>"
      else
        "<li>#{unit.marketing_name}</li>"
      end
    end.join

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
