all:
	ct src/extension.ct
build:
	make
	npm run compile # this doesn't catch every error, or?
publish:
	vsce login tnustrings
	vsce publish
