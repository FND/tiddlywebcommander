(function($) {

var host;

var init = function() {
	host = getHost("/console");
	document.location = document.location.toString().split("#")[0] + "#host:" + host;
	// display host in status bar -- TODO: use onhashchange event to update live
	var statusBar = $("footer p");
	$(".host", statusBar).text(host);
	$.getJSON(host + "/status", function(data, status, xhr) {
		$(".username", statusBar).text(data.username);
	});

	var col = new Column("index", ["recipes", "bags", "users", "info"]); // XXX: i18n
	col.noSort = true;
	col.listType = "ul";
	delete col.label;
	col.controls = null;
	col = col.render().addClass("index").appendTo("nav.pane");
	$("li", col).eq(2).find("a").addClass("disabled").unbind("click"); // XXX: hacky?

	$("nav li a").live("click", function(ev) { // XXX: breaks encapsulation!?
		$(this).blur(). // hack to prevent Firefox from invoking :focus
			not(".disabled").closest("li").
				siblings().children().removeClass("selected").end().end().
				find("a").addClass("selected");
	});

	$("#btnFullscreen").click(function(ev) {
		cmd.toggleFullscreen();
	});
	$("#btnSave").click(function(ev) {
		cmd.saveEntity();
	});
};

var errback = function(xhr, error, exc) {
	var msg = xhr.statusText + ": " + xhr.responseText;
	cmd.notify(msg, "error");
};

var cmd = tiddlyweb.commander = {
	addNavColumn: function(node, type, names, items, noSort) {
		node.nextAll().remove();
		var col = new Column(type, names);
		if(items) {
			col.data = items;
		}
		col.noSort = noSort || false;
		return col.render().addClass(type).appendTo("nav.pane");
	},
	toggleFullscreen: function() {
		var els = $(".pane:visible");
		if(els.length > 2) {
			els.slice(0, -2).slideUp(function() { // XXX: executed multiple times
				els.eq(-2).css("height", "95%"); // XXX: hardcoded size
			});
		} else {
			$(".pane").slideDown(function() { // XXX: fullscreen pane needs special handling to ensure smooth animation
				$(this).removeAttr("style");
			});
		}
	},
	saveEntity: function() {
		var entity = $(".pane article").data("entity");
		var name = entity.name || entity.title; // XXX: hacky (violates encapsulation)
		// XXX: notify is a bad feedback pattern (global, non-localized)
		var callback = function(data, status, xhr) {
			cmd.notify(name + " saved successfully", "info"); // XXX: i18n
		};
		entity.put(callback, errback);
	},
	notify: function(msg, type) {
		type = type || "info";
		var statusBar = $("footer .status").hide();
		$("footer .notification").removeClass().addClass("notification").
			empty().addClass(type).show().text(msg).unbind("click").
			click(function(ev) {
				$(this).removeClass(type).empty().hide();
				statusBar.show();
			});
	}
};

var filterList = function(ev) {
	var el = $(this);
	var filter = el.val().toLowerCase();
	el.closest(".column").find("li").each(function(i, item) {
		var el = $(this);
		if(el.find("a").text().toLowerCase().indexOf(filter) != -1) {
			el.slideDown();
		} else {
			el.slideUp();
		}
	});
};

var columnActions = { // XXX: rename?
	index: function(name, column) { // XXX: rename?
		if(name == "bags" || name == "recipes") {
			var collection = new tiddlyweb.Collection(name, host);
			cmd.addNavColumn(column.node, "pending", ["loading..."]); // XXX: i18n
			var callback = function(data, status, xhr) {
				cmd.addNavColumn(column.node, name, data);
			};
			collection.get(callback, errback);
		} else if(name == "info") {
			$.getJSON(host + "/status", function(data, status, xhr) {
				// TODO: templating
				var list = $("<dl />");
				$("<dt />").text("current user").appendTo(list); // XXX: i18n
				$("<dd />").text(data.username).appendTo(list); // XXX: i18n
				$("<dt />").text("server version").appendTo(list); // XXX: i18n
				$("<dd />").text(data.version).appendTo(list); // XXX: i18n
				$(".pane article").empty().append(list); // XXX: selector too unspecific?!
			});
		}
	},
	recipes: function(name, column) {
		var recipe = new tiddlyweb.Recipe(name, host);

		var eCallback = function(recipe, status, xhr) {
			recipe.render().replaceAll(".pane article"); // XXX: selector too unspecific?!
		};
		recipe.get(eCallback, errback);

		cmd.addNavColumn(column.node, "pending", ["loading..."]); // XXX: i18n
		var cCallback = function(data, status, xhr) {
			var titles = $.map(data, function(item, i) {
				return item.title;
			});
			cmd.addNavColumn(column.node, "tiddlers", titles, data);
		};
		recipe.tiddlers().get(cCallback, errback);
	},
	bags: function(name, column) { // TODO: DRY (cf. recipes)
		var bag = new tiddlyweb.Bag(name, host);

		var eCallback = function(bag, status, xhr) {
			bag.render().replaceAll(".pane article"); // XXX: selector too unspecific?!
		};
		var eErrback = function(xhr, error, exc) {
			if(xhr.status == 401) {
				bag.desc = "unauthorized"; // XXX: i18n -- XXX: hacky?
				delete bag.policy;
				bag.render().replaceAll(".pane article").addClass("error"); // XXX: selector too unspecific?!
			} else {
				errback.apply(this, arguments);
			}
		};
		bag.get(eCallback, eErrback);

		cmd.addNavColumn(column.node, "pending", ["loading..."]); // XXX: i18n
		var cCallback = function(data, status, xhr) {
			var titles = $.map(data, function(item, i) {
				return item.title;
			});
			cmd.addNavColumn(column.node, "tiddlers", titles, data);
		};
		bag.tiddlers().get(cCallback, errback);
	},
	tiddlers: function(name, column) {
		var tid;
		$.each(column.data, function(i, item) { // XXX: inefficient
			tid = item;
			return tid.title != name;
		});

		var eCallback = function(tid, status, xhr) {
			tid.render().replaceAll(".pane article"); // XXX: selector too unspecific?!
		};
		tid.get(eCallback, errback);

		cmd.addNavColumn(column.node, "pending", ["loading..."]); // XXX: i18n
		var cCallback = function(data, status, xhr) {
			var names = $.map(data, function(item, i) {
				return item.revision;
			});
			cmd.addNavColumn(column.node, "revisions", names, data, true);
		};
		tid.revisions().get(cCallback, errback);
	},
	revisions: function(name, column) { // TODO: DRY (cf. tiddlers)
		var tid;
		$.each(column.data, function(i, item) { // XXX: inefficient
			tid = item;
			return tid.revision != name;
		});
		var rev = new tiddlyweb.Revision(tid.revision, tid);
		var callback = function(tid, status, xhr) {
			tid.render().replaceAll(".pane article"); // XXX: selector too unspecific?!
		};
		rev.get(callback, errback);
	}
};

var Column = function(type, items) {
	this.type = type;
	this.label = tiddlyweb._capitalize(type); // XXX: hacky?
	this.listType = "ol";
	this.items = items;
	var self = this;
	this.onClick = function(ev) {
		var name = $(this).text(); // XXX: brittle (e.g. i18n)
		columnActions[type].apply(this, [name, self]);
	};
};
Column.prototype.controls = $('<input type="search" placeholder="filter" />'). // XXX: i18n
	change(filterList).keyup(function(ev) {
		var filter = $(this).val();
		if(filter.length > 2) {
			clearTimeout(this.timeout || null);
			var self = this;
			this.timeout = setTimeout(function() {
				filterList.apply(self, []);
			}, 500);
		}
	});
Column.prototype.render = function() {
	var heading = this.label ? $("<h3 />").text(this.label) : null;
	var controls = this.controls ? this.controls.clone(true) : null;
	this.node = $('<section class="column" />').append(heading).append(controls);
	var items = this.noSort ? this.items : this.items.sort(function(a, b) { // XXX: inefficient!?
		var x = a.toLowerCase ? a.toLowerCase() : a;
		var y = b.toLowerCase ? b.toLowerCase() : b;
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
	var self = this;
	$("<" + this.listType + " />").
		append($.map(this.items, function(item, i) {
			var btn = $('<a href="javascript:;" />').text(item).
				click(self.onClick);
			return $("<li />").append(btn)[0];
		})).
		appendTo(this.node);
	return this.node;
};

var getHost = function(cue) {
	var loc = document.location;
	var host = loc.hash.split("host:")[1];
	if(host) {
		return host.replace(/\/$/, "");
	} else if(loc.protocol == "file:") {
		return "./";
	}
	var uri = loc.protocol + "//" + loc.hostname;
	if(loc.port && $.inArray(loc.port, ["80", "443"]) == -1) {
		uri += ":" + loc.port;
	}
	var path = loc.pathname.indexOf(cue) != -1 ? loc.pathname.split(cue)[0] : "/";
	return uri + path;
};

// XXX: DEBUG
$.ajax = function(options, isCallback) {
	if(!isCallback) {
		return setTimeout(function() {
			$.ajax(options, true);
		}, 500);
	}

	if(options.type != "GET") {
		console.log("AJAX", options);
	}

	var xhr = {
		getResponseHeader: function() {}
	};
	var data;

	cmd.notify("URI: " + options.url);

	var path = $.map(options.url.split("/"), function(item, i) {
		return decodeURIComponent(item);
	});
	var resource = path.pop();
	var bag, recipe;
	switch(resource) {
		case "recipes":
			data = ["Omega"];
			break;
		case "bags":
			data = ["Alpha", "Bravo", "Charlie", "Delta"];
			break;
		case "tiddlers":
			bag = path[1] == "bags" ? path[2] : "Foxtrot";
			recipe = path[1] == "recipes" ? path[2] : undefined;
			data = $.map(["Foo", "Bar", "Baz"], function(item, i) {
				item = {
					title: bag + "::" + item,
					bag: bag
				};
				if(recipe) {
					item.recipe = recipe;
				}
				return item;
			});
			break;
		case "revisions":
			var container = {
				type: path[1] == "bags" ? "bag" : "recipe",
				name: path[2]
			};
			var revs = Math.random().toString().substr(2).split("");
			data = $.map(revs, function(item, i) {
				var rand = Math.random();
				item = {
					title: path[path.length - 1],
					revision: Math.floor(rand * 1000 * item + 1)
				};
				item[container.type] = container.name;
				return item;
			});
			break;
		case "status":
			data = {
				username: "DEV",
				challengers: ["N/A"],
				version: "mock"
			};
			break;
		default:
			var type = path.pop();
			switch(type) {
				case "recipes":
					data = {
						desc: "lorem ipsum dolor sit amet",
						policy: {
							"read": [],
							"manage": ["R:ADMIN"],
							"owner": "administrator"
						},
						recipe: [
							["Alpha", ""],
							["Charlie", "select=tag:foo"],
							["Bravo", ""]
						]
					};
					break;
				case "bags":
					data = {
						desc: "lorem ipsum dolor sit amet",
						policy: {
							"read": [],
							"write": ["fnd", "cdent", "psd"],
							"create": ["ANY"],
							"delete": ["NONE"],
							"manage": ["R:ADMIN"],
							"accept": ["R:ADMIN"],
							"owner": "administrator"
						}
					};
					if(resource == "Bravo") {
						data = null;
						xhr.status = 401;
					}
					break;
				case "tiddlers":
					bag = path[1] == "bags" ? path[2] : "Foxtrot";
					recipe = path[1] == "recipes" ? path[2] : undefined;
					data = {
						title: resource,
						text: "lorem ipsum\ndolor sit amet\n\nconsectetur adipisicing elit\nsed do eiusmod tempor",
						bag: bag,
						created: "20100930160300",
						modified: "20100930160530"
					};
					if(recipe) {
						data.recipe = recipe;
					}
					break;
				case "revisions":
					data = {
						title: path.pop(),
						text: "lorem ipsum\ndolor sit amet",
						created: "20100929110300",
						modified: "20100929110400"
					};
					break;
			}
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
