class CloneCommunityJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(community)
    copy community
    # copy_community = community.amoeba_dup
    # count = nil
    # while Community.where(name: community.name + " (Copy#{count.present? ? count : ''})").count > 0
    #   if count.nil?
    #     count = 2
    #   else
    #     count = count + 1
    #   end
    # end
    # copy_community.name = community.name + " (Copy#{count.present? ? count : ""})"
    # copy_community.code = (community.code.present? ? community.code + " (Copy#{(count.present? ? count : '')})" : "")
    #
    # copy_community.save validate:false


  end
    def copy(community)
      com = community
      cc = Community.new
      cc = com.dup
      cc.name = "--------"
      cc.code = "''''"
      cc.logo = com.logo if com.logo.present?
      cc.secondary_logo = com.secondary_logo if com.secondary_logo.present?
      cc.save validate: false

      begin
        if com.design.present?
          d = Design.new
          d = com.design.dup
          d.community_id = cc.id

          d.secondary_page_background_image = com.design.secondary_page_background_image
          d.global_nav_button_on = com.design.global_nav_button_on
          d.global_nav_button_off = com.design.global_nav_button_off
          d.filter_button = com.design.filter_button
          d.gallery_button = com.design.gallery_button
          d.filter_panel_background_image = com.design.filter_panel_background_image
          d.filter_label_image = com.design.filter_label_image
          d.gallery_button_on_image = com.design.gallery_button_on_image


          d.save
        end
      rescue => e
      end
      begin
        if com.design.expressionist.present?
          d = Expressionist.new
          d = com.design.expressionist.dup
          d.design_id = cc.design.id

          d.home_page_button_image = com.design.expressionist.home_page_button_image
          d.application_background_image = com.design.expressionist.application_background_image
          d.apartment_nav_bg_image = com.design.expressionist.apartment_nav_bg_image
          d.gallery_nav_bg_image = com.design.expressionist.gallery_nav_bg_image
          d.favourities_nav_bg_image = com.design.expressionist.favourities_nav_bg_image
          d.additional_pages_nav_bg_image = com.design.expressionist.additional_pages_nav_bg_image

          d.apartment_btn_on_image = com.design.expressionist.apartment_btn_on_image
          d.gallery_btn_on_image = com.design.expressionist.gallery_btn_on_image
          d.neighborhood_btn_on_image = com.design.expressionist.neighborhood_btn_on_image
          d.imagepage_btn_on_image = com.design.expressionist.imagepage_btn_on_image
          d.webpage_btn_on_image = com.design.expressionist.webpage_btn_on_image
          d.favourite_btn_on_image = com.design.expressionist.favourite_btn_on_image

          d.apartment_btn_off_image = com.design.expressionist.apartment_btn_off_image
          d.gallery_btn_off_image = com.design.expressionist.gallery_btn_off_image
          d.neighborhood_btn_off_image = com.design.expressionist.neighborhood_btn_off_image
          d.imagepage_btn_off_image = com.design.expressionist.imagepage_btn_off_image
          d.webpage_btn_off_image = com.design.expressionist.webpage_btn_off_image
          d.favourite_btn_off_image = com.design.expressionist.favourite_btn_off_image

          d.home_page_background_image = com.design.expressionist.home_page_background_image
          d.global_nav_background_image = com.design.expressionist.global_nav_background_image
          d.neighborhood_bg_image = com.design.expressionist.neighborhood_bg_image

          d.save
        end
      rescue => e
      end
      begin
        if com.design.filter_panel.present?
          d = FilterPanel.new
          d = com.design.filter_panel.dup
          d.design_id = cc.design.id
          d.save
        end
      rescue => e
      end
      begin
        if com.design.menu.present?
          d = Menu.new
          d = com.design.menu.dup
          d.design_id = cc.design.id
          d.save
        end
      rescue => e
      end
      begin
        if com.design.home_screen.present?
          d = HomeScreen.new
          d = com.design.home_screen.dup
          d.design_id = cc.design.id

          d.appartments_button = com.design.home_screen.appartments_button
          d.galleries_button = com.design.home_screen.galleries_button
          d.neighborhood_button = com.design.home_screen.neighborhood_button
          d.favorities_button = com.design.home_screen.favorities_button
          d.about_button = com.design.home_screen.about_button
          d.floorplan_button = com.design.home_screen.floorplan_button
          d.building_button = com.design.home_screen.building_button


          d.save
        end
      rescue => e
      end

      begin
        if com.design.main_screen.present?
          d = MainScreen.new
          d = com.design.main_screen.dup
          d.design_id = cc.design.id

          d.appartments_button = com.design.main_screen.appartments_button
          d.galleries_button = com.design.main_screen.galleries_button
          d.neighborhood_button = com.design.main_screen.neighborhood_button
          d.favorities_button = com.design.main_screen.favorities_button

          d.save
        end
      rescue => e
      end
      begin
        if com.design.home_page_images.present?
          com.design.home_page_images.each do |homepage_image|
            d = HomePageImage.new
            d = homepage_image.dup
            d.image = homepage_image.image
            d.design_id = cc.design.id
            d.save
          end
        end
      rescue => e
      end
      begin
        if com.design.homepage_icons.present?
          com.design.home_page_images.each do |homepage_icon|
            d = HomepageIcon.new
            d = homepage_icon.dup
            d.image = homepage_icon.image
            d.design_id = cc.design.id
            d.save
          end

        end
      rescue => e
      end
      begin
        if com.design.home_page_video.present?
          d = HomePageVideo.new
          d = com.design.home_page_video.dup

          d.video = com.design.home_page_video.video
          d.design_id = cc.design.id
          d.save
        end
      rescue => e
      end


      # cc = com.deep_clone include: [:units, :galleries, :credential, :gallery_images, {design: [:expressionist, :filter_panel]}]
      # cc.name = "copy 11"
      # cc.code = "code 123"
      # com.deep_clone include: :communities do |original, kopy|
      #   kopy.logo = original.logo
      # end
      # cc.save validate: false
    end
end
