SHELL := /bin/sh

.PHONY: compile-cuda api-check api-test ui-install ui-build

compile-cuda:
	cmake -S compute_kernel -B build/compute_kernel
	cmake --build build/compute_kernel

api-check:
	python -m compileall simulation_api

api-test:
	cd simulation_api && python -m unittest discover -s tests -p "test_*.py"

ui-install:
	cd cfd_visualizer && npm install

ui-build:
	cd cfd_visualizer && npm run build
