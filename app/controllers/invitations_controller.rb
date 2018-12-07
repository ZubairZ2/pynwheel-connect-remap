class InvitationsController < Devise::InvitationsController
  # before_action :check_community
   def new
     #authorize! :invite,current_user		
     super
   end

   def after_invite_path_for(resource)
     company_employees_path(current_company)
   end
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end
end