class Ability
  include CanCan::Ability

  def initialize(user)
    alias_action :create, :read, :update, :delete, :destroy, to: :crud
    if user.is_super_admin?
        can :manage, :all
    elsif user.is_community_admin?
      if user.is_dwelo_admin?
        can :edit_settings_page, User, id: user.id
        can :crud, Company
        can :manage, Region
      else
        can :read, Company, id: user.company_id
        can :update, Company, id: user.company_id
      end
        can :manage, Community, company_id: user.company_id
        can :manage, Floorplan
        can :manage, Unit
        can :add_settings, User, id: user.id
        cannot :select_theme, User, id: user.id
    end
  end
end
