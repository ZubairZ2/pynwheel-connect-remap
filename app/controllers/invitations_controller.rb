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

      User.invite!(
        {
          :email => email,
          :role => params[:user][:role],
          :company_id => params[:user][:company_id],
          :region_id => params[:user][:region_id],
          :community_ids => params[:user][:community_ids],
          :product_options => params[:product_options]
        },
        current_inviter)

      after_invite_path_for(current_inviter, email)
    end
  end

  def after_invite_path_for(resource, email)
    user = User.find_by(email: email) if email.present?

    if user.present?
      if params[:communitySelectToggle].eql?("new")
        if params[:companySelectToggle].eql?("new")
          invite_for_new_company(user)
        else
          invite_for_existing_company_new_community(user)
        end
      else
        invite_for_existing_company(user)
      end
    end

    company_employees_path(current_company)
  end

  def invite_for_new_company user
    company = Company.find_or_create_by(name: params[:user][:new_company_name].strip) if params[:user][:new_company_name].present?
    user.update(company_id: company.id)
    create_community_users(user, company) if company.present?
  end

  def invite_for_existing_company_new_community user
    company = Company.find params[:user][:company_id]
    create_community_users(user, company) if company.present?
  end

  def invite_for_existing_company user
    if  params[:user][:community_ids].present?
      params[:user][:community_ids].each do |community|

        if community.present?
          user_community = CommunityUser.find_by(community_id: community, user_id: user.id) rescue nil

          existing_community = Community.find_by_id community
          existing_community.update(product_options: params[:product_options])
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
      community.update(product_options: params[:product_options], move_to_production: false)
      community.set_community_status(current_user) if community.present?

      user_community = CommunityUser.find_by(community_id: community.id, user_id: user.id) rescue nil

      unless user_community.present?
        user_community = CommunityUser.create(community_id: community.id, user_id: user.id, enable_community_id: community.id, chat_enable: true)
      else
        user_community.update!(enable_community_id: community.id, chat_enable: true)
      end

    end
  end
end
