for k in train test dev; do
    python parse_multitrigger.py \
        -d -o ./outputs/${k}_mturk.csv \
        ./datasets/${k}.jsonl
done