.PHONY: lib spa purge

jquery_version = 1.4.2

lib:
	curl -o "scripts/jquery.js" \
		"http://ajax.googleapis.com/ajax/libs/jquery/$(jquery_version)/jquery.min.js"
	curl -o "scripts/jquery-json.js" \
		"http://jquery-json.googlecode.com/files/jquery.json-2.2.min.js"
	curl -o "scripts/chrjs.js" \
		"http://github.com/tiddlyweb/chrjs/raw/master/main.js"
	curl -o "scripts/chrjs.ui.js" \
		"http://github.com/tiddlyweb/chrjs/raw/master/ui.js"
	curl -o "styles/widgets.css" \
		"http://github.com/tiddlyweb/chrjs/raw/master/ui.css"

spa: lib
	spac index.html

purge:
	cat .gitignore | while read -r entry; do rm -r $$entry; done || true
