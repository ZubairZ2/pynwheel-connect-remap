class Comment < ApplicationRecord
  belongs_to :commentable, polymorphic: true

  validates_presence_of :content
  belongs_to :creator, class_name: 'User', foreign_key: 'whodunit'

  def as_json
    super(
      :only => [:id , :content , :created_at] ,
      :include => {
        :creator => {:only => [:id , :first_name , :last_name]}
        }
    )
  end
end
