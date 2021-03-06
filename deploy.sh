#!/usr/bin/env bash

# deploy to TiddlySpace
#
# Usage:
#  ./deploy.sh <username> [space [password [host]]]

set -x
set -e

username=${1:?}
space=${2:-$username}
password=$3
host=${4:-http://tiddlyspace.com}

if [ -z $password ]; then
	read -s -p "Enter password: " password
fi

recipe="${space}_public"
options="-X PUT -u $username:$password"

title=tiddlywebcommander
type=html
# mangle URIs, removing local directory names
cat index.html | \
	sed -e 's#="\(scripts\|styles\)/#="#' | \
	curl $options -H "Content-Type: text/$type" --data-binary @- \
	"$host/recipes/$recipe/tiddlers/$title"

for directory in styles scripts; do
	cd $directory
	if [ $directory = "styles" ]; then
		type=css
	else
		type=javascript
	fi
	for filename in *; do
		curl $options -H "Content-Type: text/$type" --data-binary @$filename \
			"$host/recipes/$recipe/tiddlers/$filename"
	done
	cd -
done
