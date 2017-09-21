class Ability
  include CanCan::Ability

  def initialize(user)
    if user.is_super_admin?
        can :manage, Company
        can :manage, Community
        can :manage, Floorplan
        can :manage, Unit
        can :manage, User
        can :add_settings,User  
        can :invite, User
    elsif user.is_company_admin?
        can :manage, Community, company_id: user.company_id	
        can :manage, Floorplan
        can :manage, Unit
        can :read, Company, id: user.company_id	
        can :update, Company, id: user.company_id	   
    end
  end
end
