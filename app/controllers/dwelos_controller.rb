
class DwelosController < ApplicationController
  def create
    dwelo_account =Dwelo.find_by(community_id: params[:community_id])
    unless dwelo_account.present?
    Dwelo.create!(client_id: "GLAeaxdUJb64yxWwQbzGGGEmnPAW4DaP", client_secret: "wr5RZQfGBqqWyVWLHU2gGWW2g9Qmz2BWSH94yNhfuuZ6GMet" ,community_id: params[:community_id], default_community_id: "1ee788d2-92d8-43be-ade5-4a6b3cf68ed0")
    end
  end
end
