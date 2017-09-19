class Ability
  include CanCan::Ability

  def initialize(user)
    if user.is_admin?
        can :read, Company
    end
  end
end
