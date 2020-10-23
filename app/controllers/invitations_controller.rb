class InvitationsController < Devise::InvitationsController
  # before_action :check_community
   def new
     #authorize! :invite,current_user		
     super
   end

   def after_invite_path_for(resource)
     company_employees_path(current_company)
   end
end