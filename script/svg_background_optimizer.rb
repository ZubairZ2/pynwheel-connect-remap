#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Standalone experiment tool — NOT wired into the Rails app, S3, or any
# model. Thin CLI wrapper around SvgBackgroundOptimizerService (the same
# service the admin "SVG Optimizer" tool page uses) so the exact same
# logic can be batch-tested from the command line against real files
# before/independent of using the web UI.
#
# Usage:
#   bundle exec ruby script/svg_background_optimizer.rb path/to/file.svg [path2.svg ...]
#   bundle exec ruby script/svg_background_optimizer.rb path/to/folder --out tmp/svg_opt
#
# Options:
#   --out DIR          output directory (default: tmp/svg_optimizer_out)
#   --threshold-kb N   skip images whose decoded size is below N KB (default: 40)
#   --quality Q        WebP quality 1-100 (default: 82)
#   --dry-run          report only, write nothing

require "mini_magick"
require "base64"
require "json"
require "fileutils"
require "optparse"
require "tmpdir"
require_relative "../app/services/svg_background_optimizer_service"

Options = Struct.new(:out_dir, :threshold_kb, :quality, :dry_run)

def parse_options(argv)
  opts = Options.new("tmp/svg_optimizer_out", SvgBackgroundOptimizerService::DEFAULT_THRESHOLD_KB,
                      SvgBackgroundOptimizerService::DEFAULT_QUALITY, false)
  parser = OptionParser.new do |o|
    o.banner = "Usage: svg_background_optimizer.rb [options] file_or_dir [file_or_dir ...]"
    o.on("--out DIR", "Output directory") { |v| opts.out_dir = v }
    o.on("--threshold-kb N", Integer, "Skip images smaller than N KB decoded") { |v| opts.threshold_kb = v }
    o.on("--quality Q", Integer, "WebP quality 1-100") { |v| opts.quality = v }
    o.on("--dry-run", "Report only, write nothing") { opts.dry_run = true }
  end
  paths = parser.parse!(argv)
  abort parser.help if paths.empty?
  [opts, paths]
end

def expand_svg_paths(paths)
  paths.flat_map do |p|
    if File.directory?(p)
      Dir.glob(File.join(p, "**", "*.svg"))
    else
      [p]
    end
  end.sort
end

def process_file(svg_path, opts)
  raw_text = File.read(svg_path)
  result = SvgBackgroundOptimizerService.call(raw_text, threshold_kb: opts.threshold_kb, quality: opts.quality)

  basename = File.basename(svg_path, ".svg")
  out_subdir = File.join(opts.out_dir, basename)

  unless opts.dry_run
    FileUtils.mkdir_p(out_subdir)

    optimized_path = File.join(out_subdir, "#{basename}_optimized.svg")
    File.write(optimized_path, result[:optimized_svg])

    report_path = File.join(out_subdir, "#{basename}_report.json")
    File.write(report_path, JSON.pretty_generate(result.reject { |k, _| k == :optimized_svg }))

    result[:optimized_path] = optimized_path
  end

  result[:file] = svg_path
  result
end

def print_summary(report)
  puts "\n== #{report[:file]} =="
  puts "  original:  #{(report[:original_bytes] / 1024.0).round(1)} KB"
  puts "  optimized: #{(report[:optimized_bytes] / 1024.0).round(1)} KB (-#{report[:reduction_pct]}%)"
  report[:images].each do |img|
    label = "  [image #{img[:index]}] id=#{img[:id] || '-'} name=#{img[:data_name] || '-'} " \
            "#{img[:declared_width]}x#{img[:declared_height]} mime=#{img[:mime]} decoded=#{img[:decoded_kb]}KB"
    case img[:action]
    when "skipped_below_threshold"
      puts "#{label} -> skipped (below threshold)"
    when "optimized"
      puts "#{label} -> webp #{img[:webp_kb]}KB (-#{img[:reduction_pct]}%)"
    when "failed"
      puts "#{label} -> FAILED: #{img[:error]}"
    end
  end
  report[:notes].each { |n| puts "  note: #{n}" }
  puts "  written to: #{report[:optimized_path]}" if report[:optimized_path]
end

if __FILE__ == $PROGRAM_NAME
  opts, input_paths = parse_options(ARGV)
  svg_paths = expand_svg_paths(input_paths)
  abort "No .svg files found in #{input_paths.inspect}" if svg_paths.empty?

  FileUtils.mkdir_p(opts.out_dir) unless opts.dry_run

  svg_paths.each do |path|
    begin
      report = process_file(path, opts)
      print_summary(report)
    rescue StandardError => e
      puts "\n== #{path} =="
      puts "  FAILED to process file: #{e.class}: #{e.message}"
    end
  end
end
