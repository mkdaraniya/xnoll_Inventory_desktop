#!/bin/bash

OUTPUT="output.txt"

if [ -f "$OUTPUT" ]; then
    chmod +w "$OUTPUT" 2>/dev/null
fi

echo "EXPORT START" > "$OUTPUT"

FOLDERS=("electron" "shared" "src")

FILES=(
".env.development"
".env.production"
"electron-builder.yaml"
"electron-builder.yml"
"package.json"
"vite.config.mts"
)

append_file() {
    FILE="$1"
    echo -e "\n\n===============================" >> "$OUTPUT"
    echo "FILE: $FILE" >> "$OUTPUT"
    echo "===============================" >> "$OUTPUT"
    cat "$FILE" >> "$OUTPUT" 2>/dev/null || echo "[Cannot read file]" >> "$OUTPUT"
}

# Process folders
for FOLDER in "${FOLDERS[@]}"; do
    if [ -d "$FOLDER" ]; then
        find "$FOLDER" -type f \
            ! -name "*.png" \
            ! -name "*.jpg" \
            ! -name "*.jpeg" \
            ! -name "*.gif" \
            ! -name "*.bmp" \
            ! -name "*.svg" \
            ! -name "*.ico" \
            ! -name "*.webp" \
            ! -name "*.zip" \
            ! -name "*.tar" \
            ! -name "*.gz" \
            ! -name "*.mp4" \
            ! -name "*.mp3" \
            ! -name "*.pdf" \
            ! -name "*.db" \
            ! -name "*.bak" \
            ! -name "*.sqlite" \
            ! -name "*.sqlite3" \
            ! -name "*.db3" \
            ! -name "*.db-wal" \
            ! -name "*.db-shm" | while read FILE; do
                append_file "$FILE"
            done
    fi
done

# Process root files
for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        append_file "$FILE"
    fi
done

echo -e "\nEXPORT COMPLETE → $OUTPUT"
