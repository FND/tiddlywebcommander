(function($) {

var host = "/"; // TODO: calculate

var init = function() {
	var col = new Column(null, ["recipes", "bags", "users"], function(ev) {
		var type = $(this).text(); // XXX: brittle (e.g. i18n)
		var collection = new tiddlyweb.Collection(type, host);
		var action = function(ev) {
			var name = $(this).text(); // XXX: brittle (e.g. i18n)
			cmd.notify(name, "info"); // XXX: DEBUG
		};
		var callback = function(data, status, xhr) {
			cmd.addNavColumn(1, data, action);
		};
		var errback = function(xhr, error, exc) {
			var msg = xhr.statusText + ": " + xhr.responseText;
			cmd.notify(msg, "error");
		};
		collection.get(callback, errback);
	});
	col.listType = "ul";
	col = col.render();
	$("li:last", col).addClass("disabled"); // XXX: hacky?

	$("li").live("click", function(ev) { // XXX: breaks encapsulation!?
		$(this).not(".disabled").
			siblings().removeClass("selected").end().
			addClass("selected");
	});

	$("#btnFullscreen").click(function(ev) {
		cmd.toggleFullscreen();
	});
};

var cmd = tiddlyweb.commander = {
	addNavColumn: function(level, items, action) {
		this.resetNavColumns(level);
		var col = new Column(null, items, action);
		col.render();
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

var Column = function(type, items, onClick) {
	this.type = type; // XXX: unused?
	this.items = items; // TODO: sort
	this.onClick = onClick; // XXX: rename?
	this.listType = "ol";
	this.container = $("nav"); // XXX: too vague?!
};
Column.prototype.render = function() {
	var self = this;
	return $("<" + this.listType + " />").
		append($.map(this.items, function(item, i) {
			return $("<li />").text(item).click(self.onClick)[0];
		})).
		appendTo(this.container);
};

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

init();

})(jQuery);
