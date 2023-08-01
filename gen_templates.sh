for k in train test dev; do
    python fill_html_template.py \
        --output output_templates/ \
        processed_data/${k}_mturk.csv \
        complexqa.html
done