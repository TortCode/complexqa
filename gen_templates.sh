mkdir -p output_uis/
for k in train test dev; do
    python fill_html_template.py \
        --question strategy_questions/sample_data.json \
        --output output_uis/ \
        processed_data/${k}_mturk.csv \
        template/build/complexqa.html
done