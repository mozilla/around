build: update_locale_json
	- rm -rf www-built
	mkdir -p www/css
	stylus www/stylus/app.styl --out www/css
	stylus www/stylus/app.styl --out www/css
	node ./node_modules/requirejs/bin/r.js -o build-css.js
	node node_modules/requirejs/bin/r.js -o build-js.js
	mkdir -p www-built/js/vendor/
	cp www/js/vendor/brick.js www-built/js/vendor/brick.js
	cp www/js/vendor/mapbox.js www-built/js/vendor/mapbox.js
	cp www/js/vendor/require.js www-built/js/vendor/require.js
	cp README.md www-built/README.md
	cp www/CNAME www-built/CNAME
	cp -R www/fonts www-built/fonts
	cp -R www/img www-built/img
	cp -R www/locale www-built/locale
	cp -R www/*.* www-built/
	mv www-built/css/app.built.css www-built/css/app.css
	mv www-built/js/main.built.js www-built/js/main.js
	rm www-built/fonts/firasans/stylesheet.css
	cat www-built/manifest.appcache | sed -e "s/TIMESTAMP/`date +%s`/" > www-built/manifest.appcache
	cat www-built/index.html | sed -e "s/<html/<html manifest=\"manifest\.appcache\"/" > www-built/index.html

deploy: build
	volo ghdeploy
	git reset HEAD

update_locale:
	./locales/extract.sh
	./locales/merge.sh locales

update_locale_json: update_locale
	node ./locales/compile.js
