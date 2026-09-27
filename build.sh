#!/bin/sh
# Rebuild docs/data.json and docs/schools.json from pdfs/{Haryana,MP,UP}.pdf
set -e
cd "$(dirname "$0")/pipeline"
python3 extract_items.py
python3 extract_summary.py
python3 validate.py
python3 extract_spill.py
python3 extract_schools.py
python3 build_data.py
