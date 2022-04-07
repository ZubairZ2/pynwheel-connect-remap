class Api::V2::FollowUpEmailsController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community
  before_action :set_user

  def preview_follow_up_email
    email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
    email_body = preview_email(email)
    render :json => {:success => true, :email => {email: email_body[:email], subject: email_body[:subject], emails: @users.pluck(:email)}}
  end

  def send_follow_up_emails
    email_params = JSON.parse(params[:email])
    if email_params.present?
      @users = email_params["emails"]
      @subject = email_params["subject"]
      @body = params["email_body"]
      if FollowUpMailer.send_email(@users, @subject, @body).deliver_later
        render json: {success: true}
      end
    end
  end

  private

  def preview_email(email)
    case email[:type]
    when APPLICATION_IN_PROGRESS
      email = FollowUpMailer.preview_application_in_progess(email[:data])
      subject = 'Some content was received to pynwheel, but not all'
      return {email: email, subject: subject}
    else
      email = FollowUpMailer.preview_application_in_progess(email[:data])
      subject = 'Some content was received to pynwheel, but not all'
      return {email: email, subject: subject}
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
