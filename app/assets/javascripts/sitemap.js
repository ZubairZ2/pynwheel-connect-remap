var imageOCRResponse = [];
var ocrImageDimensions;

$(document).ready(function () { 
  if ($('.is-sitemap')[0]) {
    $("#map, #svg_map").css('cursor', 'default');
    imageOCRResponse = $("#ocrData").data("ocrData");
    ocrImageDimensions = $("#ocrData").data("imageDimensions");

    doDraggable();

    $('.amenities-list').multiSelect();
    $('.amenities-list-on-popup').multiSelect();

    if ($("#sitemap-image-upload-holder").length) {
      saveSiteMapImage();
    }
    if ($("#sitemap-svg-upload-holder").length) {
      saveSiteMapSvg();
    }
  }
});

function saveSiteMapImage() {
  const siteMapImageDropzone = new Dropzone("#sitemap-image-upload-holder", {url: "/communities/" + community_id + "/sitemaps/" + sitemap_id + "/save_sitemap_image"});
  Dropzone.options.siteMapImageDropzone = {
    uploadMultiple: true
  };

  siteMapImageDropzone.on("complete", function (file) {
    console.log(file);
    location.reload();
  });

  siteMapImageDropzone.on("addedfile", function (file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      $(".divLoading").addClass("hidden");
      $('#image-upload-warning').modal('show');
      siteMapImageDropzone.removeFile(file);
    }
  });
}

function saveSiteMapSvg() {
  const siteMapSvgDropzone = new Dropzone("#sitemap-svg-upload-holder", {url: "/communities/" + community_id + "/sitemaps/" + sitemap_id + "/save_sitemap_svg"});
  Dropzone.options.siteMapSvgDropzone = {
    uploadMultiple: true
  };

  siteMapSvgDropzone.on("complete", function (file) {
    console.log(file);
    location.reload();
  });

  siteMapSvgDropzone.on("addedfile", function (file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (file.type !== "image/svg+xml") {
      $(".divLoading").addClass("hidden");
      $('#svg-upload-warning').modal('show');
      siteMapSvgDropzone.removeFile(file);
    }
  });
}


function start_access_point_plot(event){
    accesspointplot = true
    selected = [null]
    plotMode()

    $(".multi-select-units").css({"pointer-events": "none"})
    $("#map").css('cursor', 'crosshair')
    $("<div id='overlay'></div>").css({
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0,
      background: "#000000",
      opacity: 0.5
    }).appendTo($(".multi-select-units").css("position", "relative"));
}

function sitemap_goBack() {
  $('.apartment-settings-form').submit();
  if (window.history.length == 1) {
    window.location.reload();
  } else {
    window.history.back();
  }
}
