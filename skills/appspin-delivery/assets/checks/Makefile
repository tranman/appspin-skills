# The task runner's commands, each calling the delivery skill's script; for npm
# scripts, the same commands. A Software Package drops e2e.
D := .agents/skills/appspin-delivery/scripts

verify:
	@bash $(D)/verify.sh

# Checks ORIGIN, which promote and the staging workflow set: a Software Package's commit or
# ref, the current branch by default; an App sets its staging address here instead.
ORIGIN ?= $(shell git branch --show-current)
smoke:
	@bash $(D)/smoke.sh $(ORIGIN)

# An App's end-to-end tests, against ORIGIN; the project's own command where it has one.
e2e:
	@npx playwright test -c e2e/playwright.config.ts

promote:
	@node $(D)/promote.mjs $(ARGS)

# Turns the push hook on first, so nothing before it can stop that.
setup:
	@git config core.hooksPath .githooks && echo "hooks enabled (.githooks)"

.PHONY: verify smoke e2e promote setup
