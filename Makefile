.PHONY: lib deploy spa purge

jquery_version = 1.4

lib:
	curl -o "scripts/jquery.js" \
		"http://ajax.googleapis.com/ajax/libs/jquery/$(jquery_version)/jquery.min.js"
	curl -o "scripts/jquery-json.js" \
		"http://jquery-json.googlecode.com/files/jquery.json-2.2.min.js"
	curl -o "scripts/chrjs.js" \
		"https://github.com/tiddlyweb/chrjs/raw/master/main.js"
	curl -o "scripts/chrjs.ui.js" \
		"https://github.com/tiddlyweb/chrjs/raw/master/ui.js"
	curl -o "styles/widgets.css" \
		"https://github.com/tiddlyweb/chrjs/raw/master/ui.css"

deploy:
	rm index.spa.html || true
	make spa
	scp index.spa.html fnd.lewcid.org:fnd.lewcid.org/misc/tiddlywebcommander.html
	./deploy.sh fnd commander

spa: lib
	spac --no-legacy index.html

purge:
	cat .gitignore | while read -r entry; do rm -r $$entry; done || true
