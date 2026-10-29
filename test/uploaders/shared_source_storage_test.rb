require 'test_helper'

# Shared upload folders: a record with file_source_id reads another record's
# folder, never writes into it.
class SharedSourceStorageTest < ActiveSupport::TestCase
  setup do
    @source = floorplates(:plate_a)
    @source.update_columns(image: 'plan.png', svg_image: 'plan.svg')
    @clone = Floorplate.new(name: 'clone plate', community: communities(:tour_property), number: 7, range: '7')
    @clone.save!(validate: false)
    @clone.update_columns(image: 'plan.png', svg_image: 'plan.svg', file_source_id: @source.id)
    @clone.reload
  end

  test 'a shared record resolves its files in the source folder, an ordinary record in its own' do
    assert_equal "uploads/floorplate/image/#{@source.id}", @source.image.store_dir
    assert_equal "uploads/floorplate/image/#{@source.id}", @clone.image.store_dir
    assert_equal "uploads/floorplate/svg_image/#{@source.id}", @clone.svg_image.store_dir
    assert_equal @source.image.url, @clone.image.url
    assert_equal @source.svg_image.url, @clone.svg_image.url
    assert @clone.image.shared_source?
    refute @source.image.shared_source?
    assert_equal "uploads/floorplate/image/#{@clone.id}", @clone.image.own_store_dir
  end

  test 'every mounted uploader resolves through the shared folder' do
    unit = units(:plotted_unit)
    unit.update_columns(image: 'u.png', file_source_id: 424_242)
    assert_equal 'uploads/unit/image/424242', unit.reload.image.store_dir
    community = communities(:tour_property)
    community.update_columns(logo: 'l.png', file_source_id: 777)
    assert_equal 'uploads/community/logo/777', community.reload.logo.store_dir
    amenity = amenities(:gym)
    amenity.update_columns(image: 'a.png', file_source_id: 9)
    assert_equal 'uploads/amenity/image/9', amenity.reload.image.store_dir
  end

  test 'destroying or removing on a shared record never deletes the source objects' do
    deleted = []
    source_path = "uploads/floorplate/image/#{@source.id}/plan.png"
    fake = Object.new
    fake.define_singleton_method(:path) { source_path }
    fake.define_singleton_method(:delete) { deleted << source_path }
    uploader = @clone.image
    uploader.instance_variable_set(:@file, fake)
    uploader.remove!
    assert_empty deleted, 'the source object is kept'
    assert_nil uploader.instance_variable_get(:@file)

    own_path = "uploads/floorplate/image/#{@clone.id}/mine.png"
    own = Object.new
    own.define_singleton_method(:path) { own_path }
    own.define_singleton_method(:delete) { deleted << own_path }
    uploader = @clone.image
    uploader.instance_variable_set(:@file, own)
    uploader.remove!
    assert_equal [own_path], deleted, 'an object in the own folder is deleted as before'
  end

  test 'recreate_versions! is a no-op while shared' do
    called = false
    uploader = @clone.image
    uploader.define_singleton_method(:cache_id=) { |*| called = true }
    uploader.recreate_versions!
    refute called
  end

  test 'a new upload detaches the record: other files copied to its own folder, then stored under its own id' do
    SiteMapUploader.storage :file # the suite never talks to S3 (as lock_accounts_test does for AvatarUploader)
    copies = []
    SharedSourceFiles.singleton_class.send(:alias_method, :copy_folder_orig, :copy_folder)
    SharedSourceFiles.singleton_class.send(:define_method, :copy_folder) { |src, dst, **| copies << [src, dst]; 1 }
    tmp = Tempfile.new(['new', '.svg'])
    tmp.write('<svg xmlns="http://www.w3.org/2000/svg"/>')
    tmp.rewind
    @clone.svg_image = Rack::Test::UploadedFile.new(tmp.path, 'image/svg+xml', original_filename: 'new.svg')
    assert @clone.svg_image.cached?
    @clone.svg_image.define_singleton_method(:store!) { |*| nil } # no S3 in the test suite
    @clone.save!(validate: false)
    assert_nil @clone.reload.file_source_id, 'detached'
    assert_equal [["uploads/floorplate/image/#{@source.id}/", "uploads/floorplate/image/#{@clone.id}/"]], copies, 'only the other shown file was copied'
    assert_equal "uploads/floorplate/svg_image/#{@clone.id}", @clone.svg_image.store_dir
    assert_match(/new\.svg\z/, @clone.read_attribute(:svg_image))
    assert_equal 'plan.svg', @source.reload.read_attribute(:svg_image), 'the source row is untouched'
  ensure
    SiteMapUploader.storage :fog
    SharedSourceFiles.singleton_class.send(:alias_method, :copy_folder, :copy_folder_orig)
  end

  test 'a plain save without an upload keeps the sharing' do
    @clone.update!(name: 'renamed clone plate')
    assert_equal @source.id, @clone.reload.file_source_id
  end
end
