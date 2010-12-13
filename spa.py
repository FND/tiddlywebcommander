#!/usr/bin/env python

"""
post-process SPA to include non-static components

certain modules are not included via a SCRIPT tags in the HTML file, but loaded
dynamically via JavaScript, making them invisible to Spackager - so they need
to be inserted separately
"""

import sys


SUDO_FILE = "scripts/sudo.js"


def main(args):
	args = [unicode(arg, "utf-8") for arg in args]
	spa_file = args[1]

	sudo = "<script>%s</script>" % _readfile(SUDO_FILE)
	doc = _readfile(spa_file).replace("</body>", "%s</body>" % sudo)

	# TODO: char encoding
	f = open(spa_file, "w")
	f.write(doc)
	f.close()

	return True


def _readfile(filepath):
	# TODO: char encoding
	f = open(filepath)
	contents = f.read()
	f.close()
	return contents


if __name__ == "__main__":
	status = not main(sys.argv)
	sys.exit(status)
