class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  mount_uploader :avatar, AvatarUploader
  devise :invitable, :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable
  #ROLES = ["super admin" , "company admin" , "community manager", "region admin" , "member"]  
  ROLES = ["Community admin", "Community manager"]  
  belongs_to :company
  has_many :community_users
  has_many :communities ,through: :community_users

  def name
  	if first_name.nil? and last_name.nil?
  		email
  	else
  		first_name+" "+last_name
  	end
  end  

  def is_super_admin?
    role == "Super admin"
  end

  def is_community_admin?
    role == "Community admin"
  end

  def is_community_manager?
    role == "Community manager"
  end

end
