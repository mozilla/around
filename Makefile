# build: update_locale_json
build:
	- rm -rf www-built
	- rm -rf www/css
	mkdir -p www/css
	sass www/scss/app.scss www/css/app.css
	node ./node_modules/requirejs/bin/r.js -o build-css.js
	node node_modules/requirejs/bin/r.js -o build-js.js
	mkdir -p www-built/js/vendor/
	cp www/js/vendor/require.js www-built/js/vendor/require.js
	cp README.md www-built/README.md
	cp www/CNAME www-built/CNAME
	cp -R www/img www-built/img
	cp -R www/locale www-built/locale
	cp -R www/*.* www-built/
	mv www-built/css/app.built.css www-built/css/app.css
	mv www-built/js/main.built.js www-built/js/main.js

deploy: build
	volo ghdeploy
	git reset HEAD

update_locale:
	./locales/extract.sh
	./locales/merge.sh locales

update_locale_json: update_locale
	node ./locales/compile.js
