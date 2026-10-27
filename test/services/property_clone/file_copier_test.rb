require 'test_helper'

class PropertyClone::FileCopierTest < ActiveSupport::TestCase
  # A fake S3 client: list / head / copy on an in-memory key set.
  class FakeS3
    Resp = Struct.new(:contents, :is_truncated, :next_continuation_token)
    Obj = Struct.new(:key)
    attr_reader :keys, :copies

    def initialize(keys)
      @keys = keys.to_set
      @copies = []
    end

    def list_objects_v2(bucket:, prefix:, continuation_token: nil)
      Resp.new(@keys.select { |k| k.start_with?(prefix) }.sort.map { |k| Obj.new(k) }, false, nil)
    end

    def head_object(bucket:, key:)
      raise Aws::S3::Errors::NotFound.new(nil, 'missing') unless @keys.include?(key)

      true
    end

    def copy_object(bucket:, copy_source:, key:)
      src = copy_source.sub("#{bucket}/", '')
      raise 'source missing' unless @keys.include?(src)

      @keys << key
      @copies << [src, key]
    end
  end

  test 'plans one folder per uploader column with a value and copies it under the clone id, rewriting *_url columns' do
    source = communities(:tour_property)
    plate = floorplates(:plate_a)
    plate.update_columns(image: 'plate.png', standard_image_url: "https://bucket.s3.amazonaws.com/uploads/floorplate/image/#{plate.id}/plate.png", svg_image_url: nil)
    plan = PropertyClone::Plan.new(source.id).resolve!
    entries = PropertyClone::FileCopier.plan(plan)
    plate_entry = entries.find { |e| e.table == 'floorplates' && e.source_id == plate.id && e.mount == 'image' }
    assert plate_entry, 'the floorplate image is planned'
    assert_equal "uploads/floorplate/image/#{plate.id}/", plate_entry.source_prefix
    assert_equal 'PLANNED', plate_entry.status

    id_map = PropertyClone::IdMap.new
    clone_plate = Floorplate.new(name: 'clone plate', community: source, number: 9, range: '9')
    clone_plate.save!(validate: false)
    clone_plate.update_columns(standard_image_url: plate.standard_image_url)
    id_map.set('floorplates', plate.id, clone_plate.id)
    entries = PropertyClone::FileCopier.plan(plan, id_map).select { |e| e.table == 'floorplates' && e.source_id == plate.id }
    assert_equal "uploads/floorplate/image/#{clone_plate.id}/", entries.first.clone_prefix

    s3 = FakeS3.new(["uploads/floorplate/image/#{plate.id}/plate.png", "uploads/floorplate/image/#{plate.id}/thumb_plate.png", "uploads/floorplate/image/#{clone_plate.id}/thumb_plate.png", 'uploads/floorplate/image/999/other.png'])
    copier = PropertyClone::FileCopier.new(entries, bucket: 'b', client: s3, plan: plan).run!
    entry = copier.entries.first
    assert_equal 'COPIED', entry.status
    assert_equal [["uploads/floorplate/image/#{plate.id}/plate.png", "uploads/floorplate/image/#{clone_plate.id}/plate.png"]], s3.copies, 'only the missing object is copied; the existing one is left'
    assert_equal 2, entry.objects.size
    refute entry.objects.find { |o| o['key'].end_with?('thumb_plate.png') }['copied']
    assert_includes s3.keys, "uploads/floorplate/image/#{plate.id}/plate.png", 'the source object is still there'
    assert_equal "https://bucket.s3.amazonaws.com/uploads/floorplate/image/#{clone_plate.id}/plate.png", clone_plate.reload.standard_image_url
    assert_equal "https://bucket.s3.amazonaws.com/uploads/floorplate/image/#{plate.id}/plate.png", plate.reload.standard_image_url, 'the source url is untouched'
    assert_equal 1, copier.summary['objects_copied']
  end

  test 'a folder without objects on S3 is reported, not failed' do
    source = communities(:tour_property)
    floorplates(:plate_b).update_columns(image: 'missing.png')
    plan = PropertyClone::Plan.new(source.id).resolve!
    id_map = PropertyClone::IdMap.new
    id_map.set('floorplates', floorplates(:plate_b).id, 424_242)
    entries = PropertyClone::FileCopier.plan(plan, id_map).select { |e| e.source_id == floorplates(:plate_b).id }
    copier = PropertyClone::FileCopier.new(entries, bucket: 'b', client: FakeS3.new([]), plan: plan).run!
    assert_equal 'MISSING_SOURCE', copier.entries.first.status
  end
end
