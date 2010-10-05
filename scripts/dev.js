(function($) {

// mock out HTTP requests
jQuery.ajax = function(options, isCallback) {
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

	tiddlyweb.commander.notify("URI: " + options.url);

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

})(jQuery);
