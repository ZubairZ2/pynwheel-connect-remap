class Ability
  include CanCan::Ability

  def initialize(user)
    if user.is_super_admin?
        can :manage, :all
    elsif user.is_community_admin?
        can :manage, Community, company_id: user.company_id	
        can :manage, Floorplan
        can :manage, Unit
        can :read, Company, id: user.company_id	
        can :update, Company, id: user.company_id	 
        can :manage ,User, id: user.id
        cannot :add_settings, User, id: user.id
        cannot :select_theme, User, id: user.id            
    end
  end
end
