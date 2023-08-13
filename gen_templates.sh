for k in train test dev; do
    python fill_html_template.py \
        --output output_uis/ \
        processed_data/${k}_mturk.csv \
        template/build/complexqa.html
done