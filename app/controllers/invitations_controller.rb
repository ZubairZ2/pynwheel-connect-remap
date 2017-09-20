class InvitationsController < Devise::InvitationsController

   def new
   	 @companies = Company.all
     super
   end

   def after_invite_path_for(resource)
    employees_path
   end

end