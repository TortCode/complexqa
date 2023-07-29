for k in train test dev; do
    python fill_html_template.py \
        outputs/${k}_mturk.csv \
        complexqa.html
done