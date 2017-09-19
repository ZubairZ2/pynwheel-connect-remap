class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  mount_uploader :avatar, AvatarUploader
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable

  def name
  	if first_name.nil? and last_name.nil?
  		email
  	else
  		first_name+" "+last_name
  	end
  end  

  def is_admin?
    role == "admin"
  end

  def is_normal_user?
    role == "user"
  end

end
