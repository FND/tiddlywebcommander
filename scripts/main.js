(function($) {

var host = "/"; // TODO: calculate

var cmd = tiddlyweb.commander = {
	addNavColumn: function(items) { // XXX: should be Column class with render method
		this.resetNavColumns(1);
		var el = $("<ol />");
		// TODO: sort
		$.each(items, function(i, item) {
			$("<li />").text(item).appendTo(el);
		});
		el.appendTo("nav");
	},
	resetNavColumns: function(level, callback) {
		$("nav ul, nav ol").slice(level).remove();
	},
	toggleFullscreen: function() { // TODO: argument to avoid hard-coding the last pane
		var els = $(".pane:visible");
		if(els.length > 1) {
			els.slice(0, -1).slideUp(function() {
				els.eq(-1).css("height", "100%"); // XXX: executed multiple times
			});
		} else {
			$(".pane").slideDown(function() { // XXX: fullscreen pane needs special handling to ensure smooth animation
				$(this).removeAttr("style");
			});
		}
	},
	notify: function(msg, type) {
		var el = $("#notification").text(msg).slideDown("slow").
			click(function(ev) { $(this).slideUp(); });
		if(type) {
			el.addClass(type);
		}
	}
};

$("li").live("click", function(ev) {
	$(this).not(".disabled").
		siblings().removeClass("selected").end().
		addClass("selected");
});

$("ul:first li").click(function(ev) {
	var type = $(this).text(); // XXX: brittle (e.g. i18n)
	var collection = new tiddlyweb.Collection(type, host);
	var callback = function(data, status, xhr) {
		cmd.addNavColumn(data);
	};
	var errback = function(xhr, error, exc) {
		var msg = xhr.statusText + ": " + xhr.responseText;
		cmd.notify(msg, "error");
	};
	collection.get(callback, errback);
});

$("#btnFullscreen").click(function(ev) {
	cmd.toggleFullscreen();
});

// XXX: DEBUG
$.ajax = function(options) {
	var xhr = {};
	var data;

	var resource = options.url.split("/").pop();
	switch(resource) {
		case "bags":
			data = ["Alpha", "Bravo", "Charlie", "Delta"];
			break;
		case "recipes":
			data = ["Omega"];
			break;
		default:
			break;
	}
	if(data) {
		xhr.status = 200;
		options.success(data, "success", xhr);
	} else {
		xhr.statusText = "error";
		xhr.responseText = resource + " failed";
		options.error(xhr, "error", {});
	}
};
// XXX: /DEBUG

})(jQuery);
