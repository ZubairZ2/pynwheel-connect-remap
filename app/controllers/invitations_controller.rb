class InvitationsController < Devise::InvitationsController
  # include Error::ErrorHandler
  # before_action :check_community
   def new
     #authorize! :invite,current_user		
     super
   end

   def after_invite_path_for(resource)
     if params[:chat_community_ids].present?
       chat_enable_communities = params[:chat_community_ids]
       user = User.find_by(email: params[:user][:email])
       if chat_enable_communities.present?
         chat_enable_communities.each do |community|
           if community.present?
             user_community = CommunityUser.find_by(community_id: community, user_id: user.id) rescue nil
             unless user_community.present?
               user_communityy = CommunityUser.create(community_id: community, user_id: user.id, enable_community_id: community, chat_enable: true)
             else
               user_community.update!(enable_community_id: community, chat_enable: true)
             end
           end
         end
       end
     end
     company_employees_path(current_company)
     # here to assign communities to user
   end
end