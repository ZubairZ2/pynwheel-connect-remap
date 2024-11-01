class NotifyManagerService < BaseService
  attr_reader :community_id

  NOTIFY_MANAGER_EMAIL_SUBJECT = "IMPORTANT- new units have been added to your pynwheel tour".freeze
  NOTIFY_MANAGER_EMAIL_TEMPLATE = "Hello!
    <br>The following units have been added to Pynwheel Tour because their status changed to 'ready' in your property management system:
    <ul>%s</ul>
    Below is a list of all units currently available to tour:
    <ul>%s</ul>
    If any of these units are not ready for visitors, please make sure to change the status in your property management ASAP! If you need assistance or have questions please email
    <a href='mailto:support@pynwheel.com'>support@pynwheel.com</a>
    <br>
    Thank you!
    <br>
    <a href='mailto:support@pynwheel.com'>support@pynwheel.com</a>".freeze

  def initialize(community_id)
    @community = Community.find(community_id)
    @before_updation_units = @community.units.pluck(:id, :unit_status).to_h
  end

  def compare_status_and_notify
    notify_manager(community_units_updated) if is_authorized
  end

  def notify_manager(updated_units)

    available_units = @community.units.vacant_and_available

    if updated_units.present? && available_units.present?
      recipients = [@community.email, @community.property_manager_email].distinct
      email_body = generate_email_body(available_units, updated_units)

      recipients.each do |recipient|
        send_notification_email(recipient, email_body)
      end
    end
  end

  private

  def community_units_updated
    after_updation_units = Unit.where(id: @before_updation_units.keys).available_units
    updated_units = []
    after_updation_units.each do |updated_unit|
      if updated_unit.available_date.present? && updated_unit.available_date <= Date.today
        updated_unit_status = updated_unit.unit_status.downcase
        if UNIT_STATUSES.include?(updated_unit_status) && (updated_unit_status != @before_updation_units[updated_unit.id].downcase)
          updated_units.push(updated_unit.id)
        end
      end
    end

    updated_units
  end

  def generate_email_body(units, updated_units)
    new_units_list = []
    all_units_list = []

    units.sort_by { |unit| updated_units.include?(unit.id) ? 0 : 1 }.each do |unit|
      all_units_list << "<li>#{unit.marketing_name}</li>"
      new_units_list << "<li><b>#{unit.marketing_name}</b></li>" if updated_units.include?(unit.id)
    end

    format(NOTIFY_MANAGER_EMAIL_TEMPLATE, new_units_list.join, all_units_list.join)
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

  def is_authorized
    @community.self_tour? && @community.community_tour.tour_setting.enable_tour_customization && community_units_updated.present? rescue false
  end

end
