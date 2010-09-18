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

	var col = new Column("index", []);
	col.items = ["recipes", "bags", "users", "info"]; // no sorting -- XXX: i18n -- XXX: info unnecessary!?
	col.listType = "ul";
	delete col.label;
	col.controls = null;
	col = col.render().appendTo("nav.pane");
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
};

var cmd = tiddlyweb.commander = {
	addNavColumn: function(list, type, names, items) {
		list.nextAll().remove();
		var col = new Column(type, names);
		if(items) {
			col.data = items;
		}
		col.render().appendTo("nav.pane");
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

var errback = function(xhr, error, exc) {
	var msg = xhr.statusText + ": " + xhr.responseText;
	cmd.notify(msg, "error");
};

var columnActions = { // XXX: rename?
	index: function(name, column) { // XXX: rename?
		if(name == "bags" || name == "recipes") {
			var collection = new tiddlyweb.Collection(name, host);
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
				bag.render().replaceAll(".pane article").addClass("error"); // XXX: selector too unspecific?!
			} else {
				errback.apply(this, arguments);
			}
		};
		bag.get(eCallback, eErrback);

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

		var cCallback = function(data, status, xhr) {
			var names = $.map(data, function(item, i) {
				return item.revision;
			});
			cmd.addNavColumn(column.node, "revisions", names, data);
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
	this.items = items.sort(function(a, b) { // XXX: inefficient!?
		var x = a.toLowerCase ? a.toLowerCase() : a;
		var y = b.toLowerCase ? b.toLowerCase() : b;
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
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

tiddlyweb.Recipe.prototype.render = function() {
	var lbl = $("<h3 />");
	$("<a />").attr("href", this.route()).text(this.name).appendTo(lbl);
	var desc = $("<p />").text(this.desc);
	var policy = this.policy.render();
	var content = $.map(this.recipe, function(item, i) {
		return item[1] ? item[0] + "?" + item[1] : item[0];
	}).join("\n");
	content = $("<pre />").text(content);
	return $("<article />").append(lbl).append(desc).append(policy).
		append(content);
};

tiddlyweb.Bag.prototype.render = function() {
	var lbl = $("<h3 />");
	$("<a />").attr("href", this.route()).text(this.name).appendTo(lbl);
	var desc = $("<p />").text(this.desc);
	var policy = this.policy ? this.policy.render() : null;
	return $("<article />").append(lbl).append(desc).append(policy);
};

tiddlyweb.Tiddler.prototype.render = function() {
	var lbl = $("<h3 />");
	$("<a />").attr("href", this.route()).text(this.title).appendTo(lbl);
	var txt = $("<pre />").text(this.text);
	return $("<article />").data("tiddler", this).append(lbl).append(txt);
};

tiddlyweb.Policy.prototype.render = function() {
	var self = this;
	var specialValues = tiddlyweb.Policy.specialValues;
	// TODO: templating
	var table = $('<table class="policy"><thead><tr><th /></tr></thead></table>').
		data("policy", this);
	$("<caption />").text("owner: " + this.owner).prependTo(table); // XXX: inelegant -- XXX: i18n
	var row = table.find("tr:first");
	var users = [];
	var roles = [];
	$.each(this.constraints, function(i, constraint) {
		if(constraint != "owner" && self[constraint]) {
			$("<th />").text(constraint).appendTo(row); // XXX: i18n
			$.each(self[constraint], function(i, item) {
				if(item.indexOf("R:") == 0) {
					pushUnique(item, roles);
				} else if($.inArray(item, specialValues) == -1) {
					pushUnique(item, users);
				}
			});
		}
	});

	var tbody = $("<tbody />").appendTo(table);
	var entries = specialValues.concat(users).concat(roles);
	$.each(entries, function(i, user) {
		var row = $("<tr />").appendTo(tbody);
		if($.inArray(user, specialValues) != -1) {
			row.addClass("special"); // XXX: rename
		}
		$("<td />").text(user).appendTo(row);
		$.each(self.constraints, function(i, constraint) {
			if(constraint != "owner" && self[constraint]) {
				var cell = $('<td><input type="checkbox" /></td>').appendTo(row);
				if(self[constraint].length == 0) {
					var column = $.inArray(constraint, self.constraints) + 1;
					cell = cell.closest("table").find("tbody tr:first td").eq(column);
					cell.find("input").attr("checked", "checked");
				} else if($.inArray(user, self[constraint]) != -1) {
					cell.find("input").attr("checked", "checked");
				}
			}
		});
	});

	$("input[type=checkbox]", tbody[0]).live("change", tiddlyweb.Policy.onChange);

	var addRow = function(ev, cell) { // XXX: use as both event handler and regular function hacky?
		var el = cell || $(this);
		if(cell || el.val().length > 0) {
			var field = $('<input type="text" placeholder="new user/role" />'). // XXX: i18n
				change(addRow).hide();
			var tbody = el.closest("tbody");
			el.closest("tr").clone().
				find("td:first").empty().append(field).end().
				find("input[type=checkbox]").removeAttr("checked").end().
				appendTo(tbody);
			field.fadeIn(); // slideDown preferable, but problematic for TRs
		}
	};
	addRow(null, $("tr:last td:first", tbody));

	return table;
};
tiddlyweb.Policy.specialValues = ["anonymous", "ANY", "NONE"]; // XXX: rename -- XXX: i18n
tiddlyweb.Policy.onChange = function(ev) {
	var el = $(this);
	var cell = el.closest("td");
	var tbody = cell.closest("tbody");
	var table = tbody.closest("table");
	var policy = table.data("policy");

	var entry = cell.closest("tr").find("td:first");
	var field = entry.find("input");
	entry = field.length ? field.val() : entry.text();

	var colIndex = cell.prevAll().length;
	var constraint = table.find("thead th").eq(colIndex).text(); // XXX: brittle (i18n)
	var entries = policy[constraint];

	var checked = $(el).attr("checked");
	if($.inArray(entry, tiddlyweb.Policy.specialValues) == -1) {
		if(!checked) {
			removeItem(item, entries || []);
		} else {
			if(entries && entries.length) {
				pushUnique(entry, policy[constraint]);
			} else {
				policy[constraint] = [entry];
			}
		}
		// reset special values
		$.each(tiddlyweb.Policy.specialValues, function(i, item) {
			removeItem(item, entries || []);
		});
		$("tr.special", tbody).
			find("td:nth-child(" + (colIndex + 1) + ") input[type=checkbox]").
			removeAttr("checked"); // XXX: redraw entire table instead?
	} else {
		policy[constraint] = entry == "anonymous" ? [] : [entry];
		// reset all entries -- XXX: DRY (see above)
		cell.closest("tr").siblings().
			find("td:nth-child(" + (colIndex + 1) + ") input[type=checkbox]").
			removeAttr("checked");
	}
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

var pushUnique = function(val, arr) {
	if($.inArray(val, arr) == -1) {
		arr.push(val);
	}
};

var removeItem = function(val, arr) {
	var pos = $.inArray(val, arr);
	if(pos != -1) {
		arr.splice(pos, 1);
	}
};

// XXX: DEBUG
$.ajax = function(options, isCallback) {
	if(!isCallback) {
		return setTimeout(function() {
			$.ajax(options, true);
		}, 500);
	}

	var xhr = {};
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
				username: "GUEST",
				challengers: ["cookie_form"],
				version: "1.2.1"
			};
			break;
		default:
			var type = path.pop();
			switch(type) {
				case "recipes":
					data = {
						desc: "lorem ipsum dolor sit amet",
						policy: new tiddlyweb.Policy({
							"read": [],
							"manage": ["R:ADMIN"],
							"owner": "administrator"
						}),
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
						policy: new tiddlyweb.Policy({
							"read": [],
							"write": ["fnd", "cdent", "psd"],
							"create": ["ANY"],
							"delete": ["NONE"],
							"manage": ["R:ADMIN"],
							"accept": ["R:ADMIN"],
							"owner": "administrator"
						})
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
						bag: bag
					};
					if(recipe) {
						data.recipe = recipe;
					}
					break;
				case "revisions":
					data = {
						title: path.pop(),
						text: "lorem ipsum\ndolor sit amet"
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
