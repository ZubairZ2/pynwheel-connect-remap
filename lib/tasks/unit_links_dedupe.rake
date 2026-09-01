# Finds — and optionally clears — units whose three "Buttons & links" slots point
# at the same place twice.
#
#   rake unit_links:dedupe[935]              # report only, writes nothing
#   rake unit_links:dedupe[935,apply_safe]   # clear only provably identical links
#   rake unit_links:dedupe[935,apply]        # clear every duplicate middle button
#   rake unit_links:dedupe[935,apply_labels] # across ALL THREE slots, keep one button
#                                            # per action and clear the rest, judged by
#                                            # label alone — the end state is one
#                                            # "Apply Now" and one "Schedule a Tour"
#
# Generic on purpose: it takes any company id and judges duplication by URL, not
# by label. Labels are useless as a signal here — the same action shows up as
# "Apply Now", "APPLY NOW" and "Tour Now" across this data, and the map
# uppercases every label in CSS anyway, so what a person sees on screen says
# nothing about what is stored.
#
# Four kinds of duplicate, reported separately because they carry different risk:
#
#   exact         — the two slots hold the same URL. Removing one loses nothing.
#   same_resource — different URLs that provably address the SAME thing: the same
#                 Boom application token in two URL shapes
#                 (/a/<token> vs /auth/sign-in?token=<token>), or the same Rently
#                 property id on two of their hosts (secure. vs homes.). Removing
#                 one loses nothing either, which is why apply_safe includes it.
#   same_target — different URLs on the same host that do NOT share an id (two
#                 genuinely distinct Boom applications). Removing one discards a
#                 URL nothing else records.
#   same_label  — the two slots carry the same label ignoring case and spacing
#                 ("APPLY NOW" vs "Apply Now"), whatever the URLs are. Beware:
#                 this catches mislabelling as readily as duplication — a Rently
#                 link captioned "APPLY NOW" lands here, and clearing it removes
#                 a link that is not a duplicate at all.
#
# A pair is classified once, strongest signal first: exact, same_resource,
# same_target, same_label.
#
# Cleanup only ever clears the middle button (additional_button/additional_url).
# Buttons 1 and 3 are the ones RenuUnitLinksSyncService owns and can rebuild from
# the sheet; the middle one it never writes, so that is the safe copy to drop.
namespace :unit_links do
  desc "Report (or clear, with 'apply_safe'/'apply') duplicate unit button links for a company (args: company_id[,apply_safe|apply])"
  task :dedupe, [:company_id, :mode] => :environment do |_task, args|
    company_id = args[:company_id].presence or abort("company_id is required — rake unit_links:dedupe[935]")
    mode = args[:mode].to_s
    abort("mode must be apply_safe, apply or apply_labels") unless ["", "apply_safe", "apply", "apply_labels"].include?(mode)


    company = Company.find_by(id: company_id) or abort("no company with id=#{company_id}")
    community_ids = company.communities.select(:id)

    # slot name => [url column, label column]
    slots = { "button1" => [:virtual_tour_url, :virtual_tour_button_label],
              "button2" => [:additional_url,   :additional_button],
              "button3" => [:scheduler_url,    :scheduler_label] }
    pairs = slots.keys.combination(2).to_a

    # Trailing slashes and casing differ between hand-entered and imported links
    # often enough that comparing raw strings under-reports badly.
    normalize = ->(url) { url.to_s.strip.downcase.sub(%r{/+\z}, "").presence }
    host      = ->(url) { URI.parse(url).host&.downcase rescue nil }
    # "APPLY NOW", "Apply Now" and "apply  now" are one label as far as a reader
    # looking at two identical buttons is concerned.
    label     = ->(text) { text.to_s.strip.downcase.gsub(/\s+/, " ").presence }

    # The id a URL addresses, vendor-qualified, so the same application or
    # listing is recognised across the several URL shapes each vendor emits.
    # Returns nil for anything we cannot identify, which simply means the pair
    # falls through to the weaker host/label signals.
    resource = lambda do |url|
      base = host.call(url).to_s.split(".").last(2).join(".")
      id = case base
           when "boompay.app" then url[%r{/a/([A-Za-z0-9_-]+)}, 1] || url[/[?&]token=([A-Za-z0-9_-]+)/, 1]
           when "rently.com"  then url[%r{/properties/(\d+)}, 1]
           end
      "#{base}:#{id}" if id
    end

    # apply_labels is an editorial rule rather than a duplicate test: a unit should
    # offer each action ONCE. It reads every slot's label, groups the slots by the
    # action the label advertises, and where an action occupies more than one slot
    # it keeps the canonical one and clears the others — whatever the URLs are.
    #
    # Substring matching on a downcased label is what catches the whole spread of
    # hand-entered wordings at once: "APPLY NOW", "Apply Now", "SCHEDULE A TOUR",
    # "Schedule A Tour", "Tour Now". A label matching nothing ("View Floor Plan")
    # has no action and is never touched.
    #
    # Canonical slot per action is the one RenuUnitLinksSyncService writes, so a
    # re-sync re-affirms the survivor instead of fighting this task.
    action_of = lambda do |text|
      normalized = label.call(text)
      next nil if normalized.nil?

      if normalized.include?("apply") then :apply
      elsif normalized.include?("schedule") || normalized.include?("tour") then :schedule
      end
    end
    canonical = { apply: "button1", schedule: "button3" }.freeze
    toggles   = { "button1" => :link1_open_new_tab,
                  "button2" => :link2_open_new_tab,
                  "button3" => :link3_open_new_tab }.freeze

    columns = [:id, :marketing_name] + slots.values.flatten
    scope = Unit.where(community_id: community_ids)
                .where("COALESCE(units.virtual_tour_url, '') <> '' OR " \
                       "COALESCE(units.additional_url, '')   <> '' OR " \
                       "COALESCE(units.scheduler_url, '')    <> ''")

    findings = Hash.new { |h, k| h[k] = [] }
    scanned = 0

    scope.in_batches(of: 2_000) do |batch|
      batch.pluck(*columns).each do |row|
        unit = columns.zip(row).to_h
        scanned += 1

        pairs.each do |left, right|
          a = normalize.call(unit[slots[left][0]])
          b = normalize.call(unit[slots[right][0]])
          next if a.nil? || b.nil?

          la, lb = label.call(unit[slots[left][1]]), label.call(unit[slots[right][1]])
          ha, hb = host.call(a), host.call(b)

          ra, rb = resource.call(a), resource.call(b)

          kind = if a == b
                   :exact
                 elsif ra && ra == rb
                   :same_resource
                 elsif ha && ha == hb
                   :same_target
                 elsif la && la == lb
                   :same_label
                 end
          next if kind.nil?

          findings[[kind, left, right]] << unit
        end
      end
    end

    puts "company #{company.id} (#{company.name}) — #{company.communities.count} communities, #{scanned} units with at least one link"
    if findings.empty?
      puts "no duplicate button links"
      next
    end

    puts
    order = { exact: 0, same_resource: 1, same_target: 2, same_label: 3 }
    findings.sort_by { |(kind, _, _), units| [order[kind], -units.size] }.each do |(kind, left, right), units|
      puts format("  %-12s %s <-> %s  units=%d", kind, left, right, units.size)
      if kind != :exact
        units.first(3).each do |unit|
          puts format("      e.g. unit=%s %s", unit[:id], unit[:marketing_name])
          [left, right].each do |slot|
            puts format("           %-8s %-20s %s", slot, unit[slots[slot][1]].inspect, unit[slots[slot][0]])
          end
        end
      end
    end

    # Only the middle button is ever cleared, and only where it duplicates one of
    # the two slots the sheet owns.
    # apply_exact deliberately skips :same_target, where the two URLs differ and
    # dropping one throws away a link nothing else records.
    button2_of = lambda do |kinds|
      findings.select { |(kind, left, right), _| kinds.include?(kind) && [left, right].include?("button2") }
              .values.flatten.uniq { |unit| unit[:id] }
    end

    safe_kinds = [:exact, :same_resource]
    all_kinds  = [:exact, :same_resource, :same_target, :same_label]
    puts
    puts "button2 clearable — apply_safe (#{safe_kinds.join(' + ')}): #{button2_of.call(safe_kinds).size}"
    puts "button2 clearable — apply      (all four kinds):          #{button2_of.call(all_kinds).size}"

    if mode.empty?
      puts "report only — re-run with rake \"unit_links:dedupe[#{company_id},apply_safe]\" " \
           "or [#{company_id},apply]"
      next
    end

    if mode == "apply_labels"
      pending = Hash.new { |hash, slots_to_clear| hash[slots_to_clear] = [] }
      summary = Hash.new(0)

      scope.in_batches(of: 2_000) do |batch|
        batch.pluck(*columns).each do |row|
          unit = columns.zip(row).to_h

          # Which slots currently advertise which action. A slot with no URL is
          # already empty, so there is nothing there to clear.
          by_action = Hash.new { |hash, key| hash[key] = [] }
          slots.each_key do |slot|
            next if normalize.call(unit[slots[slot][0]]).nil?

            action = action_of.call(unit[slots[slot][1]])
            by_action[action] << slot if action
          end

          drop = by_action.flat_map do |action, occupied|
            next [] if occupied.size < 2

            # Prefer the slot the sync owns; otherwise keep the first in slot order
            # so a unit never loses an action entirely.
            keep = occupied.include?(canonical[action]) ? canonical[action] : occupied.first
            summary["#{action}: kept #{keep}, cleared #{(occupied - [keep]).join(',')}"] += 1
            occupied - [keep]
          end
          next if drop.empty?

          pending[drop.sort] << unit[:id]
        end
      end

      if pending.empty?
        puts
        puts "no unit advertises the same action twice — nothing to clear"
        next
      end

      puts
      puts "duplicate actions across all three slots:"
      summary.sort_by { |_, n| -n }.each { |line, n| puts "    #{line} => #{n}" }

      cleared = 0
      pending.each do |slots_to_clear, unit_ids|
        attrs = slots_to_clear.each_with_object({}) do |slot, acc|
          acc[slots[slot][0]] = nil          # url
          acc[slots[slot][1]] = nil          # label
          acc[toggles[slot]]  = false        # open-in-new-tab for that slot
        end
        attrs[:updated_at] = Time.current

        unit_ids.each_slice(1_000) do |slice|
          cleared += Unit.where(id: slice).update_all(attrs)
        end
        puts "    cleared #{slots_to_clear.join(',')} on #{unit_ids.size} units"
      end
      puts "cleared=#{cleared}"
      next
    end

    clearable = button2_of.call(mode == "apply" ? all_kinds : safe_kinds)

    ids = clearable.map { |unit| unit[:id] }
    cleared = ids.each_slice(1_000).sum do |slice|
      Unit.where(id: slice).update_all(additional_button: nil, additional_url: nil,
                                       link2_open_new_tab: false, updated_at: Time.current)
    end
    puts "cleared=#{cleared}"
  end
end
