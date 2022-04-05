class Api::V2::FollowUpEmailsController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community
  before_action :set_user

  def preview_follow_up_email
    email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
    email_body = send_email(email)
    render :json => {:success => true, :email => email_body}
  end

  def send_follow_up_emails
    # email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
    # send_email(email)
  end

  private

  def send_email(email)
    case email[:type]
    when APPLICATION_NOT_STARTED
      puts "APPLICATION_NOT_STARTED"
    when APPLICATION_IN_PROGRESS
      return FollowUpMailer.application_in_progess(email[:data], @users).to_s
    end
  end

  def set_user
    @users = @community.users
  end

  def set_community
    @community = Community.find params[:community_id]
    rescue ActiveRecord::RecordNotFound
      render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
  end
end
