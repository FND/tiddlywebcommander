(function($) {

var host = "/"; // TODO: calculate

var init = function() {
	var col = new Column("index", []);
	col.items = ["recipes", "bags", "users"]; // no sorting -- XXX: hacky?
	col.listType = "ul";
	delete col.label;
	col.controls = null;
	col = col.render().appendTo("nav.pane");
	$("li:last a", col).addClass("disabled").unbind("click"); // XXX: hacky?

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
		$("#notification").addClass(type).text(msg).slideDown("slow").
			click(function(ev) { $(this).slideUp(); });
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
		var collection = new tiddlyweb.Collection(name, host);
		var callback = function(data, status, xhr) {
			cmd.addNavColumn(column.node, name, data);
		};
		collection.get(callback, errback);
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
	var lbl = $("<h3 />").text(this.name);
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
	var lbl = $("<h3 />").text(this.name);
	var desc = $("<p />").text(this.desc);
	var policy = this.policy ? this.policy.render() : null;
	return $("<article />").append(lbl).append(desc).append(policy);
};

tiddlyweb.Tiddler.prototype.render = function() {
	var lbl = $("<h3 />").text(this.title);
	var txt = $("<pre />").text(this.text);
	return $("<article />").data("tiddler", this).append(lbl).append(txt);
};

tiddlyweb.Policy.prototype.render = function() {
	var self = this;
	// TODO: templating
	var table = $('<table class="policy"><thead><tr><th /></tr></thead></table>');
	$("<caption />").text("owner: " + this.owner).prependTo(table); // XXX: inelegant -- XXX: i18n
	var row = table.find("tr");
	var magic = ["anonymous", "ANY", "NONE"]; // XXX: rename -- XXX: i18n
	var users = [];
	var roles = [];
	$.each(this.constraints, function(i, constraint) {
		if(constraint != "owner" && self[constraint]) {
			$("<th />").text(constraint).appendTo(row); // XXX: i18n
			$.each(self[constraint], function(i, item) {
				if(item.indexOf("R:") == 0) {
					if($.inArray(item, roles) == -1) {
						roles.push(item);
					}
				} else if($.inArray(item, magic.concat(users)) == -1) {
					users.push(item);
				}
			});
		}
	});

	var entries = magic.concat(users).concat(roles);
	$.each(entries, function(i, user) {
		var row = $("<tr />").appendTo(table);
		$("<td />").text(user).appendTo(row);
		$.each(self.constraints, function(i, constraint) {
			if(constraint != "owner" && self[constraint]) {
				var cell = $('<td><input type="checkbox" /></td>').appendTo(row);
				if(self[constraint].length == 0) {
					var column = $.inArray(constraint, self.constraints) + 1;
					cell = cell.closest("table").find("tr:eq(1) td").eq(column);
					cell.find("input").attr("checked", "checked");
				} else if($.inArray(user, self[constraint]) != -1) {
					cell.find("input").attr("checked", "checked");
				}
			}
		});
	});

	var addRow = function(ev, cell) { // XXX: use as both event handler and regular function hacky?
		var el = cell || $(this);
		if(cell || el.val().length > 0) {
			var field = $('<input type="text" placeholder="new user/role" />'). // XXX: i18n
				change(addRow).hide();
			var table = el.closest("table");
			el.closest("tr").clone().
				find("td:first").empty().append(field).end().
				find("input[type=checkbox]").removeAttr("checked").end().
				appendTo(table);
			field.fadeIn(); // slideDown preferable, but problematic for TRs
		}
	};
	addRow(null, $("tr:last td:first", table));

	return table;
};
tiddlyweb.Policy.prototype.deserialize = function(el) { // XXX: rename (inconsitent with "render")?
	// XXX: cannot detect empty constraint lists
	var self = this;
	$.each(this.constraints, function(i, constraint) {
		if(constraint != "owner") {
			self[constraint] = [];
		}
	});
	var columns = $("thead th", el).map(function(i, node) {
		return $(node).text() || null; // XXX: brittle (i18n)
	}).get();
	$("tr", el).slice(1).each(function(i, node) {
		var cells = $("td", node);
		var entry = cells.eq(0);
		var field = entry.find("input");
		entry = field.length ? field.val() : entry.text();
		if(entry.length > 0) {
			cells.slice(1).each(function(i, node) {
				var checked = $(node).find("input").attr("checked");
				if(checked) {
					var constraint = columns[i];
					self[constraint].push(entry);
				}
			});
		}
	});
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
	switch(resource) {
		case "recipes":
			data = ["Omega"];
			break;
		case "bags":
			data = ["Alpha", "Bravo", "Charlie", "Delta"];
			break;
		case "tiddlers":
			var bag = path[1] == "bags" ? path[2] : "Foxtrot";
			var recipe = path[1] == "recipes" ? path[2] : undefined;
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
					data = {
						title: resource,
						text: "lorem ipsum\ndolor sit amet\n\nconsectetur adipisicing elit\nsed do eiusmod tempor"
					};
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
