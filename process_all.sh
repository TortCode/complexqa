for k in train test dev; do
    python process_data.py \
        -d \
        --kairos ./event_role_formatted.json \
        --output ./processed_data/${k}_mturk.csv \
        ./datasets/${k}.jsonl
done