class InvitationsController < Devise::InvitationsController
   
   def new
     authorize! :invite,current_user		
     super
   end

   def after_invite_path_for(resource)
    employees_path
   end

end