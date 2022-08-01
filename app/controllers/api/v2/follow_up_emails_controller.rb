class Api::V2::FollowUpEmailsController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :set_community, only: [:preview_follow_up_email, :send_follow_up_emails, :preview_submit_for_review_email]
  before_action :set_user, only: [:preview_follow_up_email, :send_follow_up_emails]

  def preview_follow_up_email
    email_preview_first = [APPLICATION_IN_PROGRESS, APPLICATION_NOT_STARTED]
    email = PynwheelLaunch::Communities::FollowUpEmails.new(@community).send_emails
    if email_preview_first.include?(email[:type])
      email_body = preview_email(email)
      render :json => {:success => true, :email => {email: email_body[:email], subject: email_body[:subject], emails: @users.pluck(:email)}}
    end
  end

  def preview_submit_for_review_email
    email = "support@pynwheel.com"
    subject = "App Production Complete For #{@community.company.name} #{@community.name}"
    email_body = FollowUpMailer.preview_appliation_submit_for_review(@community, current_user)
    render :json => {:success => true, :email => {email: email, subject: subject, body: email_body}}
  end

  def send_follow_up_emails
    email_params = JSON.parse(params[:email])
    if email_params.present?
      @users = email_params["emails"]
      @subject = email_params["subject"]
      @body = params["email_body"]
      if FollowUpMailer.send_email_request(@users, @subject, @body)
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
    when APPLICATION_NOT_STARTED
      email = FollowUpMailer.preview_application_not_started(email[:data])
      subject = "No content received yet! is there anything pynwheel can help with?"
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
