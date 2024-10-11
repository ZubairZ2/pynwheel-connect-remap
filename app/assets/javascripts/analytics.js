let selectedProductType;

$(document).ready(function() {
  selectedProductType = $("#productTypeData").data("productType") || "touch";
  const filterSelect = $(".filter_select2");
  
  if (filterSelect.length > 0) {
    initializeSelect2Dropdowns(filterSelect);
    setupDateRangeFilter(minDateForSelfTour);
    showBreadcrumbInNoSidemenu();
  }

  bindTimeframeSelectionEvent();
  bindSelect2SelectionEvent(filterSelect);
  bindProductTypeTabChangeEvent();
  productTypeTabSelector();
});

function initializeSelect2Dropdowns(filterSelect) {
  filterSelect.select2({ width: 'resolve' });
}

function setupDateRangeFilter(minDate) {
  const startDate = moment($('#start_date').val());
  const endDate = moment($('#end_date').val());

  function updateDateRangeLabel(startDate, endDate) {
    $('.date_range_filter span').text(`${startDate.format('MMMM D, YYYY')} - ${endDate.format('MMMM D, YYYY')}`);
  }

  $('.date_range_filter').daterangepicker({
    startDate: startDate,
    endDate: endDate,
    minDate: new Date(minDate),
    maxDate: new Date(),
    ranges: {
      'Today': [moment(), moment()],
      'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
      'Last 7 Days': [moment().subtract(6, 'days'), moment()],
      'Last 30 Days': [moment().subtract(29, 'days'), moment()],
      'This Month': [moment().startOf('month'), moment().endOf('month')],
      'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
    }
  }, updateDateRangeLabel);

  updateDateRangeLabel(startDate, endDate);
}

function showBreadcrumbInNoSidemenu() {
  $('#no-sidemenu .breadcrumb').css({
    display: 'block',
    margin: '0px'
  });
}

function bindTimeframeSelectionEvent() {
  $('input[name="timeframe"]').on('apply.daterangepicker', updateUrlWithCurrentSelections);
}

function bindSelect2SelectionEvent(filterSelect) {
  filterSelect.on('select2:select', function(e) { 
    clearOtherSelectOptions(e.target.id);
    updateUrlWithCurrentSelections();
  });
}

function bindProductTypeTabChangeEvent() {
  $('#product_type_tabs a[data-toggle="tab"]').on('click', function() {
    selectedProductType = formatProductTypeText($(this).text());
    updateUrlWithProductType();
    updateUrlWithCurrentSelections();
  });
}

function productTypeTabSelector() {
  const tabMap = {
    pynwheel_tour: "#s-self-tour",
    maps: "#s-maps",
    touch: "#s-touch"
  };

  const selector = tabMap[selectedProductType]
  $(selector).addClass('active in');
}


function updateUrlWithProductType() {
  const currentUrl = new URL(window.location);
  currentUrl.searchParams.set("product_type", selectedProductType);
  window.history.pushState({}, "", currentUrl);
}

function formatProductTypeText(text) {
  return text.toLowerCase().replace(/\s+/g, '_');
}

function clearOtherSelectOptions(currentSelectId) {
  const selectIds = ["companies", "communities", "regions", "admin_type"];
  selectIds.forEach(selectId => {
    if (selectId !== currentSelectId) {
      $(`#${selectId}`).val("");
    }
  });
}

function updateUrlWithCurrentSelections() {
  const params = {
    community: $('#communities').val(),
    timeframe: $('#timeframe').val(),
    company: $('#companies').val(),
    region: $('#regions').val(),
    admin_type: $('#admin_type').val(),
    product_type: selectedProductType
  };

  const newUrl = constructUrlWithParams(params);
  window.location.href = newUrl;
}

function constructUrlWithParams(params) {
  const baseUrl = `${window.location.origin}${window.location.pathname}?`;

  const urlParams = Object.entries(params).reduce((accumulatedParams, [key, value]) => {
    if (value) {
      if (key === "timeframe") {
        const [startDate, endDate] = value.split('-').map(date => date.trim());
        accumulatedParams.push(`start_date=${startDate}`, `end_date=${endDate}`);
      } else {
        accumulatedParams.push(`${key}=${value}`);
      }
    }
    return accumulatedParams;
  }, []).join("&");

  return `${baseUrl}${urlParams}`;
}

window.addEventListener("beforeunload", function(event) {
  $(".divLoading").removeClass("hidden");
});

window.addEventListener('load', function() {
  $(".divLoading").addClass("hidden");
});