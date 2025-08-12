$(document).ready(function (e) {
  ////////// Custom Code for Neighborhood Categories Multi Select starts here //////////
  $("body").on("click", function (e) {
    $("#multiselect").hide();
  });

  $("body").on("click", ".multiselect", function (e) {
    $("#multiselect").toggle();
    e.stopPropagation();
  });

  $(".imageselect").on("click", function (e) {
    const $scope = $(e.currentTarget).closest(".multi-select-units");
    const $selectedUnits = $scope.find("#selected-units").children();

    if ($selectedUnits.length)
      $selectedUnits.addClass("blink_me").css("color", "red");
    else $scope.find("#imageselect").toggle();

    e.stopPropagation();
  });

  $("body").on("click", ".amenity-imageselect", function (e) {
    $("#imageselect1").toggle();
    e.stopPropagation();
  });

  $("body").on("click", ".unit-imageselect", function (e) {
    $("#imageselect2").toggle();
    e.stopPropagation();
  });

  $("body").on("click", ".elevator-imageselect", function (e) {
    $("#imageselect3").toggle();
    e.stopPropagation();
  });

  $(".loader_class").click(function (e) {
    $(".divLoading").removeClass("hidden");
  });

  $("#multiselect li").click(function (e) {
    if ($(this).hasClass("active")) {
      $(this).removeClass("active");
    } else {
      $(this).addClass("active");
    }
    //$("#categories_field").val('Dining,Parks')
    populate_multiselect();
    e.stopPropagation();
  });

  ////////// Custom Code for Neighborhood Categories Multi Select ends here //////////

  $(".preview-image, preview-svg").click(function (event) {
    event.preventDefault();
    $(this).ekkoLightbox({
      alwaysShowClose: true,
    });
  });

  $("#publish_changes").click(function (event) {
    $(".modal_screen1").removeClass("hidden");
    $(".modal_next_button1").removeClass("hidden");
    $("#publish-changes-model").modal("show");
  });

  $(".publish_changes_btn1").click(function (event) {
    $(".modal_screen1").addClass("hidden");
    $(".modal_next_button1").addClass("hidden");
    $(".modal_screen2").removeClass("hidden");
    $(".modal_next_button2").removeClass("hidden");
  });

  $(".publish_changes_btn2").click(function (event) {
    $(".modal_screen2").addClass("hidden");
    $(".modal_next_button2").addClass("hidden");
    $(".modal_screen3").removeClass("hidden");
    $(".modal_next_button3").removeClass("hidden");
  });

  $(".publish_changes_btn3").click(function (event) {
    $(".modal_screen3").addClass("hidden");
    $(".modal_next_button3").addClass("hidden");
    $(".modal_screen4").removeClass("hidden");
    $(".modal_next_button4").removeClass("hidden");
  });

  $(".publish_changes_btn4").click(function (event) {
    $(".modal_screen4").addClass("hidden");
    $(".modal_next_button4").addClass("hidden");
    $(".modal_screen5").removeClass("hidden");
    $(".modal_next_button5").removeClass("hidden");
  });

  $(".publish_changes_btn5").click(function (event) {
    $(".modal_screen5").addClass("hidden");
    $(".modal_next_button5").addClass("hidden");
  });
  //validates form
  $("form").validationEngine({ binded: false });
  /* Activating Best In Place */
  jQuery(".best_in_place").best_in_place();

  /*color picker*/
  $("#rgba-format-colorpicker")
    .colorpicker({ format: "rgba" })
    .on("create", function (event) {
      $("#c-style-background-color-text-field").val(background_color);
    })
    .on("changeColor", function (event) {
      if (typeof event.value !== "undefined") {
        var rgba_color = rgbaToHex(event.value);
        console.log(rgba_color);
        $("#c-style-background-color-text-field").val(rgba_color);
      }
    });
  $(".hex-format-colorpicker").colorpicker({ format: "hex" });

  showDataTables();

  var data_provider = $("#community_data_provider").val();
  selectDataProvider(data_provider);

  $("#community_data_provider").change(function () {
    selectDataProvider($(this).val());
  });

  //below code is populating images on floorplans right panel
  $("#mutiple-files").change(function () {
    var files = $(this).prop("files");
    for (var i = 0; i < files.length; i++) {
      if (
        files[i].type == "image/png" ||
        files[i].type == "image/jpeg" ||
        files[i].type == "image/jpg"
      ) {
        readImageSrc(files[i]);
      }
    }
    if (files.length == 1) {
      if (
        files[0].type !== "image/png" &&
        files[0].type !== "image/jpeg" &&
        files[0].type !== "image/jpg"
      ) {
        $("#image-upload-warning").modal("show");
      }
    }
    $("#mutiple-files").val("");
  });

  var headertext = [],
    headers = document.querySelectorAll("#miyazaki th"),
    tablerows = document.querySelectorAll("#miyazaki th"),
    tablebody = document.querySelector("#miyazaki tbody");

  for (var i = 0; i < headers.length; i++) {
    var current = headers[i];
    headertext.push(current.textContent.replace(/\r?\n|\r/, ""));
  }
  if (tablebody != null) {
    for (var i = 0, row; (row = tablebody.rows[i]); i++) {
      for (var j = 0, col; (col = row.cells[j]); j++) {
        col.setAttribute("data-th", headertext[j]);
      }
    }
  }
  // TO DO I am commenting this code because tabs are not working ion design page
  /*$("li").on("click", function (e) {
              $(this).siblings(".active" ).removeClass("active")
              $(this).addClass("active")
          })*/

  $(
    "#company_logo,#community_logo,#user_avatar,#amenity_image,#unit_image"
  ).change(function () {
    readURL(this);
  });

  $(".import_data").on("click", function (e) {
    $(".divLoading").removeClass("hidden");
  });

  timeoutId = setTimeout(function () {
    $(".alert").fadeOut("slow");
  }, 10000); // <-- time in milliseconds

  //below code have drag n drop functionality.
  var holder = document.getElementById("holder");
  if (holder) {
    //holder.ondragover = function () { this.className = 'hover'; return false; };
    //holder.ondragend = function () { this.className = ''; return false; };
    holder.ondrop = function (e) {
      if (e.dataTransfer.files.length > 0) {
        this.className = "";
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files.length > 0) {
          for (var i = 0; i < files.length; i++) {
            if (
              files[i].type == "image/png" ||
              files[i].type == "image/jpeg" ||
              files[i].type == "image/jpg" ||
              files[i].type == "image/svg" ||
              files[i].type == "image/svg+xml"
            ) {
              readImageSrc(files[i]);
            } else {
              $("#image-upload-warning").modal("show");
            }
          }
        } else {
          //var img = e.dataTransfer.mozSourceNode;
          var floorplan_id = $(draging_image).parent().attr("id");
          var id = $(draging_image).attr("id");
          id = id.split("-");
          $("#row" + id[1]).show();
          console.log("ok");
          $("#parent-" + id[1]).append($(draging_image));
          deleteFloorPlanImage(
            floorplan_id,
            $(draging_image).attr("src"),
            id[1],
            $("#img-name-" + id[1]).html()
          );
        }
      }
    };
  }

  // below lines prevent image on broswer other than selected area
  window.addEventListener(
    "dragover",
    function (e) {
      e = e || event;
      e.preventDefault();
    },
    false
  );

  window.addEventListener(
    "drop",
    function (e) {
      e = e || event;
      e.preventDefault();
    },
    false
  );

  //below lines change href on delete anchor tag in delete bootstrap modal

  $("#confirm-delete").on("show.bs.modal", function (e) {
    $(this).find(".btn-ok").attr("href", $(e.relatedTarget).data("href"));
    $(this)
      .find("#record-name")
      .html("Delete " + $(e.relatedTarget).data("name"));
    $(this)
      .find("#record-message")
      .html(
        "Are you sure you want to delete this " +
        $(e.relatedTarget).data("name") +
        "?"
      );
  });
  $("#ajax-confirm-delete").on("show.bs.modal", function (e) {
    $(this)
      .find("#record-name")
      .html("Delete " + $(e.relatedTarget).data("name"));
    $(this)
      .find("#record-message")
      .html(
        "Are you sure you want to delete this " +
        $(e.relatedTarget).data("name") +
        "?"
      );
    $(this)
      .find(".ajax-btn-delete")
      .attr("data-href", $(e.relatedTarget).data("href"));
    $(this)
      .find(".ajax-btn-delete")
      .attr(
        "data-plotted-category",
        $(e.relatedTarget).data("plotted-category")
      );
  });
  $("#confirm-delete-visitor").on("show.bs.modal", function (e) {
    $(this)
      .find(".btn-ok-visitor")
      .attr("href", $(e.relatedTarget).data("href"));
    $(this)
      .find("#record-name-visitor")
      .html("Delete " + $(e.relatedTarget).data("name"));
    $(this)
      .find("#record-message-visitor")
      .html(
        "Are you sure you want to delete this " +
        $(e.relatedTarget).data("name") +
        "?" +
        " This cannot be undone."
      );
  });
  $("#confirm-reset-verification").on("show.bs.modal", function (e) {
    $(this)
      .find(".btn-ok-visitor")
      .attr("href", $(e.relatedTarget).data("href"));
    $(this)
      .find("#record-name-visitor")
      .html("Reset " + $(e.relatedTarget).data("name"));
    $(this)
      .find("#record-message-visitor")
      .html(
        "Are you sure you want to reset this " +
        $(e.relatedTarget).data("name") +
        "?" +
        " This cannot be undone."
      );
  });
  $("#confirm-delete_amenity").on("show.bs.modal", function (e) {
    $(this)
      .find(".btn-ok-amenity")
      .attr("href", $(e.relatedTarget).data("href") + "/remove_amenity");

    var community = $(e.relatedTarget).data("href").split("/")[2];
    var amenity = $(e.relatedTarget).data("href").split("/")[6];
    var unit = $(e.relatedTarget).data("href").split("/")[4];

    $(this)
      .find(".edit_unit_amenity")
      .attr(
        "href",
        "/communities/" +
        community +
        "/amenities/" +
        amenity +
        "/edit?from=unit&unit=" +
        unit
      );
    $(this)
      .find(".add_description_amenity")
      .attr("href", $(e.relatedTarget).data("href") + "/save_description");
    $(this)
      .find("#delete_button_amenity")
      .attr("href", $(e.relatedTarget).data("href") + "/delete_unit_plot");
    $(this).find("#description_amenity").val($(e.relatedTarget).data("name"));
    $(this).find("#record-name-amenity").html("Update Amenity");
    $(this)
      .find("#record-message-amenity")
      .html(
        "Are you sure you want to delete this " +
        $(e.relatedTarget).data("name") +
        "?"
      );
  });
  $(".add_description_amenity").on("click", function (e) {
    $(".add_description_amenity").attr(
      "href",
      $(".add_description_amenity").attr("href") +
      "?description=" +
      $("#description_amenity").val()
    );
    // alert($('.add_description_amenity').attr('href')+'?description='+$('#description_amenity').val());
    // $(this).find('#tee').html( $('.add_description_amenity').data('href'));
  });
  $("#confirm-delete-replace-data").on("show.bs.modal", function (e) {
    $(this)
      .find(".replace-btn-ok")
      .attr("href", $(e.relatedTarget).data("href"));
    $(this)
      .find("#replace-record-name")
      .html("Delete " + $(e.relatedTarget).data("name"));
    $(this)
      .find("#replace-record-message")
      .html(
        "Are you sure you want to delete the previous data? This will wipe out any data connected to the community map and floor plan gallery."
      );
  });
  $("#confirm-delete-update-data").on("show.bs.modal", function (e) {
    $(this)
      .find(".update-btn-ok")
      .attr("href", $(e.relatedTarget).data("href"));
    $(this).find("#update-record-name").html($(e.relatedTarget).data("name"));
    $(this)
      .find("#update-record-message")
      .html(
        "Are you sure you want to replace the previously uploaded data with the data you are uploading now?"
      );
  });
  $("#confirm-delete-gallery").on("show.bs.modal", function (e) {
    $(this)
      .find(".btn-ok-gallery")
      .attr("href", $(e.relatedTarget).data("href"));
    $(this).find("#record-name-gallery").html($(e.relatedTarget).data("name"));
    $(this)
      .find("#record-message-gallery")
      .html(
        "Are you sure you want to delete this gallery? This cannot be undone."
      );
  });

  $("#configurations-modal").on("show.bs.modal", function (e) {
    $(this).find("#modal-title").html($(e.relatedTarget).attr("title"));
  });
  $(".submit-click").click(function () {
    $(".map-configurations-alert").removeClass("hidden");
    setTimeout(() => {
      $(".map-configurations-alert").addClass("hidden");
      $("#configurations-modal").modal("hide");
    }, 3000);
  });
});

function bindPlottingEvents() {
  $("#markers-modal, #svg-markers-modal").on("show.bs.modal", function (e) {
    const $this = $(this);
    const relatedTarget = e.relatedTarget;
    const $relatedTarget = $(relatedTarget);
    const unitProviderId = $relatedTarget.data("provider-unit-id").toString();
    const isSvgModal = this.id === "svg-markers-modal";
    let $sameHiddenUnits = null;

    console.log("Displaying plotted unit information in markers modal");

    const $unitButtons = $this.find(".unit-buttons");
    $unitButtons.empty();

    if (isSvgModal) {
      const { x_plot, y_plot, tag, id, selector } =
        $relatedTarget.data("pointer-data");

      $this.find("#pointer_x_plot").val(x_plot);
      $this.find("#pointer_y_plot").val(y_plot);
      $this.find("#pointer_tag").val(tag);
      $this.find("#pointer_id").val(id);
      $this.find("#pointer_selector").val(selector);
      $this.find("#horizontal_position").val(x_plot);
      $this.find("#vertical_position").val(y_plot);

      $sameHiddenUnits = $(".svg-h-" + x_plot + "-" + y_plot);
    } else {
      const xPlot = $relatedTarget.data("horizontal");
      const yPlot = $relatedTarget.data("vertical");

      $this.find("#horizontal_position").val(xPlot);
      $this.find("#vertical_position").val(yPlot);

      $sameHiddenUnits = $(".h-" + xPlot + "-" + yPlot);
    }

    if ($sameHiddenUnits.length > 1) {
      $sameHiddenUnits.each(function () {
        console.log("CLick on marker for deleting or updating");
        const $hiddenUnit = $(this);
        const underneathUnitId = $hiddenUnit.attr("id").replace("h-", "");

        $unitButtons.append(
          getButtonHtml(
            $hiddenUnit.data(),
            underneathUnitId === unitProviderId ? "btn-primary" : "btn-default",
            isSvgModal
          )
        );
      });
    }

    $this
      .find("#u-name")
      .html($relatedTarget.attr("title") || $relatedTarget.data("title"));
    $this.find(".delete-marker-ok").attr("href", $relatedTarget.data("href"));
    $this.find("form").attr("action", $relatedTarget.data("unit-form-url"));
  });

  $(
    ".select-units-on-svg .ms-elem-selectable, .select-units-on-page .ms-elem-selectable"
  ).on("click", function (e) {
    console.log($(this).children("span").text());
    const $scope = $(e.currentTarget).closest(".multi-select-units");
    const selectedForSvg = !!$scope.hasClass("select-units-on-svg");

    const unitProviderId = $(this).attr("id").replace("-selectable", "");
    selected.push([unitProviderId, $(this).children("span").text()]);

    if (imageOCRResponse.length > 0) displayHints();
    $scope.find("#newmsg").css({ display: "inline-block" });
    plotMode(selectedForSvg);
  });

  $(".unit-selects-in-popup .ms-elem-selectable").click(function (e) {
    const $scope = $(e.currentTarget).closest(".modal");
    const unitProviderId = $(this).attr("id").replace("-selectable", "");

    const unitProvidersArray = JSON.parse(
      $scope.find("#unit_provider_ids").val()
    );
    unitProvidersArray.push(unitProviderId);

    $scope.find("#unit_provider_ids").val(JSON.stringify(unitProvidersArray));
  });

  $(".unit-selects-in-popup .ms-elem-selection").click(function (e) {
    const $scope = $(e.currentTarget).closest(".modal");
    const unitProvidersArray = JSON.parse(
      $scope.find("#unit_provider_ids").val()
    );

    const unitProviderId = $(this).attr("id").split("-")[0];
    const index = unitProvidersArray.findIndex(unitProviderId);

    unitProvidersArray.splice(index, 1);
    $scope.find("#unit_provider_ids").val(JSON.stringify(unitProvidersArray));
  });

  $(
    ".select-units-on-svg .ms-elem-selection, .select-units-on-page .ms-elem-selection"
  ).click(function (e) {
    const sId = $(this).attr("id").replace("-selection", "");
    removeUnitFromSelectedArray(sId);
  });

  $(".s-unit").on("click", function () {
    const removeIndex = parseInt($(this).attr("data-id"));
    selected.splice(removeIndex, removeIndex + 1);

    const dataProviderUnitId = $(this).attr("data-provider-unit-id");
    const $scope = $(e.currentTarget).closest(".multi-select-units");

    $scope
      .find('.amenities-list option[value="' + dataProviderUnitId + '"]')
      .css({
        display: "block",
      });

    $(this).remove();
    if (selected.length > 0) resetDataIds();
  });

  $("#imageselect li").on("click", function (e) {
    const $this = $(this);
    const { id, name } = $this.data();
    const $scope = $(e.currentTarget).closest(".multi-select-units");
    const index = selected.findIndex(({ id: selectedId }) => selectedId == id);

    if (id) {
      if (!selected.length) {
        selected.push([id, name]);
      } else if (index < 0) {
        selected.push([id, name]);
      }
    }

    $scope.find("#selected-units").empty();
    for (const [selectedId, selectedName] of selected) {
      $scope
        .find("#selected-units")
        .append(
          '<li class="s-unit" data-id=' +
          selectedId +
          ">" +
          selectedName +
          "</li>"
        );
    }

    $scope.find("#newmsg").hide();
    $this.css({ display: "none" });
    $scope.find("#imageselect").toggle();

    plotMode(!!$scope.hasClass("select-units-on-svg"));
    e.stopPropagation();
  });
}

function getButtonHtml(data, buttonStyle, forSvg = false) {
  let href = data.href;

  if (forSvg && data.href) {
    href = addSvgDeletionParamInURL(data.href);
  }

  return (
    '<button class="btn modal-unit-button ml-5 ' +
    buttonStyle +
    '" type="button" data-href="' +
    href +
    '" data-unit-form-url="' +
    data.unitFormUrl +
    '" onclick="setHrefAndFormUrl(this);">' +
    data.title +
    "</button>"
  );
}

function plotMode(selectedForSvg = false) {
  console.log("new marked is created");
  svgMode = selectedForSvg;
  addmode = true;

  const activeSelectors = selectedForSvg
    ? "#svg_map, .select-units-on-svg"
    : "#map, .select-units-on-page";
  const inactiveSelectors = selectedForSvg
    ? "#map, .select-units-on-page"
    : "#svg_map, .select-units-on-svg";

  $(activeSelectors.split(",")[0]).css("cursor", "crosshair");
  $(inactiveSelectors).css("pointer-events", "none");

  $(activeSelectors)
    .off("click")
    .on("click", function () {
      console.log("Click detected on", activeSelectors);

      $(inactiveSelectors).off("click");
    });
  $(inactiveSelectors)
    .off("click")
    .on("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      console.log("Click disabled on", inactiveSelectors);
    });
}

function addMarker(element) {
  const $scope = $(element).closest(".modal");

  const x_plot = $scope.find("#horizontal_position").val();
  const y_plot = $scope.find("#vertical_position").val();

  svgMode = $scope[0].id.startsWith("svg");
  const $addMarkerScope = svgMode
    ? $("#svg-add-marker-modal")
    : $("#add-marker-modal");

  $addMarkerScope
    .find("#add-marker-heading")
    .html("Add marker at x:" + x_plot + " y:" + y_plot);
  $addMarkerScope.find("#add_horizontal_position").val(x_plot);
  $addMarkerScope.find("#add_vertical_position").val(y_plot);

  if (svgMode) {
    $addMarkerScope
      .find("#add_pointer_x_plot")
      .val($scope.find("#pointer_x_plot").val());
    $addMarkerScope
      .find("#add_pointer_y_plot")
      .val($scope.find("#pointer_y_plot").val());
    $addMarkerScope
      .find("#add_pointer_tag")
      .val($scope.find("#pointer_tag").val());
    $addMarkerScope
      .find("#add_pointer_id")
      .val($scope.find("#pointer_id").val());
    $addMarkerScope
      .find("#add_pointer_selector")
      .val($scope.find("#pointer_selector").val());
  }

  $addMarkerScope.modal("show");
}

function removeUnitFromSelectedArray(value) {
  console.log("Selected Units Before: ", selected);
  for (i = 0; i < selected.length; i++) {
    if (selected[i][0] == value) {
      selected.splice(i, 1);
      $(`.suggested-circle-${value}`).remove();
      // selected.splice(i, i + 1);
    }
  }

  if (!selected.length) reset();

  console.log("Selected Units After: ", selected);
}

function resetDataIds() {
  var i = 0;
  $("#selected-units li").each(function () {
    $(this).attr("data-id", i);
    i++;
  });
}

function reset() {
  addmode = false;
  adddoorsmode = false;
  accesspointplot = false;
  selected = [];

  $(".plot-image").css("cursor", "default");

  const inactiveSelectors = svgMode
    ? "#map, .select-units-on-page"
    : "#svg_map, .select-units-on-svg";
  $(inactiveSelectors).css("pointer-events", "auto");

  const $scope = svgMode
    ? $(".select-units-on-svg")
    : $(".select-units-on-page");

  $scope.find("#selected-units").empty();
  $scope.find(".ms-selection .ms-list li").css({ display: "none" });
  $scope.find("#newmsg").css({ display: "none" });
  $scope.find(".amenities-list option").each(function () {
    $(this).css({ display: "block" });
  });
  svgMode = false;
}

function displayHints() {
  console.log(imageOCRResponse);
  if (imageOCRResponse.length > 0) {
    let html = "";

    selected.forEach((selected_units) => {
      $(".fa-circle-thin").remove(".hint-unit-blink");
      imageOCRResponse.forEach((ocr_u) => {
        if (ocr_u.text && ocr_u.text.length > 2) {
          if (textFilter(selected_units[1], ocr_u.text)) {
            console.log(selected_units[1]);
            console.log(ocr_u);
            console.log("Left :   ", ocrImageDimensions.width * ocr_u.left);
            console.log("Top  :   ", ocrImageDimensions.height * ocr_u.top);

            let unit_left = ocrImageDimensions.width * ocr_u.left + 10;
            let unit_top = ocrImageDimensions.height * ocr_u.top;
            let circleTag = `suggested-circle-${selected_units[0]}`;
            console.log("Suggested unit", selected_units);
            html += `<i class="fa fa-circle-thin hint-unit-blink ${circleTag}" style="color: #d37474; left:${unit_left}px; top:${unit_top}px; position:absolute; transform: scale(3);"></i>`;
          }
        }
      });
    });

    $("#map").append(html);
  }
}

function textFilter(selectedUnit, ocrDetectedUnit) {
  u_parts = ocrDetectedUnit.split("-");
  let u_flag = false;
  u_parts.forEach((u_text) => {
    if (selectedUnit && u_text && selectedUnit.includes(u_text)) {
      u_flag = true;
    }
  });

  return u_flag;
}

function submitSettingFormOnChange() {
  set_fields_for_crm();
  $(".settings-form").submit();
  var provider = $("#community_data_provider").val();
  if (
    provider === "zaremba" ||
    provider === "xml" ||
    provider === "spreadsheet"
  ) {
    location.reload();
  }
}

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  //below assinging of draging_image is very important. Don't remove it
  draging_image = ev.target;
  ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
  if (ev.currentTarget.childElementCount == 0) {
    ev.preventDefault();
    if (ev.dataTransfer.getData("text") != "") {
      var data = ev.dataTransfer.getData("text");
      ev.target.appendChild(document.getElementById(data));
      var img_object = $(ev.target).find("img");
      var id = $(img_object).attr("id");
      id = id.split("-");
      $("#row" + id[1]).hide();
      var img = new Image();
      img.src = $(img_object).attr("src");
      ev.target.appendChild(img);
      saveFloorPlanImage($(img_object).attr("src"), ev.target.id, id[1]);
    } else {
      var reader = new FileReader();

      reader.onload = function (e) {
        // var img_object = $(ev.target).find('img');
        var img = new Image();
        img.src = e.target.result;
        ev.target.appendChild(img);
        saveFloorPlanImage(e.target.result, ev.target.id, null);
      };
      reader.readAsDataURL(ev.dataTransfer.files[0]);
    }
  }
}

// preview image function
function readURL(input) {
  if (input.files && input.files[0]) {
    if (
      input.files[0].type == "image/png" ||
      input.files[0].type == "image/jpeg" ||
      input.files[0].type == "image/jpg" ||
      input.files[0].type == "image/svg" ||
      input.files[0].type == "image/svg+xml"
    ) {
      var reader = new FileReader();

      reader.onload = function (e) {
        $("#preview-image").attr("src", e.target.result);
        $("#preview-image").parent().attr("href", e.target.result);
      };

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val("");
      $("#image-upload-warning").modal("show");
      //console.log($(input).val());
    }
  }
}

function readSecondaryURL(input) {
  if (input.files && input.files[0]) {
    if (
      input.files[0].type == "image/png" ||
      input.files[0].type == "image/jpeg" ||
      input.files[0].type == "image/jpg" ||
      input.files[0].type == "image/svg" ||
      input.files[0].type == "image/svg+xml"
    ) {
      var reader = new FileReader();

      reader.onload = function (e) {
        $("#preview-secondary-image").attr("src", e.target.result);
        $("#preview-secondary-image").parent().attr("href", e.target.result);
      };

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val("");
      $("#image-upload-warning").modal("show");
      //console.log($(input).val());
    }
  }
}

function readCommunityGroupLogoURL(input) {
  if (input.files && input.files[0]) {
    if (
      input.files[0].type == "image/png" ||
      input.files[0].type == "image/jpeg" ||
      input.files[0].type == "image/jpg"
    ) {
      var reader = new FileReader();

      reader.onload = function (e) {
        $("#preview-community-group-logo").attr("src", e.target.result);
        $("#preview-community-group-logo")
          .parent()
          .attr("href", e.target.result);
      };

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val("");
      $("#image-upload-warning").modal("show");
      //console.log($(input).val());
    }
  }
}

function readCommunityGroupHomepageImageURL(input) {
  if (input.files && input.files[0]) {
    if (
      input.files[0].type == "image/png" ||
      input.files[0].type == "image/jpeg" ||
      input.files[0].type == "image/jpg"
    ) {
      var reader = new FileReader();

      reader.onload = function (e) {
        $("#preview-community-group-homepage-background-image").attr(
          "src",
          e.target.result
        );
        $("#preview-community-group-homepage-background-image")
          .parent()
          .attr("href", e.target.result);
      };

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val("");
      $("#image-upload-warning").modal("show");
      //console.log($(input).val());
    }
  }
}

// preview image function including svg
function readImageIncludingSVG(input) {
  const isSvgField = input.id.endsWith("svg_image");
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const $scope = $(input).closest(".form-group");
    const fileType = file.type;
    if (
      isSvgField
        ? fileType === "image/svg+xml"
        : ["image/png", "image/jpeg", "image/jpg"].includes(fileType)
    ) {
      const reader = new FileReader();
      const fieldTag = isSvgField ? "#preview-svg" : "#preview-image";

      const $previewElement = $scope.find(fieldTag);

      reader.onload = function (e) {
        $previewElement.attr("src", e.target.result);
        $previewElement.parent().attr("href", e.target.result);
      };

      reader.readAsDataURL(file);
    } else {
      $(input).val("");
      $(isSvgField ? "#svg-upload-warning" : "#image-upload-warning").modal(
        "show"
      );
      //console.log($(input).val());
    }
  }
}

function selectDataProvider(data_provider) {
  switch (data_provider) {
    case "appfolio":
      showAppFolioFields();
      break;
    case "realpagesvc":
      showRealPageSVCFields();
      break;
    case "yardirentcafe":
      showYardiRentCafeFields();
      break;
    case "yardi":
      showYardiFields();
      break;
    case "psi":
      showPsiFields();
      break;
    case "spreadsheet":
      showFileFields();
      break;
    case "resman":
      showResmanFields();
      break;
    case "rentmanager":
      showRentManagerFields();
      break;
    case "zaremba":
      showZarembaFields();
      break;
    case "xml":
      showXmlFields();
      break;
  }
}

function showAppFolioFields() {
  $(".credential_fields").hide();
  $("#app_folio_property_id").show();
  $("#app_folio_unit_key").show();
}

function showPsiFields(){
    $('.credential_fields').hide();
    $('#company_data_settings').show();
    $('#currency_list').show();
    //removeValidationsClass();
    $('#url').hide();
    $('.entrata_url').show();
    //$('#community_credential_attributes_url').addClass("validate[required]");
    //$('#password').show();
    //$('#community_credential_attributes_password').addClass("validate[required]");
    //$('#username').show();
    //$('#community_credential_attributes_username').addClass("validate[required]");
    $('#property_id').show();
    //$('#community_credential_attributes_property_id').addClass("validate[required]");
    $('#data-connection-buttons').show();
    $('#entrata_pricing_button').show();
    $('#entrata_space_configuration_button').show();
    $('#data-replace-update-buttons').hide();
    $('#entrata_available_units_only').show();
    $('#entrata_show_unit_spaces').show();
    $('#entrata_use_space_configuration').show(); 
}

function showZarembaFields() {
  $(".credential_fields").hide();
  $("#company_data_settings").hide();
  $("#currency_list").hide();
  //removeValidationsClass();
  $("#zaremba_username").show();
  //$('#community_credential_attributes_url').addClass("validate[required]");
  $("#zaremba_password").show();
  //$('#community_credential_attributes_password').addClass("validate[required]");
  $("#zaremba_filename").show();
  $("#zaremba_property_id").show();
  $("#zaremba_currency").show();
  //$('#community_credential_attributes_username').addClass("validate[required]");
  //$('#community_credential_attributes_property_id').addClass("validate[required]");
  $("#data-connection-buttons").show();
  $("#data-replace-update-buttons").hide();
}

function showXmlFields() {
  $(".credential_fields").hide();
  $("#company_data_settings").hide();
  $("#currency_list").hide();
  $("#xml_filename").show();
  $("#xml_domain").show();
  $("#xml_currency").show();

  $("#data-replace-update-buttons").hide();
}

function showResmanFields() {
  $(".credential_fields").hide();
  $("#company_data_settings").show();
  $("#currency_list").show();
  //removeValidationsClass();
  // $('#resman_apikey').show();
  // //$('#community_credential_attributes_url').addClass("validate[required]");
  // $('#resman_partner_id').show();
  //$('#community_credential_attributes_password').addClass("validate[required]");
  $("#resman_account_id").show();
  //$('#community_credential_attributes_username').addClass("validate[required]");
  $("#resman_property_id").show();
  $("#resman_api_version").show();
  //$('#community_credential_attributes_property_id').addClass("validate[required]");
  $("#data-connection-buttons").show();
  $("#data-replace-update-buttons").hide();
}

function showRentManagerFields() {
  $(".credential_fields").hide();
  $("#rentmanager_username").show();
  $("#rentmanager_password").show();
  $("#rentmanager_property_id").show();
  $("#rentmanager_base_url").show();
}

function showYardiFields() {
  $(".credential_fields").hide();
  $("#company_data_settings").show();
  $("#currency_list").show();
  //removeValidationsClass();
  $("#url").show();
  //$('#community_credential_attributes_url').addClass("validate[required]");
  $("#username").show();
  //$('#community_credential_attributes_username').addClass("validate[required]");
  $("#password").show();
  //$('#community_credential_attributes_password').addClass("validate[required]");
  $("#server_name").show();
  //$('#community_credential_attributes_server_name').addClass("validate[required]");
  $("#database").show();
  //$('#community_credential_attributes_database').addClass("validate[required]");
  $("#platform").show();
  $("#property_id").show();
  //$('#community_credential_attributes_property_id').addClass("validate[required]");
  $("#interface_entity").show();
  $("#data-connection-buttons").show();
  $("#data-replace-update-buttons").hide();
}

function showYardiRentCafeFields() {
  $(".credential_fields").hide();
  $("#company_data_settings").show();
  $("#currency_list").show();
  //removeValidationsClass();
  //$('#c_code').show();
  let rentCafeVersion = $(
    "#community_credential_attributes_rentcafe_api_version"
  ).val();

  if (rentCafeVersion == "RentCafe V2") {
    showYardiRentCafeVersion2Option();
  } else {
    showYardiRentCafeCodeInputOption($("#yardirentcafe_code_option").val());
  }

  //$('#community_credential_attributes_c_code').addClass("validate[required]");
  $("#p_code").show();
  //$('#community_credential_attributes_p_code').addClass("validate[required]");
  $("#data-connection-buttons").show();
  $("#limit_result_field").show();
  $("#data-replace-update-buttons").hide();
  $("#yardirentcafe_api_options").show();
  $("#yardirentcafe_api_version_options").show();
}

function showRealPageSVCFields() {
  $(".credential_fields").hide();
  $("#company_data_settings").show();
  $("#currency_list").show();
  //removeValidationsClass();
  $("#pmc_id").show();
  //$('#community_credential_attributes_pmc_id').addClass("validate[required]");
  $("#site_id").show();
  //$('#community_credential_attributes_site_id').addClass("validate[required]");
  $("#data-connection-buttons").show();
  $("#data-replace-update-buttons").hide();
  $("#limit_result_field").show();

  $("#realpage_store_pricing_button").show();
  $("#realpage_show_pricing_button").show();
}

function showFileFields() {
  $(".credential_fields").hide();
  $("#company_data_settings").hide();
  $("#currency_list").hide();
  //removeValidationsClass();
  $("#spreadsheet").show();
  $("#spreadsheet_currency").show();
  $("#data-connection-buttons").hide();
  $("#data-replace-update-buttons").show();
  //$('#community_credential_attributes_file').addClass("validate[required]");
}

function showYardiRentCafeCodeInputOption(value) {
  $("#api_token").show();
  $("#c_code").show();
  $("#yardirentcafe_option").show();

  if (value == "Api Token") {
    $("#api_token").show();
    $("#c_code").hide();
  } else {
    $("#api_token").hide();
    $("#c_code").show();
  }
}

function showYardiRentCafeVersion2Option() {
  $("#api_token").show();
  $("#c_code").show();
  $("#yardirentcafe_option").hide();
}

function showCredentialsForm() {
  var community_id = $("#communities_on_settings").val();
  $.ajax({
    url: "/communities/" + community_id + "/credentials",
    type: "GET",
  }).done(function () {
    $(".import_data").attr("href", "/communities/" + community_id + "/import");
  });
}

function readyJsOnAjaxCall() {
  showDataTables();
}

function showDataTables() {
  $("#miyazaki.tour_user_table").DataTable({
    aoColumnDefs: [
      {
        bSortable: false,
        aTargets: [1, 4, 5],
      },
    ],
    ordering: true,
    stateSave: true,
    paging: false,
  });
  $("#miyazaki.floorplan_data_table").DataTable({
    aoColumnDefs: [
      {
        bSortable: false,
        aTargets: [4, 5, 7],
      },
    ],
    ordering: true,
    stateSave: true,
    paging: false,
  });
  $("#miyazaki.logs_data_table").DataTable({
    aoColumnDefs: [
      {
        bSortable: false,
        aTargets: [0, 1, 2, 3, 4, 5],
      },
    ],
    ordering: false,
    stateSave: false,
    paging: false,
  });
  $(".floorplan_name_col").click(function () {
    floorplan_names_order();
  });
  $(".floorplan_sr_col").click(function () {
    $.ajax({
      type: "POST",
      url:
        "/communities/" +
        community_id +
        "/floorplans/save_floorplan_name_order",
      data: { desc: "sorting" },
      success: function (response) { },
    });
  });

  $("#miyazaki_info").detach().prependTo("#miyazaki_wrapper");
  $("#communities.table").DataTable({
    initComplete: function () {
      $("#communities_filter").detach().appendTo("#new-search-area");
    },
    ordering: false,
    stateSave: true,
    info: false, //Dont display info e.g. "Showing 1 to 4 of 4 entries"
    paging: false, //Dont want paging
    language: {
      search: "",
      searchPlaceholder: "Search by community or company name",
    },
  });
  $("#companies.table").DataTable({
    initComplete: function () {
      $("#companies_filter").detach().appendTo("#new-search-area");
    },
    ordering: false,
    stateSave: true,
    info: false, //Dont display info e.g. "Showing 1 to 4 of 4 entries"
    paging: false, //Dont want paging
    language: {
      search: "",
      searchPlaceholder: "Search by company name",
    },
  });
  $("#community_groups.table").DataTable({
    initComplete: function () {
      $("#community_groups_filter").detach().appendTo("#new-search-area");
    },
    ordering: false,
    stateSave: true,
    info: false, //Dont display info e.g. "Showing 1 to 4 of 4 entries"
    paging: false, //Dont want paging
    language: {
      search: "",
      searchPlaceholder: "Search by community group name",
    },
  });
  $("#miyazaki.impressions_logs_data_table").DataTable({
    initComplete: function () {
      $("#impressions_logs_filter").detach().appendTo("#new-search-area");
    },
    ordering: false,
    stateSave: false,
    paging: false, //Dont want paging
    language: {
      search: "",
      searchPlaceholder: "Search by community id",
    },
  });
}

function removeValidationsClass() {
  $("#community_credential_attributes_url").removeClass("validate[required]");
  $("#community_credential_attributes_username").removeClass(
    "validate[required]"
  );
  $("#community_credential_attributes_password").removeClass(
    "validate[required]"
  );
  $("#community_credential_attributes_server_name").removeClass(
    "validate[required]"
  );
  $("#community_credential_attributes_property_id").removeClass(
    "validate[required]"
  );
  $("#community_credential_attributes_site_id").removeClass(
    "validate[required]"
  );
  $("#community_credential_attributes_pmc_id").removeClass(
    "validate[required]"
  );
  $("#community_credential_attributes_c_code").removeClass(
    "validate[required]"
  );
  $("#community_credential_attributes_p_code").removeClass(
    "validate[required]"
  );
}

function readImageSrc(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    index++;
    //var s = "'#row"+index+"'";
    var tr_tag =
      '<tr valign="middle" id="row' +
      index +
      '"><td align="left"><div class="drop-img generated-class" ondrop="dropBack(event)" ondragover="allowDrop(event)" id="parent-' +
      index +
      '"><img src="' +
      e.target.result +
      '" alt="" title=""  draggable="true" ondragstart="drag(event)" id="drag-' +
      index +
      '"> </div></td><td id="img-name-' +
      index +
      '"> ' +
      file.name +
      ' </td><td><a href="javascript::;" class="btn btn-danger btn-sm" onclick="removeDivWithTemporaryImage(' +
      index +
      ')">Remove</a></td></tr>';
    $("#pre-save-floorplan-images-table").append(tr_tag);
    saveTemporaryImage(e.target.result, index, file.name);
  };
  reader.readAsDataURL(file);
}

// function deleteFloorPlanImage(floorplan_id,src,position,name){
//  //var community_id = $('#communities_at_floorplans').val();
//  $.ajax({
//      url: "/communities/"+community_id+"/floorplans/"+floorplan_id,
//      type: "PUT",
//      dataType: "script",
//      data: {
//          floorplan: {
//              remove_image: true
//          }
//      }
//  }).done(function(){
//      console.log("floorplan image is deleted successfully now going to save temporary image");
//      saveTemporaryImage(src,position,name);
//  });
// }

function populate_multiselect() {
  var categories = [];
  $("#multiselect li").each(function () {
    if ($(this).hasClass("active")) {
      categories.push($(this).data("title"));
    }
  });
  var txt = "";
  for (i = 0; i < categories.length; i++) {
    txt += categories[i];
    if (categories.length - i > 1) {
      txt += ",";
    }
  }
  $("#categories_field").val(txt);
  $(".show-categories").text(txt);
  $(".neighborhood-form").submit();
}

function saveTemporaryImage(base64_src, position, name) {
  $.ajax({
    url: "/communities/" + community_id + "/save_temporary_image",
    type: "POST",
    dataType: "script",
    data: {
      image: base64_src,
      position: position,
      name: name,
    },
  });
}

function deleteTemporaryImage(position) {
  $.ajax({
    url: "/communities/" + community_id + "/delete_temporary_image",
    type: "DELETE",
    dataType: "script",
    data: {
      position: position,
    },
  }).done(function () {
    console.log("Temporary Image is deleted successfully.");
  });
}

function removeDivWithTemporaryImage(position) {
  $("#row" + position).remove();
  deleteTemporaryImage(position);
}

function showHideOverlayGrid(element) {
  const $header = $(element).closest(".box-header");
  const $scope =
    $header.attr("id") === "svg_header"
      ? $("#svg_map.plot-image")
      : $("#map.plot-image");
  const $grid = $scope.find(".grid-graph");

  if ($grid.hasClass("hidden")) {
    $grid.removeClass("hidden");
  } else {
    $grid.addClass("hidden");
  }
}

function setHrefAndFormUrl(element) {
  const $element = $(element);
  const $scope = $element.closest(".modal");
  $(".modal-unit-button").each(function () {
    $(this).removeClass("btn-primary");
    $(this).addClass("btn-default");
  });
  $element.removeClass("btn-default");
  $element.addClass("btn-primary");
  $scope.find("#u-name").html($element.html());
  $scope.find(".delete-marker-ok").attr("href", $element.data("href"));
  $scope.find("form").attr("action", $element.data("unit-form-url"));
}

async function fetchSVGAndSetPlotCoordinates(type, assetIdForTracker = 1) {
  await fetchSVG("#svg_map.plot-image", {
    svgPosition: 1,
    activateZoom: true,
    tracker: assetTracker,
    setSVGImageHeight: true,
    activateHoverEffect: true,
    trackerVisibilityCheck: true,
    trackerAssetId: `plot-svg-${assetIdForTracker}`,
  });

  $(".divLoading").addClass("hidden");

  try {
    const result = await assetTracker.watchAssetsLoading({
      checkVisibility: true,
    });

    if (result.ok) {
      console.log(message);
      if (parsedSVGs.length) {
        switch (type) {
          case "unit":
            setSvgCoordinates(mapped_units, {
              cloneClass: type === "cloned-unit",
              additionalClasses: ["marker", "cloned"],
              updateStyles: true,
            });
            break;
          case "amenity":
            setSvgCoordinates(mapped_units, {
              cloneClass: "cloned-amenity",
              additionalClasses: ["marker", "cloned"],
            });
            break;
        }
      }
    } else {
      console.error(result.message);
    }
  } catch (error) {
    console.error(error);
  }

  assetTracker.clearAllAssetsLists();
  assetTracker.turnoffLoader();
}
