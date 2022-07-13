class InvitationsController < Devise::InvitationsController
  # include Error::ErrorHandler

   def new
     #authorize! :invite,current_user
     super
   end

  def create
    
    invite_resource

    flash[:notice] = "Invitations sent ....!"

    redirect_to root_path
  end

  def invite_resource
    params[:user][:email].split(",").each do |email|
      email = email.strip
      user_exist = User.find_by(email: email)
      if !user_exist.nil?
        previous_pynwheel_launch = user_exist.pynwheel_launch_access
        previous_pynwheel_connect = user_exist.pynwheel_connect_access
        new_pynwheel_launch = change_to_boolean(params[:user][:pynwheel_launch_access])
        new_pynwheel_connect = change_to_boolean(params[:user][:pynwheel_connect_access])
        if (new_pynwheel_connect && !new_pynwheel_launch)
          InviteMailer.pynwheel_connect_invite_email(user_exist).deliver
        elsif (new_pynwheel_launch && !new_pynwheel_connect)
          InviteMailer.pynwheel_launch_invite_email(user_exist).deliver
        elsif new_pynwheel_launch && new_pynwheel_connect
          InviteMailer.pynwheel_launch_invite_email(user_exist).deliver
          InviteMailer.pynwheel_connect_invite_email(user_exist).deliver
        else
          InviteMailer.pynwheel_connect_invite_email(user_exist).deliver
        end
        user_exist.update(pynwheel_launch_access: new_pynwheel_launch, pynwheel_connect_access: new_pynwheel_connect)
        user_exist.save
      else
        User.invite!(
          {
            :email => email,
            :role => params[:user][:role],
            :company_id => params[:user][:company_id],
            :region_id => params[:user][:region_id],
            :community_ids => params[:user][:community_ids],
            :pynwheel_connect_access => params[:user][:pynwheel_connect_access],
            :pynwheel_launch_access => params[:user][:pynwheel_launch_access],
          },
          current_inviter)
      end
      after_invite_path_for(current_inviter, email)
    end
  end

  def after_invite_path_for(resource, email)
    user = User.find_by(email: email) if email.present?

    if user.present?
      invite_for_existing_company(user)
    end

    company_employees_path(current_company)
  end

  def invite_for_existing_company user
    if  params[:user][:community_ids].present?
      params[:user][:community_ids].each do |community|

        if community.present?
          user_community = CommunityUser.find_by(community_id: community, user_id: user.id) rescue nil

          existing_community = Community.find_by_id community

          existing_community.update(move_to_production: false)
          existing_community.set_community_status(current_user) if existing_community.present?

          unless user_community.present?
            user_community = CommunityUser.create(community_id: community, user_id: user.id, enable_community_id: community, chat_enable: true)
          else
            user_community.update!(enable_community_id: community, chat_enable: true)
          end
        end

      end
    end
  end

  def create_community_users user, company
    params[:user][:new_community_names].split(",").each do |name|
      name = name.strip
      community = Community.find_or_create_by(name: name, company_id: company.id)
      community.update(move_to_production: false)
      community.set_community_status(current_user) if community.present?
      user_community = CommunityUser.find_by(community_id: community.id, user_id: user.id) rescue nil

      unless user_community.present?
        user_community = CommunityUser.create(community_id: community.id, user_id: user.id, enable_community_id: community.id, chat_enable: true)
      else
        user_community.update!(enable_community_id: community.id, chat_enable: true)
      end

    end
  end

  private

  def change_to_boolean(value)
    return ActiveModel::Type::Boolean.new.cast(value)
  end
end
