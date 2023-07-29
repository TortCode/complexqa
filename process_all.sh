for k in train test dev; do
    python process_data.py \
        -d -o ./outputs/${k}_mturk.csv \
        ./datasets/${k}.jsonl
done